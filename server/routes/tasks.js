import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { createStore } from '../store/base.js'

const router = Router()
const tasks = createStore('tasks.json')

// 获取任务列表
router.get('/', async (req, res) => {
  try {
    let items = await tasks.getAll()
    const { status, projectId, priority, keyword } = req.query

    if (status) items = items.filter(t => t.status === status)
    if (projectId) items = items.filter(t => t.projectId === projectId)
    if (priority) items = items.filter(t => t.priority === priority)
    if (keyword) {
      const kw = keyword.toLowerCase()
      items = items.filter(t =>
        t.title.toLowerCase().includes(kw) ||
        (t.description && t.description.toLowerCase().includes(kw))
      )
    }

    // 默认排序：优先级升序，同优先级按截止时间升序
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 }
    items.sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 2
      const pb = priorityOrder[b.priority] ?? 2
      if (pa !== pb) return pa - pb
      const da = a.deadline ? new Date(a.deadline).getTime() : NaN
      const db = b.deadline ? new Date(b.deadline).getTime() : NaN
      if (isNaN(da)) return 1
      if (isNaN(db)) return -1
      return da - db
    })

    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取需要提醒的任务（必须在 /:id 之前，否则被参数路由拦截）
router.get('/reminders/list', async (req, res) => {
  try {
    const all = await tasks.getAll()
    const now = new Date()
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)

    const reminders = all.filter(t => {
      if (t.status === 'done' || t.status === 'archived') return false
      if (t.reminderDismissed) return false
      if (t.reminderSnoozedUntil && new Date(t.reminderSnoozedUntil) > now) return false
      if (!t.deadline) return false

      const deadline = new Date(t.deadline)
      return deadline <= oneHourLater
    })

    res.json(reminders)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取单个任务
router.get('/:id', async (req, res) => {
  try {
    const item = await tasks.getById(req.params.id)
    if (!item) return res.status(404).json({ error: '任务不存在' })
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 创建任务
router.post('/', async (req, res) => {
  try {
    const now = new Date().toISOString()
    const item = {
      id: uuidv4(),
      title: req.body.title || '未命名任务',
      description: req.body.description || '',
      projectId: req.body.projectId || 'default',
      priority: req.body.priority || 'P2',
      status: 'pending',
      tags: req.body.tags || [],
      relatedPeople: req.body.relatedPeople || [],
      deadline: req.body.deadline || null,
      reminderDismissed: false,
      reminderSnoozedUntil: null,
      estimatedPomodoros: req.body.estimatedPomodoros || 0,
      completedPomodoros: 0,
      totalFocusMinutes: 0,
      completedResult: '',
      completedAt: null,
      createdAt: now,
      updatedAt: now
    }
    await tasks.create(item)
    res.status(201).json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 更新任务（白名单过滤字段）
const TASK_UPDATE_FIELDS = ['title', 'description', 'projectId', 'priority', 'status',
  'tags', 'relatedPeople', 'deadline', 'reminderDismissed', 'reminderSnoozedUntil',
  'estimatedPomodoros', 'completedPomodoros', 'totalFocusMinutes']

router.put('/:id', async (req, res) => {
  const updates = {}
  for (const key of TASK_UPDATE_FIELDS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key]
  }
  // 校验 status 合法值
  if (updates.status && !['pending', 'active', 'done', 'archived'].includes(updates.status)) {
    return res.status(400).json({ error: '无效的状态值' })
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: '无有效字段' })
  const updated = await tasks.update(req.params.id, updates)
  if (!updated) return res.status(404).json({ error: '任务不存在' })
  res.json(updated)
})

// 删除任务
router.delete('/:id', async (req, res) => {
  const ok = await tasks.delete(req.params.id)
  if (!ok) return res.status(404).json({ error: '任务不存在' })
  res.json({ success: true })
})

// 完成任务
router.post('/:id/complete', async (req, res) => {
  const updated = await tasks.update(req.params.id, {
    status: 'done',
    completedResult: req.body.completedResult || '',
    completedAt: new Date().toISOString()
  })
  if (!updated) return res.status(404).json({ error: '任务不存在' })
  res.json(updated)
})

// 屏蔽提醒
router.post('/:id/dismiss-reminder', async (req, res) => {
  const updated = await tasks.update(req.params.id, { reminderDismissed: true })
  if (!updated) return res.status(404).json({ error: '任务不存在' })
  res.json(updated)
})

// 延迟提醒
router.post('/:id/snooze-reminder', async (req, res) => {
  let until = req.body.until || new Date(Date.now() + 60 * 60 * 1000).toISOString()
  if (isNaN(new Date(until).getTime())) {
    return res.status(400).json({ error: '无效日期格式' })
  }
  const updated = await tasks.update(req.params.id, { reminderSnoozedUntil: until })
  if (!updated) return res.status(404).json({ error: '任务不存在' })
  res.json(updated)
})

export default router

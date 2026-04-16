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
      const kw = String(keyword).slice(0, 100).toLowerCase()
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
    const title = (req.body.title || '').trim()
    if (!title) return res.status(400).json({ error: '标题不能为空' })
    if (title.length > 200) return res.status(400).json({ error: '标题过长（最多200字）' })

    const now = new Date().toISOString()
    const item = {
      id: uuidv4(),
      title,
      description: (req.body.description || '').slice(0, 5000),
      projectId: req.body.projectId || 'default',
      priority: req.body.priority || 'P2',
      status: 'pending',
      tags: Array.isArray(req.body.tags) ? req.body.tags.slice(0, 20) : [],
      relatedPeople: Array.isArray(req.body.relatedPeople) ? req.body.relatedPeople.slice(0, 20) : [],
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
  try {
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
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 删除任务
router.delete('/:id', async (req, res) => {
  try {
    const ok = await tasks.delete(req.params.id)
    if (!ok) return res.status(404).json({ error: '任务不存在' })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 完成任务
router.post('/:id/complete', async (req, res) => {
  try {
    const updated = await tasks.update(req.params.id, {
      status: 'done',
      completedResult: req.body.completedResult || '',
      completedAt: new Date().toISOString()
    })
    if (!updated) return res.status(404).json({ error: '任务不存在' })
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 屏蔽提醒
router.post('/:id/dismiss-reminder', async (req, res) => {
  try {
    const updated = await tasks.update(req.params.id, { reminderDismissed: true })
    if (!updated) return res.status(404).json({ error: '任务不存在' })
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 延迟提醒
router.post('/:id/snooze-reminder', async (req, res) => {
  try {
    let until = req.body.until || new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const untilDate = new Date(until)
    if (isNaN(untilDate.getTime())) {
      return res.status(400).json({ error: '无效日期格式' })
    }
    if (untilDate <= new Date()) {
      return res.status(400).json({ error: '延迟时间必须在未来' })
    }
    const updated = await tasks.update(req.params.id, { reminderSnoozedUntil: until })
    if (!updated) return res.status(404).json({ error: '任务不存在' })
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router

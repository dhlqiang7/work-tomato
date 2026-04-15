import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { createStore } from '../store/base.js'

const router = Router()
const projects = createStore('projects.json')
const tasks = createStore('tasks.json')

// 获取项目列表
router.get('/', async (req, res) => {
  try {
    let items = await projects.getAll()
    const { status } = req.query
    if (status) items = items.filter(p => p.status === status)

    // 附加任务统计
    const allTasks = await tasks.getAll()
    items = items.map(p => {
      const projectTasks = allTasks.filter(t => t.projectId === p.id && t.status !== 'archived')
      const doneTasks = projectTasks.filter(t => t.status === 'done')
      return {
        ...p,
        taskCount: projectTasks.length,
        doneCount: doneTasks.length,
        progress: projectTasks.length > 0 ? Math.round(doneTasks.length / projectTasks.length * 100) : 0
      }
    })

    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 创建项目
router.post('/', async (req, res) => {
  try {
    const title = (req.body.title || '').trim()
    if (!title) return res.status(400).json({ error: '项目名称不能为空' })
    if (title.length > 100) return res.status(400).json({ error: '项目名称过长（最多100字）' })

    const now = new Date().toISOString()
    const item = {
      id: uuidv4(),
      title,
      description: (req.body.description || '').slice(0, 5000),
      relatedPeople: Array.isArray(req.body.relatedPeople) ? req.body.relatedPeople.slice(0, 20) : [],
      color: req.body.color || '#3498DB',
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
    await projects.create(item)
    res.status(201).json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 更新项目（白名单过滤字段）
const PROJECT_UPDATE_FIELDS = ['title', 'description', 'relatedPeople', 'color', 'status']

router.put('/:id', async (req, res) => {
  try {
    const updates = {}
    for (const key of PROJECT_UPDATE_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: '无有效字段' })
    const updated = await projects.update(req.params.id, updates)
    if (!updated) return res.status(404).json({ error: '项目不存在' })
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 删除项目
router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === 'default') {
      return res.status(400).json({ error: '不能删除默认项目' })
    }
    // 先确认项目存在
    const project = await projects.getById(req.params.id)
    if (!project) return res.status(404).json({ error: '项目不存在' })
    // 先迁移任务到默认项目
    const now = new Date().toISOString()
    const allTasks = await tasks.getAll()
    const updated = allTasks.map(t => t.projectId === req.params.id ? { ...t, projectId: 'default', updatedAt: now } : t)
    await tasks.replaceAll(updated)
    // 再删除项目
    await projects.delete(req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

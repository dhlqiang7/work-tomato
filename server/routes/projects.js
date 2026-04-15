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
    const now = new Date().toISOString()
    const item = {
      id: uuidv4(),
      title: req.body.title || '未命名项目',
      description: req.body.description || '',
      relatedPeople: req.body.relatedPeople || [],
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

// 更新项目
router.put('/:id', async (req, res) => {
  const updated = await projects.update(req.params.id, req.body)
  if (!updated) return res.status(404).json({ error: '项目不存在' })
  res.json(updated)
})

// 删除项目
router.delete('/:id', async (req, res) => {
  if (req.params.id === 'default') {
    return res.status(400).json({ error: '不能删除默认项目' })
  }
  const ok = await projects.delete(req.params.id)
  if (!ok) return res.status(404).json({ error: '项目不存在' })
  // 将该项目下的任务移到默认项目
  const allTasks = await tasks.getAll()
  const updated = allTasks.map(t => t.projectId === req.params.id ? { ...t, projectId: 'default' } : t)
  await tasks.replaceAll(updated)
  res.json({ success: true })
})

export default router

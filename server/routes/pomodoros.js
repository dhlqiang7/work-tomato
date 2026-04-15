import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { createStore } from '../store/base.js'

const router = Router()
const pomodoros = createStore('pomodoros.json')
const tasks = createStore('tasks.json')

// 开始番茄钟
router.post('/start', async (req, res) => {
  try {
    const { taskId, type = 'work' } = req.body
    const now = new Date().toISOString()

    // 取消当前进行中的番茄钟
    const all = await pomodoros.getAll()
    const running = all.filter(p => p.status === 'running')
    for (const r of running) {
      await pomodoros.update(r.id, { status: 'cancelled', endedAt: now })
    }

    const plannedMinutes = type === 'work' ? 25 : type === 'longbreak' ? 15 : 5

    const item = {
      id: uuidv4(),
      taskId,
      type,
      plannedMinutes,
      actualMinutes: 0,
      status: 'running',
      startedAt: now,
      endedAt: null
    }
    await pomodoros.create(item)

    // 更新任务状态为 active
    if (taskId) {
      await tasks.update(taskId, { status: 'active' })
    }

    res.status(201).json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 暂停
router.put('/:id/pause', async (req, res) => {
  const item = await pomodoros.getById(req.params.id)
  if (!item) return res.status(404).json({ error: '记录不存在' })
  if (item.status !== 'running') return res.status(400).json({ error: '非运行状态' })

  const elapsed = Math.round((Date.now() - new Date(item.startedAt).getTime()) / 60000)
  const updated = await pomodoros.update(req.params.id, { actualMinutes: elapsed })
  res.json(updated)
})

// 继续
router.put('/:id/resume', async (req, res) => {
  const item = await pomodoros.getById(req.params.id)
  if (!item) return res.status(404).json({ error: '记录不存在' })
  const updated = await pomodoros.update(req.params.id, { status: 'running' })
  res.json(updated)
})

// 停止（完成或取消）
router.put('/:id/stop', async (req, res) => {
  try {
    const item = await pomodoros.getById(req.params.id)
    if (!item) return res.status(404).json({ error: '记录不存在' })

    const now = new Date()
    const elapsed = Math.round((now.getTime() - new Date(item.startedAt).getTime()) / 60000)
    const completed = req.body.completed !== false // 默认完成

    const updated = await pomodoros.update(req.params.id, {
      status: completed ? 'completed' : 'cancelled',
      endedAt: now.toISOString(),
      actualMinutes: elapsed
    })

    // 如果是工作阶段且完成，更新任务的番茄计数和专注时长
    if (completed && item.type === 'work' && item.taskId) {
      const task = await tasks.getById(item.taskId)
      if (task) {
        await tasks.update(item.taskId, {
          completedPomodoros: (task.completedPomodoros || 0) + 1,
          totalFocusMinutes: (task.totalFocusMinutes || 0) + elapsed
        })
      }
    }

    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取当前番茄钟
router.get('/current', async (req, res) => {
  const all = await pomodoros.getAll()
  const running = all.find(p => p.status === 'running')
  res.json(running || null)
})

// 获取番茄钟历史
router.get('/history', async (req, res) => {
  const all = await pomodoros.getAll()
  const { taskId, date } = req.query
  let items = all.filter(p => p.status === 'completed')
  if (taskId) items = items.filter(p => p.taskId === taskId)
  if (date) {
    const d = new Date(date).toDateString()
    items = items.filter(p => new Date(p.startedAt).toDateString() === d)
  }
  items.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
  res.json(items)
})

export default router

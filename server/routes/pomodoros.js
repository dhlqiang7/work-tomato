import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { createStore } from '../store/base.js'

const router = Router()
const pomodoros = createStore('pomodoros.json')
const tasks = createStore('tasks.json')

// 计算实际专注分钟数（扣除暂停时间）
function calcActualMinutes(item) {
  const totalMs = Date.now() - new Date(item.startedAt).getTime()
  const pausedMs = item.pausedMs || 0
  return Math.max(1, Math.round((totalMs - pausedMs) / 60000))
}

// 开始番茄钟
router.post('/start', async (req, res) => {
  try {
    const { taskId, type = 'work' } = req.body
    const now = new Date().toISOString()

    const plannedMinutes = type === 'work' ? 25 : type === 'longbreak' ? 15 : 5

    const item = {
      id: uuidv4(),
      taskId,
      type,
      plannedMinutes,
      actualMinutes: 0,
      pausedMs: 0,
      lastPausedAt: null,
      status: 'running',
      startedAt: now,
      endedAt: null
    }

    // 原子操作：读取 → 取消进行中的 → 添加新的，在 replaceAll 的锁内完成
    const all = await pomodoros.getAll()
    for (const p of all) {
      if (p.status === 'running') {
        p.status = 'cancelled'
        p.endedAt = now
      }
    }
    all.push(item)
    await pomodoros.replaceAll(all)

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
  try {
    const item = await pomodoros.getById(req.params.id)
    if (!item) return res.status(404).json({ error: '记录不存在' })
    if (item.status !== 'running') return res.status(400).json({ error: '非运行状态' })

    const updated = await pomodoros.update(req.params.id, {
      status: 'paused',
      lastPausedAt: new Date().toISOString(),
      actualMinutes: calcActualMinutes(item)
    })
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 继续
router.put('/:id/resume', async (req, res) => {
  try {
    const item = await pomodoros.getById(req.params.id)
    if (!item) return res.status(404).json({ error: '记录不存在' })
    if (item.status !== 'paused') return res.status(400).json({ error: '非暂停状态' })

    // 累加本次暂停时长
    const pauseDuration = item.lastPausedAt
      ? Date.now() - new Date(item.lastPausedAt).getTime()
      : 0

    const updated = await pomodoros.update(req.params.id, {
      status: 'running',
      lastPausedAt: null,
      pausedMs: (item.pausedMs || 0) + pauseDuration
    })
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 停止（完成或取消）
router.put('/:id/stop', async (req, res) => {
  try {
    const item = await pomodoros.getById(req.params.id)
    if (!item) return res.status(404).json({ error: '记录不存在' })

    const now = new Date()
    const elapsed = calcActualMinutes(item)
    const completed = req.body.completed !== false

    const updated = await pomodoros.update(req.params.id, {
      status: completed ? 'completed' : 'cancelled',
      endedAt: now.toISOString(),
      actualMinutes: elapsed
    })

    if (completed && item.type === 'work' && item.taskId) {
      const task = await tasks.getById(item.taskId)
      if (task) {
        await tasks.update(item.taskId, {
          completedPomodoros: (task.completedPomodoros || 0) + 1,
          totalFocusMinutes: (task.totalFocusMinutes || 0) + elapsed
        })
      } else {
        console.warn(`番茄钟 ${req.params.id} 关联的任务 ${item.taskId} 已不存在`)
      }
    }

    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 获取当前番茄钟
router.get('/current', async (req, res) => {
  try {
    const all = await pomodoros.getAll()
    const running = all.find(p => p.status === 'running' || p.status === 'paused')
    res.json(running || null)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 获取番茄钟历史
router.get('/history', async (req, res) => {
  try {
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
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router

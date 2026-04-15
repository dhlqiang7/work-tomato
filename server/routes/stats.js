import { Router } from 'express'
import { createStore, initDefaultProject } from '../store/base.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = Router()
const tasks = createStore('tasks.json')
const pomodoros = createStore('pomodoros.json')

// 时间范围计算
function getDateRange(period, customStart, customEnd) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start, end = new Date(today.getTime() + 86400000) // 明天 0 点（不含）

  switch (period) {
    case 'today':
      start = today
      break
    case 'week':
      start = new Date(today.getTime() - 7 * 86400000)
      break
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'month30':
      start = new Date(today.getTime() - 30 * 86400000)
      break
    case 'halfyear':
      start = now.getMonth() < 6
        ? new Date(now.getFullYear(), 0, 1)
        : new Date(now.getFullYear(), 6, 1)
      break
    case 'year':
      start = new Date(now.getFullYear(), 0, 1)
      break
    case 'custom':
      start = customStart ? new Date(customStart) : today
      end = customEnd ? new Date(new Date(customEnd).getTime() + 86400000) : end
      // 验证日期有效性
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        start = today
        end = new Date(today.getTime() + 86400000)
      }
      if (start > end) { const tmp = start; start = end; end = tmp }
      break
    default:
      start = today
  }
  return { start, end }
}

// 仪表盘数据
router.get('/dashboard', async (req, res) => {
  try {
    const allTasks = await tasks.getAll()
    const allPomodoros = await pomodoros.getAll()
    const today = new Date()
    const todayStr = today.toDateString()

    const todayDone = allTasks.filter(t => t.status === 'done' && new Date(t.completedAt).toDateString() === todayStr)
    const todayPending = allTasks.filter(t => t.status === 'pending' || t.status === 'active')
    const todayPomodoros = allPomodoros.filter(p => p.status === 'completed' && new Date(p.startedAt).toDateString() === todayStr)
    const todayFocusMinutes = todayPomodoros.reduce((sum, p) => sum + (p.actualMinutes || 0), 0)

    // 计算连续工作天数（上限 365 天）
    const doneDates = new Set(
      allTasks.filter(t => t.status === 'done' && t.completedAt)
        .map(t => new Date(t.completedAt).toDateString())
        .filter(d => d !== 'Invalid Date')
    )
    let streak = 0
    const d = new Date()
    // 今天若无完成记录，从昨天开始检查
    if (!doneDates.has(todayStr)) {
      d.setDate(d.getDate() - 1)
    }
    while (streak < 365) {
      if (doneDates.has(d.toDateString())) {
        streak++
        d.setDate(d.getDate() - 1)
      } else {
        break
      }
    }

    // 最近 7 天专注时长
    const weeklyFocus = []
    for (let i = 6; i >= 0; i--) {
      const day = new Date(today)
      day.setDate(day.getDate() - i)
      const dayStr = day.toDateString()
      const mins = allPomodoros
        .filter(p => p.status === 'completed' && new Date(p.startedAt).toDateString() === dayStr)
        .reduce((sum, p) => sum + (p.actualMinutes || 0), 0)
      weeklyFocus.push({
        date: `${day.getMonth() + 1}/${day.getDate()}`,
        minutes: mins
      })
    }

    res.json({
      todayDoneCount: todayDone.length,
      todayPendingCount: todayPending.length,
      todayPomodoroCount: todayPomodoros.length,
      todayFocusMinutes,
      streak,
      weeklyFocus
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 回顾数据
router.get('/review', async (req, res) => {
  try {
    const { period, start: customStart, end: customEnd } = req.query
    const { start, end } = getDateRange(period, customStart, customEnd)

    const allTasks = await tasks.getAll()
    const allPomodoros = await pomodoros.getAll()

    const doneTasks = allTasks.filter(t => {
      if (t.status !== 'done' || !t.completedAt) return false
      const d = new Date(t.completedAt)
      return d >= start && d < end
    })

    const periodPomodoros = allPomodoros.filter(p => {
      if (p.status !== 'completed') return false
      const d = new Date(p.startedAt)
      return d >= start && d < end
    })

    const totalFocusMinutes = periodPomodoros.reduce((sum, p) => sum + (p.actualMinutes || 0), 0)

    // 按项目分组
    const byProject = {}
    for (const t of doneTasks) {
      const key = t.projectId || 'default'
      byProject[key] = (byProject[key] || 0) + 1
    }

    // 按优先级分组
    const byPriority = {}
    for (const t of doneTasks) {
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1
    }

    res.json({
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      tasks: doneTasks,
      stats: {
        totalDone: doneTasks.length,
        totalPomodoros: periodPomodoros.length,
        totalFocusMinutes,
        byProject,
        byPriority
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 导出数据
router.get('/export', async (req, res) => {
  try {
    const dataDir = path.resolve(__dirname, '../../data')
    const result = { version: '1.0.0', exportedAt: new Date().toISOString() }

    for (const file of ['tasks.json', 'projects.json', 'pomodoros.json']) {
      try {
        const content = await fs.readFile(path.join(dataDir, file), 'utf-8')
        result[file.replace('.json', '')] = JSON.parse(content)
      } catch {
        result[file.replace('.json', '')] = []
      }
    }

    res.setHeader('Content-Disposition', 'attachment; filename="tomato-backup.json"')
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 导入数据
router.post('/import', async (req, res) => {
  try {
    const { mode = 'merge', data } = req.body
    if (!data || typeof data !== 'object') return res.status(400).json({ error: '无数据' })
    if (!['merge', 'overwrite'].includes(mode)) return res.status(400).json({ error: '无效模式' })

    // 验证数据结构：每个 key 应为数组
    const validKeys = ['tasks', 'projects', 'pomodoros']
    for (const key of Object.keys(data)) {
      if (!validKeys.includes(key)) delete data[key]
      else if (!Array.isArray(data[key])) return res.status(400).json({ error: `${key} 数据格式错误` })
    }

    const stores = {
      tasks: createStore('tasks.json'),
      projects: createStore('projects.json'),
      pomodoros: createStore('pomodoros.json')
    }

    if (mode === 'overwrite') {
      for (const [key, store] of Object.entries(stores)) {
        if (data[key]) await store.replaceAll(data[key])
      }
      // 确保默认项目存在
      await initDefaultProject()
    } else {
      // merge: 追加不重复的条目
      for (const [key, store] of Object.entries(stores)) {
        if (!data[key]) continue
        const existing = await store.getAll()
        const existingIds = new Set(existing.map(i => i.id))
        const newItems = data[key].filter(i => i.id && !existingIds.has(i.id))
        await store.replaceAll([...existing, ...newItems])
      }
    }

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

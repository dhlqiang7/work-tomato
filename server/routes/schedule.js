import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { createStore } from '../store/base.js'

const router = Router()
const items = createStore('schedule_items.json')

// 获取计划条目（按日期范围筛选）
router.get('/', async (req, res) => {
  try {
    let all = await items.getAll()
    const { start, end } = req.query
    if (start) all = all.filter(i => i.date >= start)
    if (end) all = all.filter(i => i.date <= end)
    all.sort((a, b) => a.date.localeCompare(b.date) || a.startHour - b.startHour)
    res.json(all)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 创建
router.post('/', async (req, res) => {
  try {
    const title = (req.body.title || '').trim()
    if (!title) return res.status(400).json({ error: '标题不能为空' })
    if (!req.body.date) return res.status(400).json({ error: '缺少日期' })

    const now = new Date().toISOString()
    const item = {
      id: uuidv4(),
      taskId: req.body.taskId || null,
      title,
      description: (req.body.description || '').slice(0, 500),
      date: req.body.date,
      startHour: req.body.startHour ?? 9,
      startMinute: req.body.startMinute ?? 0,
      endHour: req.body.endHour ?? 10,
      endMinute: req.body.endMinute ?? 0,
      color: req.body.color || null,
      createdAt: now,
      updatedAt: now
    }
    await items.create(item)
    res.status(201).json(item)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 更新（白名单）
const UPDATE_FIELDS = ['title', 'description', 'taskId', 'date', 'startHour', 'startMinute', 'endHour', 'endMinute', 'color']

router.put('/:id', async (req, res) => {
  try {
    const updates = {}
    for (const key of UPDATE_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: '无有效字段' })
    const updated = await items.update(req.params.id, updates)
    if (!updated) return res.status(404).json({ error: '不存在' })
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 删除
router.delete('/:id', async (req, res) => {
  try {
    const ok = await items.delete(req.params.id)
    if (!ok) return res.status(404).json({ error: '不存在' })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router

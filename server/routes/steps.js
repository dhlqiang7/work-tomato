import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { createStore } from '../store/base.js'

const router = Router()
const steps = createStore('steps.json')

// 获取某任务的所有步骤（按 order 排序）
router.get('/', async (req, res) => {
  try {
    const { taskId } = req.query
    if (!taskId) return res.status(400).json({ error: '缺少 taskId 参数' })
    let items = await steps.getAll()
    items = items.filter(s => s.taskId === taskId)
    items.sort((a, b) => a.order - b.order)
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 创建步骤
router.post('/', async (req, res) => {
  try {
    const title = (req.body.title || '').trim()
    if (!title) return res.status(400).json({ error: '步骤标题不能为空' })
    if (title.length > 200) return res.status(400).json({ error: '标题过长（最多200字）' })
    if (!req.body.taskId) return res.status(400).json({ error: '缺少 taskId' })

    const validTypes = ['start', 'step', 'branch', 'end']
    const type = validTypes.includes(req.body.type) ? req.body.type : 'step'

    // 自动计算 order（当前最大 order + 1）
    const all = await steps.getAll()
    const taskSteps = all.filter(s => s.taskId === req.body.taskId)
    const maxOrder = taskSteps.length > 0 ? Math.max(...taskSteps.map(s => s.order)) : -1

    const now = new Date().toISOString()
    const item = {
      id: uuidv4(),
      taskId: req.body.taskId,
      title,
      type,
      status: 'pending',
      order: req.body.order != null ? req.body.order : maxOrder + 1,
      createdAt: now,
      updatedAt: now
    }
    await steps.create(item)
    res.status(201).json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 更新步骤
const STEP_UPDATE_FIELDS = ['title', 'type', 'status', 'order']

router.put('/:id', async (req, res) => {
  try {
    const updates = {}
    for (const key of STEP_UPDATE_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    if (updates.type && !['start', 'step', 'branch', 'end'].includes(updates.type)) {
      return res.status(400).json({ error: '无效的步骤类型' })
    }
    if (updates.status && !['pending', 'active', 'done'].includes(updates.status)) {
      return res.status(400).json({ error: '无效的状态值' })
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: '无有效字段' })
    const updated = await steps.update(req.params.id, updates)
    if (!updated) return res.status(404).json({ error: '步骤不存在' })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 删除步骤
router.delete('/:id', async (req, res) => {
  try {
    const ok = await steps.delete(req.params.id)
    if (!ok) return res.status(404).json({ error: '步骤不存在' })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// 批量更新步骤顺序
router.put('/reorder/batch', async (req, res) => {
  try {
    const { items } = req.body
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items 必须为数组' })
    const all = await steps.getAll()
    for (const { id, order } of items) {
      const idx = all.findIndex(s => s.id === id)
      if (idx !== -1) {
        all[idx].order = order
        all[idx].updatedAt = new Date().toISOString()
      }
    }
    await steps.replaceAll(all)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

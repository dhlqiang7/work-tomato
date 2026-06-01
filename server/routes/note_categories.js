import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { createStore } from '../store/base.js'

const router = Router()
const categories = createStore('note_categories.json')

// 列表
router.get('/', async (req, res) => {
  try {
    const all = await categories.getAll()
    all.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    res.json(all)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 新建
router.post('/', async (req, res) => {
  try {
    const title = (req.body.title || '').trim()
    if (!title) return res.status(400).json({ error: '分类名称不能为空' })
    const all = await categories.getAll()
    const maxOrder = all.length > 0 ? Math.max(...all.map(c => c.order ?? 0)) : -1
    const now = new Date().toISOString()
    const cat = {
      id: uuidv4(),
      title,
      color: req.body.color || '#4A8FBF',
      order: req.body.order ?? maxOrder + 1,
      createdAt: now
    }
    await categories.create(cat)
    res.status(201).json(cat)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 更新
const CAT_UPDATE_FIELDS = ['title','color','order']

router.put('/:id', async (req, res) => {
  try {
    const updates = {}
    for (const key of CAT_UPDATE_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: '无有效字段' })
    const updated = await categories.update(req.params.id, updates)
    if (!updated) return res.status(404).json({ error: '分类不存在' })
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 删除
router.delete('/:id', async (req, res) => {
  try {
    if (!await categories.getById(req.params.id)) return res.status(404).json({ error: '分类不存在' })
    // 该分类下的笔记 categoryId 置 null
    const notes = createStore('notes.json')
    const allNotes = await notes.getAll()
    for (const n of allNotes) {
      if (n.categoryId === req.params.id) {
        await notes.update(n.id, { categoryId: null })
      }
    }
    await categories.delete(req.params.id)
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router

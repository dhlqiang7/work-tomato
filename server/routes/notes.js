import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { createStore } from '../store/base.js'

const router = Router()
const notes = createStore('notes.json')

// 列表（支持分类/关键词筛选）
router.get('/', async (req, res) => {
  try {
    let all = await notes.getAll()
    const { categoryId, keyword } = req.query
    if (categoryId) {
      if (categoryId === 'uncategorized') {
        all = all.filter(n => !n.categoryId)
      } else {
        all = all.filter(n => n.categoryId === categoryId)
      }
    }
    if (keyword) {
      const kw = keyword.toLowerCase()
      all = all.filter(n =>
        n.title.toLowerCase().includes(kw) ||
        (n.content || '').toLowerCase().includes(kw)
      )
    }
    all.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.updatedAt) - new Date(a.updatedAt)
    })
    res.json(all)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 单条
router.get('/:id', async (req, res) => {
  try {
    const note = await notes.getById(req.params.id)
    if (!note) return res.status(404).json({ error: '笔记不存在' })
    res.json(note)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 新建
router.post('/', async (req, res) => {
  try {
    const now = new Date().toISOString()
    const note = {
      id: uuidv4(),
      title: (req.body.title || '').trim() || '未命名笔记',
      content: req.body.content || '',
      categoryId: req.body.categoryId || null,
      linkedTaskIds: req.body.linkedTaskIds || [],
      pinned: req.body.pinned || false,
      createdAt: now,
      updatedAt: now
    }
    await notes.create(note)
    res.status(201).json(note)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 更新
const NOTE_UPDATE_FIELDS = ['title','content','categoryId','linkedTaskIds','pinned']

router.put('/:id', async (req, res) => {
  try {
    const updates = {}
    for (const key of NOTE_UPDATE_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key]
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: '无有效字段' })
    const updated = await notes.update(req.params.id, updates)
    if (!updated) return res.status(404).json({ error: '笔记不存在' })
    res.json(updated)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// 删除
router.delete('/:id', async (req, res) => {
  try {
    const note = await notes.getById(req.params.id)
    if (!note) return res.status(404).json({ error: '笔记不存在' })
    // 清理关联任务的 noteId
    if (note.linkedTaskIds?.length) {
      const tasks = createStore('tasks.json')
      for (const taskId of note.linkedTaskIds) {
        const task = await tasks.getById(taskId)
        if (task && task.noteId === req.params.id) {
          await tasks.update(taskId, { noteId: null })
        }
      }
    }
    await notes.delete(req.params.id)
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../../data')

// 确保数据目录存在
async function ensureDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// 安全写入：先写临时文件，再替换（兼容 Windows：rename 在目标存在时失败）
async function safeWrite(filePath, data) {
  const tmp = filePath + '.tmp'
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
  try {
    await fs.rename(tmp, filePath)
  } catch {
    // Windows 下 rename 会因目标文件已存在而失败，改用 copyFile + unlink
    await fs.copyFile(tmp, filePath)
    await fs.unlink(tmp)
  }
}

// 读取 JSON 文件，不存在则返回默认值
async function readJson(fileName, defaultVal = []) {
  await ensureDir()
  const filePath = path.join(DATA_DIR, fileName)
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    try {
      return JSON.parse(content)
    } catch {
      // JSON 损坏时返回默认值，避免应用崩溃
      console.error(`数据文件 ${fileName} 已损坏，将使用空数据恢复`)
      await safeWrite(filePath, defaultVal)
      return defaultVal
    }
  } catch {
    await safeWrite(filePath, defaultVal)
    return defaultVal
  }
}

// 写入 JSON 文件
async function writeJson(fileName, data) {
  await ensureDir()
  const filePath = path.join(DATA_DIR, fileName)
  await safeWrite(filePath, data)
}

// 通用 CRUD 封装
export function createStore(fileName) {
  return {
    async getAll() {
      return readJson(fileName, [])
    },

    async getById(id) {
      const items = await readJson(fileName, [])
      return items.find(item => item.id === id) || null
    },

    async create(item) {
      const items = await readJson(fileName, [])
      items.push(item)
      await writeJson(fileName, items)
      return item
    },

    async update(id, updates) {
      const items = await readJson(fileName, [])
      const index = items.findIndex(item => item.id === id)
      if (index === -1) return null
      items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() }
      await writeJson(fileName, items)
      return items[index]
    },

    async delete(id) {
      const items = await readJson(fileName, [])
      const filtered = items.filter(item => item.id !== id)
      if (filtered.length === items.length) return false
      await writeJson(fileName, filtered)
      return true
    },

    async query(filterFn) {
      const items = await readJson(fileName, [])
      return items.filter(filterFn)
    },

    async replaceAll(items) {
      await writeJson(fileName, items)
    }
  }
}

// 默认项目初始化
export async function initDefaultProject() {
  const store = createStore('projects.json')
  const existing = await store.getById('default')
  if (!existing) {
    await store.create({
      id: 'default',
      title: '日常工作',
      description: '未指定项目的任务默认归入此处',
      relatedPeople: [],
      color: '#E74C3C',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }
}

import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../../data')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')

const DEFAULT_CONFIG = { workStartHour: 9, workEndHour: 22 }

async function readConfig() {
  try { return JSON.parse(await fs.readFile(CONFIG_FILE, 'utf-8')) }
  catch { return { ...DEFAULT_CONFIG } }
}

async function writeConfig(data) {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(CONFIG_FILE, JSON.stringify(data, null, 2))
}

const router = Router()

router.get('/', async (req, res) => {
  try { res.json(await readConfig()) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/', async (req, res) => {
  try {
    const cfg = await readConfig()
    if (req.body.workStartHour != null) cfg.workStartHour = Math.max(0, Math.min(23, Number(req.body.workStartHour)))
    if (req.body.workEndHour != null) cfg.workEndHour = Math.max(0, Math.min(24, Number(req.body.workEndHour)))
    await writeConfig(cfg)
    res.json(cfg)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

export default router

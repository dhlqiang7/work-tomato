import express from 'express'
import { createServer as createViteServer } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { promisify } from 'util'

import taskRoutes from './routes/tasks.js'
import projectRoutes from './routes/projects.js'
import pomodoroRoutes from './routes/pomodoros.js'
import statsRoutes from './routes/stats.js'
import { initDefaultProject } from './store/base.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const open = promisify(exec)
const PORT = 3210
const isDev = process.argv.includes('--dev')

async function start() {
  // 初始化默认项目
  await initDefaultProject()

  const app = express()
  app.use(express.json())

  // API 路由
  app.use('/api/tasks', taskRoutes)
  app.use('/api/projects', projectRoutes)
  app.use('/api/pomodoros', pomodoroRoutes)
  app.use('/api/stats', statsRoutes)

  if (isDev) {
    // 开发模式：使用 Vite 开发服务器
    const vite = await createViteServer({
      root: path.resolve(__dirname, '../src'),
      server: { middlewareMode: true }
    })
    app.use(vite.middlewares)
  } else {
    // 生产模式：使用构建产物
    const distPath = path.resolve(__dirname, '../dist')
    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'))
      }
    })
  }

  const server = app.listen(PORT, 'localhost', () => {
    const url = `http://localhost:${PORT}`
    console.log(`\n  🍅 Tomato 已启动: ${url}\n`)

    // 自动打开浏览器
    const cmd = process.platform === 'win32' ? `start "" "${url}"`
      : process.platform === 'darwin' ? `open "${url}"`
      : `xdg-open "${url}" 2>/dev/null || echo "请手动打开浏览器访问: ${url}"`

    exec(cmd, (err) => {
      if (err) console.log(`  请手动打开浏览器访问: ${url}`)
    })
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  ❌ 端口 ${PORT} 已被占用，请检查是否已有实例运行，或修改端口号。\n`)
    } else {
      console.error('服务错误:', err)
    }
    process.exit(1)
  })
}

start().catch(err => {
  console.error('启动失败:', err)
  process.exit(1)
})

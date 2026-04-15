import express from 'express'
import { createServer as createViteServer } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'

import taskRoutes from './routes/tasks.js'
import projectRoutes from './routes/projects.js'
import pomodoroRoutes from './routes/pomodoros.js'
import statsRoutes from './routes/stats.js'
import { initDefaultProject } from './store/base.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = 3210

/**
 * 启动 Express 服务
 * @param {object} options
 * @param {boolean} options.silent - 为 true 时不自动打开浏览器（Electron 模式）
 * @returns {Promise<import('http').Server>}
 */
export async function startServer({ silent = false } = {}) {
  await initDefaultProject()

  const app = express()
  app.use(express.json({ limit: '1mb' }))

  // 安全响应头
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    next()
  })

  // API 路由
  app.use('/api/tasks', taskRoutes)
  app.use('/api/projects', projectRoutes)
  app.use('/api/pomodoros', pomodoroRoutes)
  app.use('/api/stats', statsRoutes)

  const isDev = process.argv.includes('--dev')

  if (isDev) {
    const vite = await createViteServer({
      root: path.resolve(__dirname, '../src'),
      server: { middlewareMode: true }
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.resolve(__dirname, '../dist')
    app.use(express.static(distPath))
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(distPath, 'index.html'))
      }
    })
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, 'localhost', () => {
      const url = `http://localhost:${PORT}`
      console.log(`\n  🍅 Tomato 已启动: ${url}\n`)

      // 非 silent 模式（独立运行时）自动打开浏览器
      if (!silent) {
        const cmd = process.platform === 'win32' ? `start "" "${url}"`
          : process.platform === 'darwin' ? `open "${url}"`
          : `xdg-open "${url}" 2>/dev/null || echo "请手动打开浏览器访问: ${url}"`

        exec(cmd, (err) => {
          if (err) console.log(`  请手动打开浏览器访问: ${url}`)
        })
      }

      resolve(server)
    })

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n  ❌ 端口 ${PORT} 已被占用，请检查是否已有实例运行。\n`)
      } else {
        console.error('服务错误:', err)
      }
      reject(err)
    })
  })
}

// 直接运行 node server/index.js 时启动
const isMainModule = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (isMainModule) {
  startServer().catch(err => {
    console.error('启动失败:', err)
    process.exit(1)
  })
}

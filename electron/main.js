import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = 3210

let mainWindow = null
let server = null

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Tomato - 个人工作助理',
    icon: path.join(__dirname, '../src/assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
    // 使用系统原生标题栏以确保 Windows 兼容性
    autoHideMenuBar: true,
    backgroundColor: '#FBF8F4'
  })

  // 加载应用
  const url = `http://localhost:${PORT}`
  mainWindow.loadURL(url)

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 开发工具快捷键（生产环境可移除）
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools()
  }
}

async function startBackend() {
  // 动态导入 ES Module 服务
  const serverPath = path.join(__dirname, '../server/index.js')
  const { startServer } = await import(`file://${serverPath}`)
  server = await startServer({ silent: true })
}

// 应用就绪
app.whenReady().then(async () => {
  try {
    await startBackend()
    await createWindow()
  } catch (err) {
    console.error('启动失败:', err)
    app.quit()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 退出前关闭服务
app.on('before-quit', () => {
  if (server) {
    server.close()
    server = null
  }
})

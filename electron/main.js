import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow = null
let server = null
let serverPort = 3210
let tray = null
let isQuitting = false

// ====== IPC: 窗口控制 ======
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
})
ipcMain.handle('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() || false)

// ====== 创建窗口 ======
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Tomato - 个人工作助理',
    icon: path.join(__dirname, 'icon.ico'),
    frame: false,                        // 无边框
    backgroundColor: '#FBF8F4',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.loadURL(`http://localhost:${serverPort}`)

  mainWindow.on('closed', () => { mainWindow = null })

  // 最大化状态变化时通知渲染进程更新图标
  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized-changed', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized-changed', false))

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools()
  }
}

// ====== 系统托盘 ======
function createTray() {
  // 按平台选择图标格式
  const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.ico'
  const icon = nativeImage.createFromPath(path.join(__dirname, iconFile))
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    { label: '🍅 Tomato', enabled: false },
    { type: 'separator' },
    { label: '显示主窗口', click: () => showWindow() },
    { label: '退出', click: () => { isQuitting = true; app.quit() } }
  ])

  tray.setToolTip('Tomato - 个人工作助理')
  tray.setContextMenu(contextMenu)

  // 双击托盘图标显示窗口
  tray.on('double-click', () => showWindow())
}

function showWindow() {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

// ====== 后端服务 ======
async function startBackend() {
  const serverPath = path.join(__dirname, '../server/index.js')
  const { startServer } = await import(serverPath)
  server = await startServer({ silent: true })
  serverPort = server.address().port
}

// ====== 应用生命周期 ======
app.whenReady().then(async () => {
  try {
    await startBackend()
    await createWindow()
    createTray()
  } catch (err) {
    console.error('启动失败:', err)
    app.quit()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 关闭窗口时最小化到托盘而非退出
app.on('window-all-closed', (e) => {
  if (process.platform !== 'darwin') {
    // 不退出，保持在托盘
  }
})

// 托盘菜单"退出"时才真正退出
app.on('before-quit', () => {
  isQuitting = true
  if (server) {
    server.close()
    server = null
  }
  if (tray) {
    tray.destroy()
    tray = null
  }
})

// 阻止窗口关闭，改为隐藏到托盘
app.on('browser-window-created', (_, win) => {
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })
})

// 确保进程退出时关闭服务器
process.on('SIGINT', () => {
  isQuitting = true
  if (server) server.close()
  app.quit()
})
process.on('SIGTERM', () => {
  isQuitting = true
  if (server) server.close()
  app.quit()
})

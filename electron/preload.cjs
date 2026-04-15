const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  // 监听最大化状态变化
  onMaximizedChanged: (callback) => {
    ipcRenderer.on('window:maximized-changed', (_, val) => callback(val))
  },
  // 平台信息
  platform: process.platform,
  // 是否在 Electron 中运行
  isElectron: true
})

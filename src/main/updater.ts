import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain, app } from 'electron'
import { rmSync, existsSync } from 'fs'
import { join } from 'path'

export interface UpdateStatus {
  status:
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error'
  version?: string
  progress?: number
  error?: string
}

let mainWindow: BrowserWindow | null = null

// 清理旧 bundle ID (com.muse.app) 遗留的更新缓存
function cleanupLegacyCache() {
  const cacheDir =
    process.platform === 'darwin'
      ? join(app.getPath('home'), 'Library', 'Caches')
      : app.getPath('temp')
  const legacyPaths = [
    join(cacheDir, 'com.muse.app.ShipIt'),
    join(cacheDir, 'com.muse.app'),
  ]
  for (const p of legacyPaths) {
    if (existsSync(p)) {
      try {
        rmSync(p, { recursive: true, force: true })
      } catch (_err) {
        console.warn(`[Updater] 清理旧缓存失败: ${p}`)
      }
    }
  }
}

function sendStatusToWindow(status: UpdateStatus) {
  if (mainWindow) {
    mainWindow.webContents.send('updater:status', status)
  }
}

export function initUpdater(window: BrowserWindow) {
  mainWindow = window

  // 清理旧 bundle ID (com.muse.app) 的更新缓存
  cleanupLegacyCache()

  // Configure auto updater
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow({ status: 'checking' })
  })

  autoUpdater.on('update-available', info => {
    sendStatusToWindow({ status: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    sendStatusToWindow({ status: 'not-available' })
  })

  autoUpdater.on('download-progress', progress => {
    sendStatusToWindow({
      status: 'downloading',
      progress: Math.round(progress.percent),
    })
  })

  autoUpdater.on('update-downloaded', info => {
    sendStatusToWindow({ status: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', err => {
    sendStatusToWindow({ status: 'error', error: err.message })
  })

  // Register IPC handlers
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return { success: true, version: result?.updateInfo.version }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall()
  })

  // Check for updates on startup (after a delay)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silently ignore errors on startup check
    })
  }, 3000)
}

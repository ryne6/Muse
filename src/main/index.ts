import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { startApiServer } from './apiServer'
import { startIpcBridge, fsService } from './ipcBridge'
import { initDatabase, closeDatabase } from './db'
import { initUpdater } from './updater'
import {
  ConversationService,
  MessageService,
  ProviderService,
  ModelService,
  SettingsService,
  AttachmentService,
  SearchService,
} from './db/services'
import { MCPService } from './db/services/mcpService'
import { SkillsService } from './db/services/skillsService'
import { DataMigration } from './db/migration'

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    center: true,
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    titleBarStyle: 'hiddenInset',
    title: 'Muse'
  })

  // Load the renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Open DevTools in development
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

  return mainWindow
}

app.whenReady().then(() => {
  // Set dock icon in development
  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock.setIcon(join(__dirname, '../../build/icon.png'))
  }

  // Initialize database
  console.log('🗄️  Initializing database...')
  initDatabase()

  // Register IPC handlers
  registerIpcHandlers()

  // Start servers
  startApiServer(2323)
  startIpcBridge(3001)

  const mainWindow = createWindow()

  // Initialize auto-updater (only in production)
  if (app.isPackaged) {
    initUpdater(mainWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// IPC Handlers
function registerIpcHandlers() {
  // File operations
  ipcMain.handle('fs:readFile', async (_, { path }) => {
    const content = await fsService.readFile(path)
    return { content }
  })

  ipcMain.handle('fs:writeFile', async (_, { path, content }) => {
    const success = await fsService.writeFile(path, content)
    return { success }
  })

  ipcMain.handle('fs:listFiles', async (_, { path, pattern }) => {
    const files = await fsService.listFiles(path, pattern)
    return { files }
  })

  ipcMain.handle('fs:exists', async (_, { path }) => {
    const exists = await fsService.exists(path)
    return { exists }
  })

  ipcMain.handle('fs:mkdir', async (_, { path }) => {
    const success = await fsService.mkdir(path)
    return { success }
  })

  // Command execution
  ipcMain.handle('exec:command', async (_, { command, cwd }) => {
    return await fsService.executeCommand(command, cwd)
  })

  // Workspace
  ipcMain.handle('workspace:get', () => {
    const path = fsService.getWorkspace()
    return { path }
  })

  ipcMain.handle('workspace:set', (_, { path }) => {
    const success = fsService.setWorkspace(path)
    return { success }
  })

  ipcMain.handle('workspace:select', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Workspace Folder',
    })

    if (!result.canceled && result.filePaths.length > 0) {
      const path = result.filePaths[0]
      fsService.setWorkspace(path)
      return { path }
    }

    return { path: null }
  })

  // Dialog - Select directory (with hidden files support)
  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'showHiddenFiles'],
      title: 'Select Directory',
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Database - Conversations
  ipcMain.handle('db:conversations:getAll', async () => {
    return await ConversationService.getAll()
  })

  ipcMain.handle('db:conversations:getById', async (_, { id }) => {
    return await ConversationService.getById(id)
  })

  ipcMain.handle('db:conversations:getWithMessages', async (_, { id }) => {
    return await ConversationService.getWithMessages(id)
  })

  ipcMain.handle('db:conversations:create', async (_, data) => {
    return await ConversationService.create(data)
  })

  ipcMain.handle('db:conversations:update', async (_, { id, data }) => {
    return await ConversationService.update(id, data)
  })

  ipcMain.handle('db:conversations:updateWorkspace', async (_, { id, workspace }) => {
    return await ConversationService.updateWorkspace(id, workspace)
  })

  ipcMain.handle('db:conversations:delete', async (_, { id }) => {
    return await ConversationService.delete(id)
  })

  // Database - Messages
  ipcMain.handle('db:messages:getByConversationId', async (_, { conversationId }) => {
    return await MessageService.getByConversationId(conversationId)
  })

  ipcMain.handle('db:messages:getAllWithTools', async (_, { conversationId }) => {
    return await MessageService.getAllWithTools(conversationId)
  })

  ipcMain.handle('db:messages:create', async (_, data) => {
    return await MessageService.create(data)
  })

  ipcMain.handle('db:messages:updateContent', async (_, { id, content }) => {
    return await MessageService.updateContent(id, content)
  })

  ipcMain.handle('db:messages:addToolCall', async (_, { messageId, data }) => {
    return await MessageService.addToolCall(messageId, data)
  })

  ipcMain.handle('db:messages:addToolResult', async (_, { toolCallId, data }) => {
    return await MessageService.addToolResult(toolCallId, data)
  })

  // Database - Providers
  ipcMain.handle('db:providers:getAll', async () => {
    return await ProviderService.getAll()
  })

  ipcMain.handle('db:providers:getEnabled', async () => {
    return await ProviderService.getEnabled()
  })

  ipcMain.handle('db:providers:getById', async (_, { id }) => {
    return await ProviderService.getById(id)
  })

  ipcMain.handle('db:providers:getByName', async (_, { name }) => {
    return await ProviderService.getByName(name)
  })

  ipcMain.handle('db:providers:create', async (_, data) => {
    return await ProviderService.create(data)
  })

  ipcMain.handle('db:providers:update', async (_, { id, data }) => {
    return await ProviderService.update(id, data)
  })

  ipcMain.handle('db:providers:delete', async (_, { id }) => {
    return await ProviderService.delete(id)
  })

  ipcMain.handle('db:providers:toggleEnabled', async (_, { id }) => {
    return await ProviderService.toggleEnabled(id)
  })

  // Database - Models
  ipcMain.handle('db:models:getAll', async () => {
    return await ModelService.getAll()
  })

  ipcMain.handle('db:models:getByProviderId', async (_, { providerId }) => {
    return await ModelService.getByProviderId(providerId)
  })

  ipcMain.handle('db:models:create', async (_, data) => {
    return await ModelService.create(data)
  })

  ipcMain.handle('db:models:createMany', async (_, { models }) => {
    return await ModelService.createMany(models)
  })

  ipcMain.handle('db:models:update', async (_, { id, data }) => {
    return await ModelService.update(id, data)
  })

  ipcMain.handle('db:models:delete', async (_, { id }) => {
    return await ModelService.delete(id)
  })

  ipcMain.handle('db:models:toggleEnabled', async (_, { id }) => {
    return await ModelService.toggleEnabled(id)
  })

  // Database - Settings
  ipcMain.handle('db:settings:getAll', async () => {
    return await SettingsService.getAll()
  })

  ipcMain.handle('db:settings:get', async (_, { key }) => {
    return await SettingsService.get(key)
  })

  ipcMain.handle('db:settings:set', async (_, { key, value }) => {
    return await SettingsService.set(key, value)
  })

  ipcMain.handle('db:settings:setMany', async (_, { settings }) => {
    return await SettingsService.setMany(settings)
  })

  // Database - Migration
  ipcMain.handle('db:migration:run', async (_, { data }) => {
    return await DataMigration.runMigration(data)
  })

  ipcMain.handle('db:migration:verify', async () => {
    return await DataMigration.verifyMigration()
  })

  ipcMain.handle('db:migration:clear', async () => {
    return await DataMigration.clearDatabase()
  })

  // Database - Search
  ipcMain.handle('db:search', async (_, { query }) => {
    return await SearchService.search(query)
  })

  ipcMain.handle('db:search:rebuild', async () => {
    await SearchService.rebuildIndex()
    return { success: true }
  })

  // Database - MCP Servers
  ipcMain.handle('db:mcp:getAll', async () => {
    return await MCPService.getAll()
  })

  ipcMain.handle('db:mcp:getEnabled', async () => {
    return await MCPService.getEnabled()
  })

  ipcMain.handle('db:mcp:getById', async (_, { id }) => {
    return await MCPService.getById(id)
  })

  ipcMain.handle('db:mcp:create', async (_, data) => {
    // Drizzle handles JSON serialization automatically via mode: 'json'
    const result = await MCPService.create(data)
    // Connect the new server if enabled
    if (result && result.enabled) {
      try {
        const { connectMcpServer } = await import('../api/services/mcp/init')
        await connectMcpServer(result)
      } catch (error) {
        console.error('Failed to connect MCP server:', error)
      }
    }
    return result
  })

  ipcMain.handle('db:mcp:update', async (_, { id, data }) => {
    return await MCPService.update(id, data)
  })

  ipcMain.handle('db:mcp:delete', async (_, { id }) => {
    // Get server name before deleting
    const server = await MCPService.getById(id)
    if (server) {
      try {
        const { disconnectMcpServer } = await import('../api/services/mcp/init')
        await disconnectMcpServer(server.name)
      } catch (error) {
        console.error('Failed to disconnect MCP server:', error)
      }
    }
    return await MCPService.delete(id)
  })

  ipcMain.handle('db:mcp:toggleEnabled', async (_, { id }) => {
    const result = await MCPService.toggleEnabled(id)
    if (result) {
      try {
        if (result.enabled) {
          const { connectMcpServer } = await import('../api/services/mcp/init')
          await connectMcpServer(result)
        } else {
          const { disconnectMcpServer } = await import('../api/services/mcp/init')
          await disconnectMcpServer(result.name)
        }
      } catch (error) {
        console.error('Failed to toggle MCP server connection:', error)
      }
    }
    return result
  })

  // MCP Runtime Status
  ipcMain.handle('mcp:getServerStates', async () => {
    try {
      const { mcpManager } = await import('../api/services/mcp/manager')
      return mcpManager.getServerStates()
    } catch (error) {
      console.error('Failed to get MCP server states:', error)
      return []
    }
  })

  // Database - Attachments
  ipcMain.handle('db:attachments:create', async (_, data) => {
    // Convert base64 string to Buffer if needed (renderer sends base64)
    if (typeof data.data === 'string') {
      data.data = Buffer.from(data.data, 'base64')
    }
    return await AttachmentService.create(data)
  })

  ipcMain.handle('db:attachments:getByMessageId', async (_, { messageId }) => {
    return await AttachmentService.getByMessageId(messageId)
  })

  ipcMain.handle('db:attachments:getPreviewsByMessageId', async (_, { messageId }) => {
    return await AttachmentService.getPreviewsByMessageId(messageId)
  })

  ipcMain.handle('db:attachments:getById', async (_, { id }) => {
    return await AttachmentService.getById(id)
  })

  ipcMain.handle('db:attachments:getBase64', async (_, { id }) => {
    return await AttachmentService.getBase64(id)
  })

  ipcMain.handle('db:attachments:updateNote', async (_, { id, note }) => {
    await AttachmentService.updateNote(id, note)
    return { success: true }
  })

  ipcMain.handle('db:attachments:delete', async (_, { id }) => {
    await AttachmentService.delete(id)
    return { success: true }
  })

  // Health check - verify API server is running
  ipcMain.handle('check-server-health', async () => {
    try {
      const response = await fetch('http://localhost:2323/health')
      return response.ok
    } catch {
      return false
    }
  })

  // Database - Skills Directories
  ipcMain.handle('db:skills:getDirectories', async () => {
    return await SkillsService.getAll()
  })

  ipcMain.handle('db:skills:addDirectory', async (_, { path }) => {
    return await SkillsService.create(path)
  })

  ipcMain.handle('db:skills:removeDirectory', async (_, { id }) => {
    await SkillsService.delete(id)
    return { success: true }
  })

  ipcMain.handle('db:skills:toggleDirectory', async (_, { id }) => {
    await SkillsService.toggleEnabled(id)
    return { success: true }
  })

  ipcMain.handle('db:skills:getAll', async () => {
    return await SkillsService.getAllSkills()
  })

  ipcMain.handle('db:skills:getContent', async (_, { path }) => {
    return SkillsService.getSkillContent(path)
  })

  ipcMain.handle('db:skills:getCount', async (_, { path }) => {
    return SkillsService.getSkillCount(path)
  })
}

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

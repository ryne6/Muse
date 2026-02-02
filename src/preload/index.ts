import { contextBridge, ipcRenderer } from 'electron'
import type { IpcApi } from '../shared/types/ipc'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
})

// Expose file system and workspace APIs
const api: IpcApi = {
  api: {
    getPort: () => ipcRenderer.invoke('api:get-port'),
  },
  fs: {
    readFile: (path: string) => ipcRenderer.invoke('fs:readFile', { path }),
    writeFile: (path: string, content: string) =>
      ipcRenderer.invoke('fs:writeFile', { path, content }),
    listFiles: (path: string, pattern?: string) =>
      ipcRenderer.invoke('fs:listFiles', { path, pattern }),
    exists: (path: string) => ipcRenderer.invoke('fs:exists', { path }),
    mkdir: (path: string) => ipcRenderer.invoke('fs:mkdir', { path }),
  },
  exec: {
    command: (command: string, cwd?: string) =>
      ipcRenderer.invoke('exec:command', { command, cwd }),
  },
  workspace: {
    get: () => ipcRenderer.invoke('workspace:get'),
    set: (path: string) => ipcRenderer.invoke('workspace:set', { path }),
    select: () => ipcRenderer.invoke('workspace:select'),
  },
  ipc: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  },
  search: {
    query: (query) => ipcRenderer.invoke('db:search', { query }),
    rebuildIndex: () => ipcRenderer.invoke('db:search:rebuild'),
  },
  attachments: {
    create: (data) => ipcRenderer.invoke('db:attachments:create', data),
    getByMessageId: (messageId) => ipcRenderer.invoke('db:attachments:getByMessageId', { messageId }),
    getPreviewsByMessageId: (messageId) => ipcRenderer.invoke('db:attachments:getPreviewsByMessageId', { messageId }),
    getById: (id) => ipcRenderer.invoke('db:attachments:getById', { id }),
    getBase64: (id) => ipcRenderer.invoke('db:attachments:getBase64', { id }),
    updateNote: (id, note) => ipcRenderer.invoke('db:attachments:updateNote', { id, note }),
    delete: (id) => ipcRenderer.invoke('db:attachments:delete', { id }),
  },
  mcp: {
    getServerStates: () => ipcRenderer.invoke('mcp:getServerStates'),
  },
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  },
  skills: {
    getDirectories: () => ipcRenderer.invoke('db:skills:getDirectories'),
    addDirectory: (path: string) => ipcRenderer.invoke('db:skills:addDirectory', { path }),
    removeDirectory: (id: string) => ipcRenderer.invoke('db:skills:removeDirectory', { id }),
    toggleDirectory: (id: string) => ipcRenderer.invoke('db:skills:toggleDirectory', { id }),
    getAll: () => ipcRenderer.invoke('db:skills:getAll'),
    getContent: (path: string) => ipcRenderer.invoke('db:skills:getContent', { path }),
    getCount: (path: string) => ipcRenderer.invoke('db:skills:getCount', { path }),
  },
  promptPresets: {
    getAll: () => ipcRenderer.invoke('db:promptPresets:getAll'),
    getById: (id: string) => ipcRenderer.invoke('db:promptPresets:getById', { id }),
    create: (data: { name: string; content: string }) => ipcRenderer.invoke('db:promptPresets:create', data),
    update: (id: string, data: { name?: string; content?: string }) => ipcRenderer.invoke('db:promptPresets:update', { id, data }),
    delete: (id: string) => ipcRenderer.invoke('db:promptPresets:delete', { id }),
  },
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    onStatus: (callback: (status: any) => void) => {
      const handler = (_: any, status: any) => callback(status)
      ipcRenderer.on('updater:status', handler)
      return () => ipcRenderer.removeListener('updater:status', handler)
    },
  },
}

contextBridge.exposeInMainWorld('api', api)


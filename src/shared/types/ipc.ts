import type { SearchQuery, SearchResponse } from './search'
import type { AttachmentPreview, NewAttachmentData } from './attachment'

export interface FileInfo {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modifiedTime: number
}

export interface CommandResult {
  output: string
  error?: string
}

export interface IpcApi {
  fs: {
    readFile: (path: string) => Promise<{ content: string }>
    writeFile: (path: string, content: string) => Promise<{ success: boolean }>
    listFiles: (path: string, pattern?: string) => Promise<{ files: FileInfo[] }>
    exists: (path: string) => Promise<{ exists: boolean }>
    mkdir: (path: string) => Promise<{ success: boolean }>
  }
  exec: {
    command: (command: string, cwd?: string) => Promise<CommandResult>
  }
  workspace: {
    get: () => Promise<{ path: string | null }>
    set: (path: string) => Promise<{ success: boolean }>
    select: () => Promise<{ path: string | null }>
  }
  ipc: {
    invoke: (channel: string, ...args: any[]) => Promise<any>
  }
  search: {
    query: (query: SearchQuery) => Promise<SearchResponse>
    rebuildIndex: () => Promise<{ success: boolean }>
  }
  attachments: {
    create: (data: NewAttachmentData) => Promise<any>
    getByMessageId: (messageId: string) => Promise<any[]>
    getPreviewsByMessageId: (messageId: string) => Promise<AttachmentPreview[]>
    getById: (id: string) => Promise<any>
    getBase64: (id: string) => Promise<string | null>
    updateNote: (id: string, note: string | null) => Promise<{ success: boolean }>
    delete: (id: string) => Promise<{ success: boolean }>
  }
}

declare global {
  interface Window {
    api: IpcApi
  }
}

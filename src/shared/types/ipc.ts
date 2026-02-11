import type { SearchQuery, SearchResponse } from './search'
import type { AttachmentPreview, NewAttachmentData } from './attachment'

// MCP Server State for IPC
export interface MCPServerState {
  config: {
    name: string
    command: string
    args?: string[]
    enabled: boolean
  }
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  tools: Array<{ name: string; description?: string; serverName: string }>
  error?: string
}

// Skills types
export interface SkillsDirectory {
  id: string
  path: string
  enabled: boolean
  createdAt: Date
}

export interface Skill {
  name: string
  description: string
  path: string
  directory: string
}

// Prompt Preset types
export interface PromptPreset {
  id: string
  name: string
  content: string
  createdAt: Date
  updatedAt: Date
}

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
  api: {
    getPort: () => Promise<number | null>
  }
  fs: {
    readFile: (path: string) => Promise<{ content: string }>
    writeFile: (path: string, content: string) => Promise<{ success: boolean }>
    editFile: (
      path: string,
      oldText: string,
      newText: string,
      replaceAll?: boolean
    ) => Promise<{ replaced: number }>
    glob: (pattern: string, path?: string) => Promise<{ files: string[] }>
    grep: (
      pattern: string,
      path?: string,
      options?: { glob?: string; ignoreCase?: boolean; maxResults?: number }
    ) => Promise<{ results: { file: string; line: number; content: string }[] }>
    listFiles: (path: string, pattern?: string) => Promise<{ files: FileInfo[] }>
    exists: (path: string) => Promise<{ exists: boolean }>
    mkdir: (path: string) => Promise<{ success: boolean }>
  }
  exec: {
    command: (command: string, cwd?: string) => Promise<CommandResult>
  }
  git: {
    status: (path?: string) => Promise<CommandResult>
    diff: (path?: string, staged?: boolean, file?: string) => Promise<CommandResult>
    log: (path?: string, maxCount?: number) => Promise<CommandResult>
    commit: (path: string | undefined, message: string, files?: string[]) => Promise<CommandResult>
    push: (path?: string, remote?: string, branch?: string) => Promise<CommandResult>
    checkout: (path: string | undefined, branch: string, create?: boolean) => Promise<CommandResult>
  }
  web: {
    fetch: (url: string, maxLength?: number) => Promise<{ content: string }>
    search: (
      query: string,
      limit?: number,
      recencyDays?: number,
      domains?: string[]
    ) => Promise<{ results: { title: string; url: string; snippet?: string }[] }>
  }
  workspace: {
    get: () => Promise<{ path: string | null }>
    set: (path: string) => Promise<{ success: boolean }>
    select: () => Promise<{ path: string | null }>
    createDefault: (conversationId: string) => Promise<{ path: string }>
    cleanup: (workspacePath: string) => Promise<{ deleted: boolean; reason: string }>
    cleanupOrphans: () => Promise<{
      deletedCount: number
      nonEmpty: Array<{ path: string; id: string; isEmpty: boolean }>
    }>
    forceDelete: (path: string) => Promise<{ deleted: boolean }>
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
  mcp: {
    getServerStates: () => Promise<MCPServerState[]>
  }
  dialog: {
    selectDirectory: () => Promise<string | null>
  }
  skills: {
    getDirectories: () => Promise<SkillsDirectory[]>
    addDirectory: (path: string) => Promise<SkillsDirectory>
    removeDirectory: (id: string) => Promise<{ success: boolean }>
    toggleDirectory: (id: string) => Promise<{ success: boolean }>
    getAll: () => Promise<Skill[]>
    getContent: (path: string) => Promise<string>
    getCount: (path: string) => Promise<number>
  }
  promptPresets: {
    getAll: () => Promise<PromptPreset[]>
    getById: (id: string) => Promise<PromptPreset | null>
    create: (data: { name: string; content: string }) => Promise<PromptPreset>
    update: (id: string, data: { name?: string; content?: string }) => Promise<PromptPreset | null>
    delete: (id: string) => Promise<{ success: boolean }>
  }
}

declare global {
  interface Window {
    api: IpcApi
  }
}

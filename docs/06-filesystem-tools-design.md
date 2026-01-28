# F004 - 文件系统工具设计文档

## 1. 功能概述

实现文件系统操作能力，使 AI 助手能够读取、写入、修改文件，执行编码任务。

### 核心功能
- 文件读取（支持文本文件）
- 文件写入/修改
- 文件/目录列表
- 工作目录管理
- 文件搜索
- 命令执行（需要用户授权）

## 2. 架构设计

### 2.1 整体架构

```
Renderer Process                Main Process
┌─────────────────┐            ┌──────────────────────┐
│  ChatStore      │            │  FileSystem Service  │
│  - sendMessage  │   IPC      │  - readFile()        │
│                 │◄──────────►│  - writeFile()       │
│  APIClient      │            │  - listFiles()       │
│  - sendMessage  │            │  - execCommand()     │
└─────────────────┘            └──────────────────────┘
         │                              │
         │ HTTP                         │
         ▼                              ▼
┌─────────────────┐            ┌──────────────────────┐
│  Hono API       │            │  Node.js fs/child_   │
│  - /chat/*      │            │  process modules     │
│  - /tools/*     │            │                      │
└─────────────────┘            └──────────────────────┘
         │
         ▼
┌─────────────────┐
│  AI Provider    │
│  (with tools)   │
└─────────────────┘
```

### 2.2 Tools 实现方式

采用 **Claude Function Calling** 方式：
- AI 助手根据用户请求决定调用哪些工具
- API 层负责执行工具调用
- 通过 IPC 与主进程的 FileSystem Service 通信
- 返回结果给 AI 继续处理

## 3. IPC 通信设计

### 3.1 通道定义

```typescript
// src/shared/types/ipc.ts

export interface IpcChannels {
  // 文件操作
  'fs:readFile': { path: string } => { content: string }
  'fs:writeFile': { path: string; content: string } => { success: boolean }
  'fs:listFiles': { path: string; pattern?: string } => { files: FileInfo[] }
  'fs:exists': { path: string } => { exists: boolean }
  'fs:mkdir': { path: string } => { success: boolean }

  // 命令执行（需要授权）
  'exec:command': { command: string; cwd?: string } => { output: string; error?: string }

  // 工作目录
  'workspace:get': {} => { path: string | null }
  'workspace:set': { path: string } => { success: boolean }
}

export interface FileInfo {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modifiedTime: number
}
```

### 3.2 Preload 脚本

```typescript
// src/preload/index.ts

import { contextBridge, ipcRenderer } from 'electron'

const api = {
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
  },
}

contextBridge.exposeInMainWorld('api', api)
```

## 4. 文件系统服务

### 4.1 主进程服务

```typescript
// src/main/services/fileSystemService.ts

import { promises as fs } from 'fs'
import { join, basename } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export class FileSystemService {
  private workspacePath: string | null = null

  async readFile(path: string): Promise<string> {
    try {
      const content = await fs.readFile(path, 'utf-8')
      return content
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`)
    }
  }

  async writeFile(path: string, content: string): Promise<boolean> {
    try {
      await fs.writeFile(path, content, 'utf-8')
      return true
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`)
    }
  }

  async listFiles(path: string, pattern?: string): Promise<FileInfo[]> {
    try {
      const entries = await fs.readdir(path, { withFileTypes: true })
      const files: FileInfo[] = []

      for (const entry of entries) {
        const fullPath = join(path, entry.name)
        const stats = await fs.stat(fullPath)

        if (!pattern || entry.name.includes(pattern)) {
          files.push({
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            modifiedTime: stats.mtimeMs,
          })
        }
      }

      return files
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`)
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.access(path)
      return true
    } catch {
      return false
    }
  }

  async mkdir(path: string): Promise<boolean> {
    try {
      await fs.mkdir(path, { recursive: true })
      return true
    } catch (error) {
      throw new Error(`Failed to create directory: ${error.message}`)
    }
  }

  async executeCommand(command: string, cwd?: string): Promise<{ output: string; error?: string }> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || this.workspacePath || process.cwd(),
        timeout: 30000, // 30s timeout
      })

      return {
        output: stdout,
        error: stderr || undefined,
      }
    } catch (error) {
      return {
        output: '',
        error: error.message,
      }
    }
  }

  getWorkspace(): string | null {
    return this.workspacePath
  }

  setWorkspace(path: string): boolean {
    this.workspacePath = path
    return true
  }
}
```

### 4.2 IPC 处理器注册

```typescript
// src/main/ipcHandlers.ts

import { ipcMain } from 'electron'
import { FileSystemService } from './services/fileSystemService'

const fsService = new FileSystemService()

export function registerIpcHandlers() {
  // 文件操作
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

  // 命令执行
  ipcMain.handle('exec:command', async (_, { command, cwd }) => {
    return await fsService.executeCommand(command, cwd)
  })

  // 工作目录
  ipcMain.handle('workspace:get', () => {
    const path = fsService.getWorkspace()
    return { path }
  })

  ipcMain.handle('workspace:set', (_, { path }) => {
    const success = fsService.setWorkspace(path)
    return { success }
  })
}
```

## 5. AI Tools 集成

### 5.1 Tool 定义

```typescript
// src/api/services/ai/tools/definitions.ts

export const fileSystemTools = [
  {
    name: 'read_file',
    description: 'Read the contents of a text file',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The absolute path to the file to read',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file (creates or overwrites)',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The absolute path to the file to write',
        },
        content: {
          type: 'string',
          description: 'The content to write to the file',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'list_files',
    description: 'List files and directories in a given path',
    input_schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'The directory path to list',
        },
        pattern: {
          type: 'string',
          description: 'Optional pattern to filter files',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'execute_command',
    description: 'Execute a shell command (requires user approval)',
    input_schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'The command to execute',
        },
        cwd: {
          type: 'string',
          description: 'Optional working directory',
        },
      },
      required: ['command'],
    },
  },
]
```

### 5.2 Tool 执行器

```typescript
// src/api/services/ai/tools/executor.ts

import axios from 'axios'

const IPC_API_BASE = 'http://localhost:3001' // IPC bridge server

export class ToolExecutor {
  async execute(toolName: string, input: any): Promise<any> {
    switch (toolName) {
      case 'read_file':
        return await this.readFile(input.path)

      case 'write_file':
        return await this.writeFile(input.path, input.content)

      case 'list_files':
        return await this.listFiles(input.path, input.pattern)

      case 'execute_command':
        return await this.executeCommand(input.command, input.cwd)

      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  }

  private async readFile(path: string): Promise<string> {
    const response = await axios.post(`${IPC_API_BASE}/ipc/fs:readFile`, { path })
    return response.data.content
  }

  private async writeFile(path: string, content: string): Promise<boolean> {
    const response = await axios.post(`${IPC_API_BASE}/ipc/fs:writeFile`, { path, content })
    return response.data.success
  }

  private async listFiles(path: string, pattern?: string): Promise<any[]> {
    const response = await axios.post(`${IPC_API_BASE}/ipc/fs:listFiles`, { path, pattern })
    return response.data.files
  }

  private async executeCommand(command: string, cwd?: string): Promise<any> {
    const response = await axios.post(`${IPC_API_BASE}/ipc/exec:command`, { command, cwd })
    return response.data
  }
}
```

## 6. Claude Provider 更新

更新 ClaudeProvider 支持 function calling：

```typescript
// src/api/services/ai/providers/claude.ts (updated)

import { fileSystemTools } from '../tools/definitions'
import { ToolExecutor } from '../tools/executor'

async sendMessage(
  messages: AIMessage[],
  config: AIConfig,
  onChunk?: (chunk: AIStreamChunk) => void
): Promise<string> {
  const client = new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  })

  const toolExecutor = new ToolExecutor()

  try {
    let response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature || 1,
      messages: messages.map((m) => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content,
      })),
      tools: fileSystemTools, // Add tools
    })

    // Handle tool calls
    while (response.stop_reason === 'tool_use') {
      const toolUse = response.content.find((block) => block.type === 'tool_use')

      if (toolUse) {
        const toolResult = await toolExecutor.execute(toolUse.name, toolUse.input)

        // Continue conversation with tool result
        response = await client.messages.create({
          model: config.model,
          max_tokens: config.maxTokens || 4096,
          messages: [
            ...messages,
            { role: 'assistant', content: response.content },
            {
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: JSON.stringify(toolResult),
                }
              ]
            },
          ],
          tools: fileSystemTools,
        })
      }
    }

    const content = response.content.find((block) => block.type === 'text')
    return content ? content.text : ''
  } catch (error) {
    this.logError(error)
    throw error
  }
}
```

## 7. IPC Bridge Server

为了让 Hono API 访问主进程的 IPC，创建一个简单的 HTTP bridge：

```typescript
// src/main/ipcBridge.ts

import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { FileSystemService } from './services/fileSystemService'

const app = new Hono()
const fsService = new FileSystemService()

app.post('/ipc/:channel', async (c) => {
  const channel = c.req.param('channel')
  const body = await c.req.json()

  try {
    let result: any

    switch (channel) {
      case 'fs:readFile':
        result = { content: await fsService.readFile(body.path) }
        break
      case 'fs:writeFile':
        result = { success: await fsService.writeFile(body.path, body.content) }
        break
      case 'fs:listFiles':
        result = { files: await fsService.listFiles(body.path, body.pattern) }
        break
      case 'fs:exists':
        result = { exists: await fsService.exists(body.path) }
        break
      case 'fs:mkdir':
        result = { success: await fsService.mkdir(body.path) }
        break
      case 'exec:command':
        result = await fsService.executeCommand(body.command, body.cwd)
        break
      case 'workspace:get':
        result = { path: fsService.getWorkspace() }
        break
      case 'workspace:set':
        result = { success: fsService.setWorkspace(body.path) }
        break
      default:
        return c.json({ error: 'Unknown channel' }, 400)
    }

    return c.json(result)
  } catch (error) {
    return c.json({ error: error.message }, 500)
  }
})

export function startIpcBridge(port = 3001): void {
  console.log(`🔗 Starting IPC Bridge on port ${port}...`)

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`✅ IPC Bridge running at http://localhost:${info.port}`)
  })
}
```

## 8. 实现步骤

1. ✅ 创建设计文档
2. 创建 IPC 类型定义
3. 实现 FileSystemService
4. 实现 IPC Bridge Server
5. 更新 Preload 脚本
6. 注册 IPC 处理器
7. 创建 Tool 定义和执行器
8. 更新 ClaudeProvider 支持 tools
9. 创建 Workspace 选择 UI
10. 测试文件操作功能

## 9. 安全考虑

- 命令执行需要用户确认
- 限制文件访问范围（仅工作目录内）
- 命令超时保护（30s）
- 敏感命令黑名单（rm -rf /, dd, etc.）
- 文件大小限制（读取最大 10MB）

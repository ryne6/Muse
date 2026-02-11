import axios from 'axios'
import { TOOL_PERMISSION_PREFIX } from '@shared/types/toolPermissions'
import type { PermissionRule, HooksConfig } from '@shared/types/toolPermissions'
import { PermissionEngine } from '@shared/permissions/engine'

// Lazy-loaded MCP manager to avoid SDK side effects at import time
let mcpManagerInstance: typeof import('../../mcp/manager').mcpManager | null = null

async function getMcpManager() {
  if (!mcpManagerInstance) {
    const { mcpManager } = await import('../../mcp/manager')
    mcpManagerInstance = mcpManager
  }
  return mcpManagerInstance
}

// 模块级单例
const permissionEngine = new PermissionEngine()

export interface ToolExecutionOptions {
  toolCallId?: string
  toolPermissions?: { allowAll: boolean }
  allowOnceTools?: string[]
  // P0 新增
  sessionApprovedTools?: Set<string>
  // P1 新增
  permissionRules?: PermissionRule[]
  // P2 预留
  hooks?: HooksConfig
  sandboxMode?: 'read-only' | 'workspace-write' | 'full-access'
}

const IPC_BRIDGE_BASE = 'http://localhost:3001'

const TODO_STATUS_MARKERS: Record<string, string> = {
  todo: ' ',
  in_progress: '~',
  done: 'x',
}

export class ToolExecutor {
  async execute(toolName: string, input: any, options: ToolExecutionOptions = {}): Promise<string> {
    const decision = permissionEngine.evaluate(toolName, input, {
      allowAll: options.toolPermissions?.allowAll ?? false,
      allowOnceTools: options.allowOnceTools,
      sessionApprovedTools: options.sessionApprovedTools,
      permissionRules: options.permissionRules,
    })

    if (decision.action === 'deny') {
      return `Error: Tool "${toolName}" was denied. ${decision.reason || ''}`
    }

    if (decision.action === 'ask') {
      const payload = {
        kind: 'permission_request',
        toolName,
        toolCallId: options.toolCallId,
      }
      return `${TOOL_PERMISSION_PREFIX}${JSON.stringify(payload)}`
    }

    // decision.action === 'allow' → 继续执行

    // Initialize MCP manager and check for MCP tools
    const mcpManager = await getMcpManager()
    if (mcpManager.isMCPTool(toolName)) {
      try {
        return await mcpManager.callTool(toolName, input)
      } catch (error: any) {
        return `Error: ${error.message || 'MCP tool execution failed'}`
      }
    }

    try {
      switch (toolName) {
        case 'Read':
          return await this.readFile(input.path)

        case 'Write':
          return await this.writeFile(input.path, input.content)

        case 'Edit':
          return await this.editFile(
            input.path,
            input.old_text,
            input.new_text,
            input.replace_all
          )

        case 'LS':
          return await this.listFiles(input.path, input.pattern)

        case 'Bash':
          return await this.executeCommand(input.command, input.cwd)

        case 'TodoWrite':
          return this.formatTodoList(input)

        case 'Glob':
          return await this.globFiles(input.pattern, input.path)

        case 'Grep':
          return await this.grepFiles(input)

        case 'GitStatus':
          return await this.gitCommand('git:status', { path: input?.path })

        case 'GitDiff':
          return await this.gitCommand('git:diff', {
            path: input?.path,
            staged: input?.staged,
            file: input?.file,
          })

        case 'GitLog':
          return await this.gitCommand('git:log', {
            path: input?.path,
            maxCount: input?.maxCount,
          })

        case 'GitCommit':
          return await this.gitCommand('git:commit', {
            path: input?.path,
            message: input?.message,
            files: input?.files,
          })

        case 'GitPush':
          return await this.gitCommand('git:push', {
            path: input?.path,
            remote: input?.remote,
            branch: input?.branch,
          })

        case 'GitCheckout':
          return await this.gitCommand('git:checkout', {
            path: input?.path,
            branch: input?.branch,
            create: input?.create,
          })

        case 'WebFetch':
          return await this.webFetch(input?.url, input?.maxLength)

        case 'WebSearch':
          return await this.webSearch(input)

        default:
          throw new Error(`Unknown tool: ${toolName}`)
      }
    } catch (error: any) {
      return `Error: ${error.message || 'Tool execution failed'}`
    }
  }

  private async readFile(path: string): Promise<string> {
    try {
      const response = await axios.post(`${IPC_BRIDGE_BASE}/ipc/fs:readFile`, { path })
      return response.data.content
    } catch (error: any) {
      throw new Error(`Failed to read file: ${error.response?.data?.error || error.message}`)
    }
  }

  private async writeFile(path: string, content: string): Promise<string> {
    try {
      const response = await axios.post(`${IPC_BRIDGE_BASE}/ipc/fs:writeFile`, {
        path,
        content,
      })

      if (response.data.success) {
        return `Successfully wrote ${content.length} characters to ${path}`
      } else {
        throw new Error('Write operation returned false')
      }
    } catch (error: any) {
      throw new Error(`Failed to write file: ${error.response?.data?.error || error.message}`)
    }
  }

  private async editFile(
    path: string,
    oldText: string,
    newText: string,
    replaceAll?: boolean
  ): Promise<string> {
    try {
      const response = await axios.post(`${IPC_BRIDGE_BASE}/ipc/fs:editFile`, {
        path,
        oldText,
        newText,
        replaceAll,
      })

      const replaced = response.data.replaced
      return `Replaced ${replaced} occurrence${replaced === 1 ? '' : 's'} in ${path}`
    } catch (error: any) {
      throw new Error(`Failed to edit file: ${error.response?.data?.error || error.message}`)
    }
  }

  private formatTodoList(input: any): string {
    const todos = Array.isArray(input?.todos) ? input.todos : null
    if (!todos) {
      throw new Error('Todos must be provided as an array')
    }

    const lines = todos.map((todo: any) => {
      const marker = TODO_STATUS_MARKERS[todo.status]
      if (!marker) {
        throw new Error(`Invalid todo status: ${todo.status}`)
      }

      const title = todo.title ?? ''
      const mainLine = `- [${marker}] ${title}`
      const notes = typeof todo.notes === 'string' && todo.notes.trim().length > 0
        ? `\n  - ${todo.notes.trim()}`
        : ''
      return `${mainLine}${notes}`
    })

    return lines.join('\n')
  }

  private async globFiles(pattern: string, path?: string): Promise<string> {
    try {
      const response = await axios.post(`${IPC_BRIDGE_BASE}/ipc/fs:glob`, {
        pattern,
        path,
      })
      const files = response.data.files || []
      if (files.length === 0) {
        return 'No matches found.'
      }
      return files.join('\n')
    } catch (error: any) {
      throw new Error(`Failed to glob files: ${error.response?.data?.error || error.message}`)
    }
  }

  private async grepFiles(input: any): Promise<string> {
    try {
      const response = await axios.post(`${IPC_BRIDGE_BASE}/ipc/fs:grep`, {
        pattern: input?.pattern,
        path: input?.path,
        glob: input?.glob,
        ignoreCase: input?.ignoreCase,
        maxResults: input?.maxResults,
      })
      const results = response.data.results || []
      if (results.length === 0) {
        return 'No matches found.'
      }
      return results
        .map((result: any) => `${result.file}:${result.line} ${result.content}`)
        .join('\n')
    } catch (error: any) {
      throw new Error(`Failed to grep files: ${error.response?.data?.error || error.message}`)
    }
  }

  private async gitCommand(channel: string, payload: Record<string, any>): Promise<string> {
    try {
      const response = await axios.post(`${IPC_BRIDGE_BASE}/ipc/${channel}`, payload)
      const output = response.data.output ?? ''
      const error = response.data.error
      if (error) {
        return output ? `${output}\n${error}` : error
      }
      return output
    } catch (error: any) {
      throw new Error(`Failed to run git command: ${error.response?.data?.error || error.message}`)
    }
  }

  private async webFetch(url: string, maxLength?: number): Promise<string> {
    try {
      const response = await axios.post(`${IPC_BRIDGE_BASE}/ipc/web:fetch`, {
        url,
        maxLength,
      })
      return response.data.content
    } catch (error: any) {
      throw new Error(`Failed to fetch URL: ${error.response?.data?.error || error.message}`)
    }
  }

  private async webSearch(input: any): Promise<string> {
    try {
      const response = await axios.post(`${IPC_BRIDGE_BASE}/ipc/web:search`, {
        query: input?.query,
        limit: input?.limit,
        recencyDays: input?.recencyDays,
        domains: input?.domains,
      })
      const results = response.data.results || []
      if (results.length === 0) {
        return 'No results found.'
      }
      return results
        .map((result: any, index: number) => {
          const lines = [`${index + 1}. ${result.title}`]
          if (result.url) lines.push(`   ${result.url}`)
          if (result.snippet) lines.push(`   ${result.snippet}`)
          return lines.join('\n')
        })
        .join('\n')
    } catch (error: any) {
      throw new Error(`Failed to search web: ${error.response?.data?.error || error.message}`)
    }
  }

  private async listFiles(path: string, pattern?: string): Promise<string> {
    try {
      const response = await axios.post(`${IPC_BRIDGE_BASE}/ipc/fs:listFiles`, {
        path,
        pattern,
      })

      const files = response.data.files
      if (files.length === 0) {
        return `Directory ${path} is empty or no files match the pattern`
      }

      const fileList = files
        .map((file: any) => {
          const type = file.isDirectory ? '[DIR]' : '[FILE]'
          const size = file.isDirectory ? '' : `(${this.formatSize(file.size)})`
          return `${type} ${file.name} ${size}`
        })
        .join('\n')

      return `Contents of ${path}:\n${fileList}`
    } catch (error: any) {
      throw new Error(`Failed to list files: ${error.response?.data?.error || error.message}`)
    }
  }

  private async executeCommand(command: string, cwd?: string): Promise<string> {
    try {
      const response = await axios.post(`${IPC_BRIDGE_BASE}/ipc/exec:command`, {
        command,
        cwd,
      })

      const result = response.data
      let output = `Command: ${command}\n`

      if (result.output) {
        output += `\nOutput:\n${result.output}`
      }

      if (result.error) {
        output += `\nError/Warning:\n${result.error}`
      }

      return output
    } catch (error: any) {
      throw new Error(`Failed to execute command: ${error.response?.data?.error || error.message}`)
    }
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }
}

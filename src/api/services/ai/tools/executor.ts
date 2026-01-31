import axios from 'axios'

const IPC_BRIDGE_BASE = 'http://localhost:3001'

const TODO_STATUS_MARKERS: Record<string, string> = {
  todo: ' ',
  in_progress: '~',
  done: 'x',
}

export class ToolExecutor {
  async execute(toolName: string, input: any): Promise<string> {
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

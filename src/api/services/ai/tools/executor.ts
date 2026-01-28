import axios from 'axios'

const IPC_BRIDGE_BASE = 'http://localhost:3001'

export class ToolExecutor {
  async execute(toolName: string, input: any): Promise<string> {
    try {
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

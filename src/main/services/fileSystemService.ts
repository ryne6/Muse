import { promises as fs } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import type { FileInfo, CommandResult } from '../../shared/types/ipc'

const execAsync = promisify(exec)

export class FileSystemService {
  private workspacePath: string | null = null

  async readFile(path: string): Promise<string> {
    try {
      // Security: Limit file size to 10MB
      const stats = await fs.stat(path)
      if (stats.size > 10 * 1024 * 1024) {
        throw new Error('File too large (max 10MB)')
      }

      const content = await fs.readFile(path, 'utf-8')
      return content
    } catch (error: any) {
      throw new Error(`Failed to read file: ${error.message}`)
    }
  }

  async writeFile(path: string, content: string): Promise<boolean> {
    try {
      await fs.writeFile(path, content, 'utf-8')
      return true
    } catch (error: any) {
      throw new Error(`Failed to write file: ${error.message}`)
    }
  }

  async listFiles(path: string, pattern?: string): Promise<FileInfo[]> {
    try {
      const entries = await fs.readdir(path, { withFileTypes: true })
      const files: FileInfo[] = []

      for (const entry of entries) {
        // Skip hidden files and node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue
        }

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

      return files.sort((a, b) => {
        // Directories first, then alphabetically
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
    } catch (error: any) {
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
    } catch (error: any) {
      throw new Error(`Failed to create directory: ${error.message}`)
    }
  }

  async executeCommand(command: string, cwd?: string): Promise<CommandResult> {
    try {
      // Security: Basic command blacklist
      const dangerousCommands = ['rm -rf /', 'dd ', 'mkfs.', 'format ', ':(){:|:&};:']
      if (dangerousCommands.some((cmd) => command.includes(cmd))) {
        throw new Error('Dangerous command blocked')
      }

      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || this.workspacePath || process.cwd(),
        timeout: 30000, // 30s timeout
        maxBuffer: 1024 * 1024, // 1MB max output
      })

      return {
        output: stdout,
        error: stderr || undefined,
      }
    } catch (error: any) {
      return {
        output: '',
        error: error.message || 'Command execution failed',
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

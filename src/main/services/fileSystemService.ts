import { promises as fs } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import fg from 'fast-glob'
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

  async glob(pattern: string, basePath?: string): Promise<string[]> {
    try {
      const cwd = basePath || this.workspacePath || process.cwd()
      const files = await fg(pattern, {
        cwd,
        ignore: ['**/node_modules/**', '**/.git/**'],
        absolute: true,
        onlyFiles: true,
      })
      return files.slice(0, 500)
    } catch (error: any) {
      throw new Error(`Failed to glob files: ${error.message}`)
    }
  }

  async grep(
    pattern: string,
    basePath?: string,
    options?: { glob?: string; ignoreCase?: boolean; maxResults?: number }
  ): Promise<{ file: string; line: number; content: string }[]> {
    try {
      const files = await this.glob(options?.glob || '**/*', basePath)
      const flags = options?.ignoreCase ? 'i' : ''
      const results: { file: string; line: number; content: string }[] = []
      const limit = options?.maxResults ?? 100

      for (const file of files) {
        if (results.length >= limit) break
        try {
          const content = await fs.readFile(file, 'utf-8')
          content.split('\n').forEach((line, index) => {
            if (results.length >= limit) return
            const lineRegex = new RegExp(pattern, flags)
            if (lineRegex.test(line)) {
              results.push({ file, line: index + 1, content: line.trim() })
            }
          })
        } catch {
          // skip unreadable files
        }
      }

      return results
    } catch (error: any) {
      throw new Error(`Failed to grep files: ${error.message}`)
    }
  }

  async editFile(
    path: string,
    oldText: string,
    newText: string,
    replaceAll = false
  ): Promise<number> {
    try {
      if (!oldText) {
        throw new Error('oldText must be a non-empty string')
      }

      const stats = await fs.stat(path)
      if (stats.size > 10 * 1024 * 1024) {
        throw new Error('File too large (max 10MB)')
      }

      const content = await fs.readFile(path, 'utf-8')
      if (!content.includes(oldText)) {
        throw new Error('Text not found in file')
      }

      let replaced = 0
      let updated = content

      if (replaceAll) {
        const parts = content.split(oldText)
        replaced = parts.length - 1
        updated = parts.join(newText)
      } else {
        const index = content.indexOf(oldText)
        if (index >= 0) {
          replaced = 1
          updated =
            content.slice(0, index) +
            newText +
            content.slice(index + oldText.length)
        }
      }

      await fs.writeFile(path, updated, 'utf-8')
      return replaced
    } catch (error: any) {
      throw new Error(`Failed to edit file: ${error.message}`)
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
      const dangerousCommands = [
        'rm -rf /',
        'dd ',
        'mkfs.',
        'format ',
        ':(){:|:&};:',
      ]
      if (dangerousCommands.some(cmd => command.includes(cmd))) {
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

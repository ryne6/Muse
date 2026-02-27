import { promises as fs } from 'fs'
import { join, basename, resolve } from 'path'
import { homedir } from 'os'
import { existsSync, mkdirSync } from 'fs'

// Default memory directory paths
const USER_MEMORY_DIR = join(homedir(), '.crow', 'memory')

export interface MemoryFrontmatter {
  type?: string
  tags?: string[]
  updatedAt?: string
  source?: string
}

export class MemoryFileService {
  // File write lock map to prevent concurrent writes to the same file
  private static writeLocks = new Map<string, Promise<void>>()

  /**
   * Acquire a per-file lock to serialize write operations and prevent race conditions.
   */
  static async withFileLock<T>(
    filePath: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const key = resolve(filePath)
    const prev = this.writeLocks.get(key) || Promise.resolve()
    let releaseFn: () => void
    const next = new Promise<void>(r => {
      releaseFn = r
    })
    this.writeLocks.set(key, next)
    await prev
    try {
      return await fn()
    } finally {
      releaseFn!()
    }
  }

  /**
   * Validate that a file path is within allowed memory directories.
   * Prevents path traversal attacks.
   */
  private static isPathSafe(filePath: string): boolean {
    const resolved = resolve(filePath)
    const userDir = resolve(USER_MEMORY_DIR)
    // Allow paths under user memory dir
    if (resolved.startsWith(userDir + '/') || resolved === userDir) return true
    // Allow paths that contain .crow/memory/ (project dirs)
    if (resolved.includes(join('.crow', 'memory'))) return true
    return false
  }

  private static assertPathSafe(filePath: string): void {
    if (!this.isPathSafe(filePath)) {
      throw new Error(`Path traversal blocked: ${filePath}`)
    }
  }

  /**
   * Ensure a directory exists, creating it recursively if needed
   */
  static ensureDirectory(dirPath: string): void {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true })
    }
  }

  /**
   * Get the user-level memory directory path
   */
  static getUserMemoryDir(): string {
    return USER_MEMORY_DIR
  }

  /**
   * Get the project-level memory directory path
   */
  static getProjectMemoryDir(workspacePath: string): string {
    return join(workspacePath, '.crow', 'memory')
  }

  /**
   * Append content to a memory markdown file
   */
  static async appendToFile(
    filePath: string,
    content: string,
    frontmatter?: MemoryFrontmatter
  ): Promise<void> {
    this.assertPathSafe(filePath)
    return this.withFileLock(filePath, async () => {
      this.ensureDirectory(join(filePath, '..'))

      let existing = ''
      try {
        existing = await fs.readFile(filePath, 'utf-8')
      } catch {
        // File doesn't exist yet, start fresh
      }

      const entry = this.formatEntry(content, frontmatter)

      if (existing.length > 0) {
        await fs.writeFile(
          filePath,
          existing.trimEnd() + '\n\n' + entry + '\n',
          'utf-8'
        )
      } else {
        // New file: add a title based on filename
        const title = basename(filePath, '.md')
        const header = `# ${title.charAt(0).toUpperCase() + title.slice(1)}\n\n`
        await fs.writeFile(filePath, header + entry + '\n', 'utf-8')
      }
    })
  }

  /**
   * Sync a memory record to the appropriate .md file based on type/category mapping
   */
  static async syncMemoryToFile(
    memory: {
      type: string
      category: string
      content: string
      source: string
      tags?: string[]
    },
    workspacePath?: string
  ): Promise<string> {
    // conversation type memories don't get written to files
    if (memory.type === 'conversation') return ''

    const filePath = this.resolveFilePath(
      memory.type,
      memory.category,
      workspacePath
    )
    if (!filePath) return ''

    const frontmatter: MemoryFrontmatter = {
      source: memory.source,
      tags: memory.tags,
      updatedAt: new Date().toISOString(),
    }

    await this.appendToFile(filePath, memory.content, frontmatter)
    return filePath
  }

  /**
   * Resolve the target .md file path based on type and category
   */
  static resolveFilePath(
    type: string,
    category: string,
    workspacePath?: string
  ): string | null {
    if (type === 'user') {
      const dir = this.getUserMemoryDir()
      switch (category) {
        case 'preference':
          return join(dir, 'preferences.md')
        case 'pattern':
          return join(dir, 'patterns.md')
        default:
          return join(dir, 'notes.md')
      }
    }

    if (type === 'project') {
      if (!workspacePath) return null
      const dir = this.getProjectMemoryDir(workspacePath)
      switch (category) {
        case 'knowledge':
          return join(dir, 'architecture.md')
        case 'decision':
          return join(dir, 'decisions.md')
        case 'pattern':
          return join(dir, 'conventions.md')
        default:
          return join(dir, 'context.md')
      }
    }

    return null
  }

  /**
   * Remove content from a memory markdown file
   */
  static async removeFromFile(
    filePath: string,
    content: string
  ): Promise<boolean> {
    this.assertPathSafe(filePath)
    return this.withFileLock(filePath, async () => {
      try {
        const existing = await fs.readFile(filePath, 'utf-8')
        if (!existing.includes(content)) return false

        // Use block-aware removal: find the content and its surrounding frontmatter block.
        // A memory entry may be wrapped in --- frontmatter --- ... content, so we remove
        // the entire block rather than just the content substring to avoid partial corruption.
        const lines = existing.split('\n')
        const contentLines = content.split('\n')
        const firstLine = contentLines[0]

        let startIdx = -1
        let endIdx = -1

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim() === firstLine.trim()) {
            // Check if all content lines match
            const allMatch = contentLines.every(
              (cl, j) =>
                i + j < lines.length && lines[i + j].trim() === cl.trim()
            )
            if (allMatch) {
              endIdx = i + contentLines.length - 1
              // Walk backwards to find frontmatter start (---)
              startIdx = i
              for (let j = i - 1; j >= 0; j--) {
                if (lines[j].trim() === '---') {
                  // Check if this is the closing --- of a frontmatter block
                  for (let k = j - 1; k >= 0; k--) {
                    if (lines[k].trim() === '---') {
                      startIdx = k
                      break
                    }
                    if (lines[k].trim() === '') continue
                    break
                  }
                  break
                }
                if (lines[j].trim() === '') continue
                break
              }
              break
            }
          }
        }

        if (endIdx === -1) {
          // Fallback: simple replace (single occurrence only)
          const idx = existing.indexOf(content)
          if (idx === -1) return false
          const updated = (
            existing.slice(0, idx) + existing.slice(idx + content.length)
          )
            .replace(/\n{3,}/g, '\n\n')
            .trim()
          await fs.writeFile(filePath, updated + '\n', 'utf-8')
          return true
        }

        lines.splice(startIdx, endIdx - startIdx + 1)
        const updated = lines
          .join('\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim()
        await fs.writeFile(filePath, updated + '\n', 'utf-8')
        return true
      } catch {
        return false
      }
    })
  }

  /**
   * Read a single .md memory file, parsing frontmatter and content
   */
  static async readMemoryFile(filePath: string): Promise<{
    filePath: string
    filename: string
    frontmatter: MemoryFrontmatter
    content: string
  } | null> {
    try {
      this.assertPathSafe(filePath)
      if (!existsSync(filePath)) return null
      const raw = await fs.readFile(filePath, 'utf-8')
      const { frontmatter, content } = this.parseFrontmatter(raw)
      return {
        filePath,
        filename: basename(filePath),
        frontmatter,
        content,
      }
    } catch {
      return null
    }
  }

  /**
   * Read all .md memory files from a directory
   */
  static async readAllMemoryFiles(dirPath: string): Promise<
    Array<{
      filePath: string
      filename: string
      frontmatter: MemoryFrontmatter
      content: string
    }>
  > {
    if (!existsSync(dirPath)) return []

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      const results: Array<{
        filePath: string
        filename: string
        frontmatter: MemoryFrontmatter
        content: string
      }> = []

      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue
        const parsed = await this.readMemoryFile(join(dirPath, entry.name))
        if (parsed) results.push(parsed)
      }

      return results
    } catch {
      return []
    }
  }

  /**
   * Parse frontmatter from a markdown memory entry
   */
  static parseFrontmatter(text: string): {
    frontmatter: MemoryFrontmatter
    content: string
  } {
    const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/
    const match = text.match(fmRegex)

    if (!match) {
      return { frontmatter: {}, content: text }
    }

    const frontmatter: MemoryFrontmatter = {}
    const lines = match[1].split('\n')

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':')
      if (!key || valueParts.length === 0) continue

      const value = valueParts.join(':').trim()
      switch (key.trim()) {
        case 'type':
          frontmatter.type = value
          break
        case 'source':
          frontmatter.source = value
          break
        case 'updatedAt':
          frontmatter.updatedAt = value
          break
        case 'tags':
          frontmatter.tags = value
            .replace(/[\[\]]/g, '')
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0)
          break
      }
    }

    return { frontmatter, content: match[2].trim() }
  }

  /**
   * Format a memory entry with optional frontmatter
   */
  private static formatEntry(
    content: string,
    frontmatter?: MemoryFrontmatter
  ): string {
    if (!frontmatter) return content

    const lines: string[] = ['---']
    if (frontmatter.type) lines.push(`type: ${frontmatter.type}`)
    if (frontmatter.tags && frontmatter.tags.length > 0) {
      lines.push(`tags: [${frontmatter.tags.join(', ')}]`)
    }
    if (frontmatter.source) lines.push(`source: ${frontmatter.source}`)
    lines.push(
      `updatedAt: ${frontmatter.updatedAt || new Date().toISOString()}`
    )
    lines.push('---')
    lines.push(content)

    return lines.join('\n')
  }
}

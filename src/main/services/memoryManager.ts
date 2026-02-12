import { MemoryService } from '../db/services/memoryService'
import { MemoryFileService } from './memoryFileService'

// Token budget constants (1 token ≈ 4 characters)
const CHARS_PER_TOKEN = 4
const USER_TOKEN_BUDGET = 600
const PROJECT_TOKEN_BUDGET = 800
const CONVERSATION_TOKEN_BUDGET = 600

// Decay: memories not accessed in this many days get deprioritized
const DECAY_DAYS = 30

interface MemorySection {
  title: string
  items: string[]
}

export class MemoryManager {
  /**
   * Get relevant memories and format them for system prompt injection.
   * Returns a formatted markdown string ready to append to systemPrompt.
   */
  static async getRelevantMemories(
    workspacePath: string | null,
    userMessage: string
  ): Promise<string> {
    const sections: MemorySection[] = []

    // 1. Load user-level memories from ~/.muse/memory/*.md
    const userItems = await this.loadUserMemories()

    // 2. Load project-level memories from workspace/.muse/memory/*.md
    const projectItems = workspacePath ? await this.loadProjectMemories(workspacePath) : []

    // 3. FTS5 search for relevant conversation memories (with decay-aware sorting)
    const conversationItems = await this.searchConversationMemories(userMessage)

    // 4. Truncate each section to its token budget
    const truncatedUser = this.truncateToTokenBudget(userItems, USER_TOKEN_BUDGET)
    const truncatedProject = this.truncateToTokenBudget(projectItems, PROJECT_TOKEN_BUDGET)
    const truncatedConversation = this.truncateToTokenBudget(
      conversationItems,
      CONVERSATION_TOKEN_BUDGET
    )

    // 5. Build sections (only include non-empty ones)
    if (truncatedUser.length > 0) {
      sections.push({ title: 'User Preferences', items: truncatedUser })
    }
    if (truncatedProject.length > 0) {
      sections.push({ title: 'Project Knowledge', items: truncatedProject })
    }
    if (truncatedConversation.length > 0) {
      sections.push({ title: 'Relevant Context', items: truncatedConversation })
    }

    if (sections.length === 0) return ''

    // 6. Format output
    return this.formatMemoryBlock(sections)
  }

  /**
   * Load user-level memories from markdown files
   */
  private static async loadUserMemories(): Promise<string[]> {
    const userDir = MemoryFileService.getUserMemoryDir()
    const files = await MemoryFileService.readAllMemoryFiles(userDir)
    return this.extractItemsFromFiles(files)
  }

  /**
   * Load project-level memories from markdown files
   */
  private static async loadProjectMemories(workspacePath: string): Promise<string[]> {
    const projectDir = MemoryFileService.getProjectMemoryDir(workspacePath)
    const files = await MemoryFileService.readAllMemoryFiles(projectDir)
    return this.extractItemsFromFiles(files)
  }

  /**
   * Search conversation memories using FTS5.
   * Only returns memories with a conversationId (auto-extracted from conversations),
   * since user/project memories are already loaded from .md files above.
   * Applies decay: deprioritizes memories not accessed in DECAY_DAYS.
   */
  private static async searchConversationMemories(userMessage: string): Promise<string[]> {
    if (!userMessage.trim()) return []

    try {
      const results = await MemoryService.search(userMessage)
      const now = Date.now()
      const decayCutoff = now - DECAY_DAYS * 86400000

      // Filter to conversation-specific memories and apply decay sorting
      const filtered = results
        .filter((r) => r.conversationId != null)
        .map((r) => {
          const accessTime = r.lastAccessedAt
            ? (r.lastAccessedAt instanceof Date ? r.lastAccessedAt.getTime() : Number(r.lastAccessedAt) * 1000)
            : 0
          const isStale = accessTime < decayCutoff
          return { content: r.content, id: r.id, isStale }
        })

      // Fresh memories first, stale ones last
      filtered.sort((a, b) => (a.isStale === b.isStale ? 0 : a.isStale ? 1 : -1))

      // Touch access time for the memories we're about to inject
      const idsToTouch = filtered.slice(0, 10).map((r) => r.id)
      if (idsToTouch.length > 0) {
        MemoryService.touchAccessTime(idsToTouch).catch(() => {})
      }

      return filtered.slice(0, 10).map((r) => r.content)
    } catch {
      return []
    }
  }

  /**
   * Extract bullet-point items from markdown file contents
   */
  private static extractItemsFromFiles(
    files: Array<{ content: string }>
  ): string[] {
    const items: string[] = []

    for (const file of files) {
      const { content } = MemoryFileService.parseFrontmatter(file.content)
      // Extract lines that look like content (skip headers and empty lines)
      const lines = content.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (trimmed.startsWith('#')) continue
        if (trimmed.startsWith('---')) continue
        // Strip leading bullet markers for uniform output
        const cleaned = trimmed.replace(/^[-*]\s+/, '')
        if (cleaned.length > 0) {
          items.push(cleaned)
        }
      }
    }

    return items
  }

  /**
   * Truncate items to fit within a token budget
   */
  private static truncateToTokenBudget(items: string[], tokenBudget: number): string[] {
    const charBudget = tokenBudget * CHARS_PER_TOKEN
    const result: string[] = []
    let totalChars = 0

    for (const item of items) {
      const itemChars = item.length + 2 // +2 for "- " prefix
      if (totalChars + itemChars > charBudget) break
      result.push(item)
      totalChars += itemChars
    }

    return result
  }

  /**
   * Format memory sections into the injection block
   */
  private static formatMemoryBlock(sections: MemorySection[]): string {
    const lines: string[] = ['## Memory', '']

    for (const section of sections) {
      lines.push(`### ${section.title}`)
      for (const item of section.items) {
        lines.push(`- ${item}`)
      }
      lines.push('')
    }

    return lines.join('\n').trimEnd()
  }
}

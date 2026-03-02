import { eq, desc, sql } from 'drizzle-orm'
import { getDatabase, schema } from '../index'
import type { Memory, NewMemory } from '../schema'
import { generateId } from '../utils/idGenerator'

const { memories } = schema

// FTS5 rank threshold for deduplication.
// More negative = stricter matching. Memories with rank < this share significant term overlap.
const DEDUP_RANK_THRESHOLD = -5

// FTS5 reserved keywords that must be quoted to avoid syntax errors
const FTS5_KEYWORDS = new Set(['AND', 'OR', 'NOT', 'NEAR'])

interface MemoryRawRow {
  id: string
  type: string
  category: string
  content: string
  tags: string | null
  source: string
  conversation_id?: string | null
  conversationId?: string | null
  file_path?: string | null
  filePath?: string | null
  created_at?: number | null
  createdAt?: Date | null
  updated_at?: number | null
  updatedAt?: Date | null
  last_accessed_at?: number | null
  lastAccessedAt?: Date | null
  rank?: number
}

export class MemoryService {
  // Get all memories
  static async getAll() {
    const db = getDatabase()
    return db.select().from(memories).orderBy(desc(memories.updatedAt))
  }

  // Get memory by ID
  static async getById(id: string) {
    const db = getDatabase()
    const result = await db
      .select()
      .from(memories)
      .where(eq(memories.id, id))
      .limit(1)
    return result[0] || null
  }

  // Get memories by type
  static async getByType(type: string) {
    const db = getDatabase()
    return db
      .select()
      .from(memories)
      .where(eq(memories.type, type))
      .orderBy(desc(memories.updatedAt))
  }

  // Create a new memory
  static async create(
    data: Omit<NewMemory, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) {
    try {
      const db = getDatabase()

      const now = new Date()
      const newMemory: NewMemory = {
        id: data.id || generateId(),
        type: data.type,
        category: data.category,
        content: data.content,
        tags: data.tags || null,
        source: data.source,
        conversationId: data.conversationId || null,
        filePath: data.filePath || null,
        createdAt: now,
        updatedAt: now,
      }

      await db.insert(memories).values(newMemory)
      return newMemory
    } catch (error) {
      console.error('MemoryService.create failed:', error)
      throw error
    }
  }

  // Update a memory
  static async update(
    id: string,
    data: Partial<Omit<NewMemory, 'id' | 'createdAt'>>
  ) {
    try {
      const db = getDatabase()

      await db
        .update(memories)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(memories.id, id))

      return this.getById(id)
    } catch (error) {
      console.error('MemoryService.update failed:', { id }, error)
      throw error
    }
  }

  // Delete a memory
  static async delete(id: string) {
    try {
      const db = getDatabase()
      await db.delete(memories).where(eq(memories.id, id))
    } catch (error) {
      console.error('MemoryService.delete failed:', { id }, error)
      throw error
    }
  }

  // Delete all memories of a given type
  static async deleteByType(type: string) {
    try {
      const db = getDatabase()
      await db.delete(memories).where(eq(memories.type, type))
    } catch (error) {
      console.error('MemoryService.deleteByType failed:', { type }, error)
      throw error
    }
  }

  // Touch lastAccessedAt for a set of memory IDs (P2-16: decay tracking)
  static async touchAccessTime(ids: string[]) {
    if (ids.length === 0) return
    const db = getDatabase()
    const placeholders = ids.map(id => sql`${id}`)
    await db
      .update(memories)
      .set({ lastAccessedAt: new Date() })
      .where(sql`${memories.id} IN (${sql.join(placeholders, sql`, `)})`)
  }

  // Export all memories as plain objects (for JSON export)
  static async exportAll(): Promise<Array<Record<string, unknown>>> {
    const db = getDatabase()
    const all = await db
      .select()
      .from(memories)
      .orderBy(desc(memories.createdAt))
    return all.map(m => ({
      type: m.type,
      category: m.category,
      content: m.content,
      tags: m.tags,
      source: m.source,
      conversationId: m.conversationId,
      createdAt:
        m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      updatedAt:
        m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt,
    }))
  }

  // FTS5 full-text search
  static async search(query: string): Promise<Memory[]> {
    const db = getDatabase()
    const searchTerm = this.sanitizeSearchTerm(query)

    if (!searchTerm) return []

    const results = db.all(sql`
      SELECT m.*
      FROM memories m
      JOIN memories_fts fts ON m.rowid = fts.rowid
      WHERE memories_fts MATCH ${searchTerm}
      ORDER BY fts.rank
    `) as MemoryRawRow[]

    return results.map(this.mapRawToMemory)
  }

  // Get memories by conversation ID
  static async getByConversationId(conversationId: string) {
    const db = getDatabase()
    return db
      .select()
      .from(memories)
      .where(eq(memories.conversationId, conversationId))
      .orderBy(desc(memories.updatedAt))
  }

  // Find similar memories using FTS5 (for deduplication)
  // Optionally scoped by type+category to reduce false-positive matches.
  static async findSimilar(
    content: string,
    threshold?: number,
    scope?: { type?: string; category?: string }
  ): Promise<Array<Memory & { rank: number }>> {
    const db = getDatabase()
    // Extract key terms from content for matching
    const terms = content
      .split(/\s+/)
      .filter(t => t.length > 2)
      .slice(0, 10)
      .join(' ')

    const searchTerm = this.sanitizeSearchTerm(terms)
    if (!searchTerm) return []

    // Build optional WHERE clauses for type/category scoping
    const conditions = [sql`memories_fts MATCH ${searchTerm}`]
    if (scope?.type) conditions.push(sql`m.type = ${scope.type}`)
    if (scope?.category) conditions.push(sql`m.category = ${scope.category}`)
    const whereClause = sql.join(conditions, sql` AND `)

    const results = db.all(sql`
      SELECT m.*, fts.rank
      FROM memories m
      JOIN memories_fts fts ON m.rowid = fts.rowid
      WHERE ${whereClause}
      ORDER BY fts.rank
      LIMIT 10
    `) as MemoryRawRow[]

    const mapped = results.map(r => ({
      ...this.mapRawToMemory(r),
      rank: r.rank as number,
    }))

    if (threshold !== undefined) {
      return mapped.filter(r => r.rank < threshold)
    }

    return mapped
  }

  // Upsert memory with deduplication (wrapped in transaction for atomicity)
  static async upsertMemory(data: {
    type: string
    category: string
    content: string
    tags?: string
    source: string
    conversationId?: string
  }): Promise<{ memory: Memory; isNew: boolean }> {
    const db = getDatabase()
    return db.transaction(tx => {
      // findSimilar uses db.all() with raw SQL, so we run it inside the transaction scope
      // by calling the class methods which will see the same connection.
      // Since better-sqlite3 is synchronous and single-connection, the transaction
      // serializes the find + insert/update atomically.
      const similar = this.findSimilarSync(data.content, DEDUP_RANK_THRESHOLD, {
        type: data.type,
        category: data.category,
      })

      if (similar.length > 0) {
        // High similarity found — merge/update the most relevant one
        const best = similar[0]
        tx.update(memories)
          .set({
            content: data.content,
            tags: data.tags || best.tags,
            updatedAt: new Date(),
          })
          .where(eq(memories.id, best.id))
          .run()

        const updated = tx
          .select()
          .from(memories)
          .where(eq(memories.id, best.id))
          .limit(1)
          .get()
        return { memory: updated as Memory, isNew: false }
      }

      // No similar memory — insert new
      const now = new Date()
      const newMemory: NewMemory = {
        id: generateId(),
        type: data.type,
        category: data.category,
        content: data.content,
        tags: data.tags || null,
        source: data.source,
        conversationId: data.conversationId || null,
        filePath: null,
        createdAt: now,
        updatedAt: now,
      }

      tx.insert(memories).values(newMemory).run()
      return { memory: newMemory as Memory, isNew: true }
    })
  }

  /**
   * Synchronous version of findSimilar for use inside transactions.
   * better-sqlite3 is synchronous, so db.all() works inside transaction callbacks.
   */
  private static findSimilarSync(
    content: string,
    threshold: number,
    scope?: { type?: string; category?: string }
  ): Array<Memory & { rank: number }> {
    const db = getDatabase()
    const terms = content
      .split(/\s+/)
      .filter(t => t.length > 2)
      .slice(0, 10)
      .join(' ')

    const searchTerm = this.sanitizeSearchTerm(terms)
    if (!searchTerm) return []

    const conditions = [sql`memories_fts MATCH ${searchTerm}`]
    if (scope?.type) conditions.push(sql`m.type = ${scope.type}`)
    if (scope?.category) conditions.push(sql`m.category = ${scope.category}`)
    const whereClause = sql.join(conditions, sql` AND `)

    const results = db.all(sql`
      SELECT m.*, fts.rank
      FROM memories m
      JOIN memories_fts fts ON m.rowid = fts.rowid
      WHERE ${whereClause}
      ORDER BY fts.rank
      LIMIT 10
    `) as MemoryRawRow[]

    return results
      .map(r => ({ ...this.mapRawToMemory(r), rank: r.rank as number }))
      .filter(r => r.rank < threshold)
  }

  /**
   * Map raw SQLite row (snake_case) to Memory type (camelCase).
   * Raw SQL via db.all() returns column names as-is from the DB schema.
   */
  private static mapRawToMemory(row: MemoryRawRow): Memory {
    return {
      id: row.id,
      type: row.type,
      category: row.category,
      content: row.content,
      tags: row.tags,
      source: row.source,
      conversationId: row.conversation_id ?? row.conversationId ?? null,
      filePath: row.file_path ?? row.filePath ?? null,
      createdAt:
        row.created_at != null
          ? new Date(row.created_at * 1000)
          : (row.createdAt ?? new Date()),
      updatedAt:
        row.updated_at != null
          ? new Date(row.updated_at * 1000)
          : (row.updatedAt ?? new Date()),
      lastAccessedAt:
        row.last_accessed_at != null
          ? new Date(row.last_accessed_at * 1000)
          : (row.lastAccessedAt ?? null),
    }
  }

  /**
   * Sanitize search term for FTS5.
   * Strips special characters, handles FTS5 keywords, and wraps each token in quotes.
   */
  private static sanitizeSearchTerm(term: string): string {
    return term
      .replace(/[*"(){}[\]^~\\:+\-]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(t => t.length > 0)
      .filter(t => !FTS5_KEYWORDS.has(t.toUpperCase()))
      .slice(0, 20)
      .map(t => `"${t}"`)
      .join(' ')
  }
}

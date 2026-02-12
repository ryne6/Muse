import { sql } from 'drizzle-orm'
import { getDatabase, schema } from '../index'
import type {
  SearchQuery,
  SearchResult,
  SearchResponse,
  SearchContentType,
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH_OFFSET,
} from '../../../../shared/types/search'

const { conversations, messages } = schema

export class SearchService {
  /**
   * Perform FTS5 full-text search
   */
  static async search(query: SearchQuery): Promise<SearchResponse> {
    const db = getDatabase()
    await this.ensureIndexReady()
    const searchTerm = this.sanitizeSearchTerm(query.query)

    if (!searchTerm) {
      return { results: [], total: 0, query: query.query, hasMore: false }
    }

    const limit = query.pagination?.limit ?? 20
    const offset = query.pagination?.offset ?? 0

    // Build content type filter
    let contentTypeFilter = ''
    if (query.filters?.contentTypes && query.filters.contentTypes.length > 0) {
      const types = query.filters.contentTypes.map(t => `'${t}'`).join(',')
      contentTypeFilter = `AND content_type IN (${types})`
    }

    // Build conversation filter
    let conversationFilter = ''
    if (
      query.filters?.conversationIds &&
      query.filters.conversationIds.length > 0
    ) {
      const ids = query.filters.conversationIds.map(id => `'${id}'`).join(',')
      conversationFilter = `AND conversation_id IN (${ids})`
    }

    // Execute search query using sql template for proper parameter binding
    const rawResults = db.all(sql`
      SELECT
        content_type,
        content_id,
        conversation_id,
        snippet(search_index, 3, '<mark>', '</mark>', '...', 32) as highlighted_snippet,
        searchable_text,
        rank
      FROM search_index
      WHERE search_index MATCH ${searchTerm}
      ${sql.raw(contentTypeFilter)}
      ${sql.raw(conversationFilter)}
      ORDER BY rank
      LIMIT ${limit + 1} OFFSET ${offset}
    `) as any[]

    // Check if there are more results
    const hasMore = rawResults.length > limit
    const results = rawResults.slice(0, limit)

    // Enrich results with conversation titles and timestamps
    const enrichedResults = await this.enrichResults(results)

    // Get total count using sql template for proper parameter binding
    const countResult = db.get(sql`
      SELECT COUNT(*) as total
      FROM search_index
      WHERE search_index MATCH ${searchTerm}
      ${sql.raw(contentTypeFilter)}
      ${sql.raw(conversationFilter)}
    `) as { total: number }

    return {
      results: enrichedResults,
      total: countResult?.total ?? 0,
      query: query.query,
      hasMore,
    }
  }

  /**
   * Ensure search_index exists and is populated when data exists
   */
  private static async ensureIndexReady(): Promise<void> {
    const db = getDatabase()
    try {
      const count = db.get(sql`SELECT COUNT(*) as total FROM search_index`) as {
        total: number
      }
      const dataCount = db.get(sql`SELECT COUNT(*) as total FROM messages`) as {
        total: number
      }
      if (!count || count.total === 0) {
        if (!dataCount || dataCount.total > 0) {
          await this.rebuildIndex()
        }
      }
    } catch {
      await this.rebuildIndex()
    }
  }

  /**
   * Sanitize search term for FTS5
   */
  private static sanitizeSearchTerm(term: string): string {
    // Remove special FTS5 characters and trim
    return term
      .replace(/[*"(){}[\]^~\\]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(t => t.length > 0)
      .map(t => `"${t}"`)
      .join(' ')
  }

  /**
   * Enrich search results with additional data
   */
  private static async enrichResults(
    rawResults: any[]
  ): Promise<SearchResult[]> {
    const db = getDatabase()
    const results: SearchResult[] = []

    for (const row of rawResults) {
      // Get conversation title
      const conv = await db
        .select({ title: conversations.title })
        .from(conversations)
        .where(sql`${conversations.id} = ${row.conversation_id}`)
        .limit(1)

      // Get timestamp based on content type
      let timestamp = Date.now()
      let messageId: string | undefined

      if (row.content_type === 'message') {
        const msg = await db
          .select({ timestamp: messages.timestamp })
          .from(messages)
          .where(sql`${messages.id} = ${row.content_id}`)
          .limit(1)
        if (msg[0]) {
          timestamp = msg[0].timestamp.getTime()
          messageId = row.content_id
        }
      }

      results.push({
        id: row.content_id,
        conversationId: row.conversation_id,
        conversationTitle: conv[0]?.title ?? 'Unknown',
        contentType: row.content_type as SearchContentType,
        snippet: row.searchable_text?.slice(0, 200) ?? '',
        highlightedSnippet: row.highlighted_snippet ?? '',
        messageId,
        timestamp,
        rank: row.rank,
      })
    }

    return results
  }

  /**
   * Rebuild the search index from scratch
   */
  static async rebuildIndex(): Promise<void> {
    const db = getDatabase()

    // Clear existing index
    db.run(sql`DELETE FROM search_index`)

    // Re-index conversations
    db.run(sql`
      INSERT INTO search_index(content_type, content_id, conversation_id, searchable_text)
      SELECT 'conversation_title', id, id, title FROM conversations
    `)

    // Re-index messages
    db.run(sql`
      INSERT INTO search_index(content_type, content_id, conversation_id, searchable_text)
      SELECT 'message', id, conversation_id, content FROM messages
    `)

    // Re-index tool calls
    db.run(sql`
      INSERT INTO search_index(content_type, content_id, conversation_id, searchable_text)
      SELECT 'tool_call', tc.id, m.conversation_id, tc.name || ' ' || tc.input
      FROM tool_calls tc
      JOIN messages m ON m.id = tc.message_id
    `)

    // Re-index tool results
    db.run(sql`
      INSERT INTO search_index(content_type, content_id, conversation_id, searchable_text)
      SELECT 'tool_result', tr.id, m.conversation_id, tr.output
      FROM tool_results tr
      JOIN tool_calls tc ON tc.id = tr.tool_call_id
      JOIN messages m ON m.id = tc.message_id
    `)

    // Re-index attachment notes
    db.run(sql`
      INSERT INTO search_index(content_type, content_id, conversation_id, searchable_text)
      SELECT 'attachment_note', a.id, m.conversation_id, a.note
      FROM attachments a
      JOIN messages m ON m.id = a.message_id
      WHERE a.note IS NOT NULL AND a.note != ''
    `)
  }
}

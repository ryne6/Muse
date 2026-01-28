/**
 * Search query parameters
 */
export interface SearchQuery {
  query: string
  filters?: SearchFilters
  pagination?: SearchPagination
}

/**
 * Search filters
 */
export interface SearchFilters {
  contentTypes?: SearchContentType[]
  dateRange?: {
    start?: number // Unix timestamp
    end?: number
  }
  conversationIds?: string[]
}

/**
 * Content types that can be searched
 */
export type SearchContentType =
  | 'conversation_title'
  | 'message'
  | 'tool_call'
  | 'tool_result'
  | 'attachment_note'

/**
 * Search pagination
 */
export interface SearchPagination {
  limit?: number
  offset?: number
}

/**
 * Individual search result
 */
export interface SearchResult {
  id: string
  conversationId: string
  conversationTitle: string
  contentType: SearchContentType
  snippet: string
  highlightedSnippet: string
  messageId?: string
  timestamp: number
  rank: number
}

/**
 * Search response with results and metadata
 */
export interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
  hasMore: boolean
}

/**
 * Default search pagination values
 */
export const DEFAULT_SEARCH_LIMIT = 20
export const DEFAULT_SEARCH_OFFSET = 0

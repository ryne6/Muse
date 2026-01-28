import { create } from 'zustand'
import type {
  SearchQuery,
  SearchResult,
  SearchResponse,
  SearchFilters,
  DEFAULT_SEARCH_LIMIT,
} from '@shared/types/search'

interface SearchStore {
  // State
  isOpen: boolean
  query: string
  results: SearchResult[]
  total: number
  hasMore: boolean
  isLoading: boolean
  error: string | null
  filters: SearchFilters

  // Actions
  openSearch: () => void
  closeSearch: () => void
  setQuery: (query: string) => void
  setFilters: (filters: SearchFilters) => void
  search: () => Promise<void>
  loadMore: () => Promise<void>
  clearResults: () => void
}

export const useSearchStore = create<SearchStore>((set, get) => ({
  // Initial state
  isOpen: false,
  query: '',
  results: [],
  total: 0,
  hasMore: false,
  isLoading: false,
  error: null,
  filters: {},

  // Actions
  openSearch: () => set({ isOpen: true }),

  closeSearch: () => set({
    isOpen: false,
    query: '',
    results: [],
    total: 0,
    hasMore: false,
    error: null,
  }),

  setQuery: (query) => set({ query }),

  setFilters: (filters) => set({ filters }),

  search: async () => {
    const { query, filters } = get()

    if (!query.trim()) {
      set({ results: [], total: 0, hasMore: false })
      return
    }

    set({ isLoading: true, error: null })

    try {
      const searchQuery: SearchQuery = {
        query: query.trim(),
        filters,
        pagination: { limit: 20, offset: 0 },
      }

      const response = await window.api.search.query(searchQuery)

      set({
        results: response.results,
        total: response.total,
        hasMore: response.hasMore,
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Search failed',
        isLoading: false,
      })
    }
  },

  loadMore: async () => {
    const { query, filters, results, hasMore, isLoading } = get()

    if (!hasMore || isLoading) return

    set({ isLoading: true })

    try {
      const searchQuery: SearchQuery = {
        query: query.trim(),
        filters,
        pagination: { limit: 20, offset: results.length },
      }

      const response = await window.api.search.query(searchQuery)

      set({
        results: [...results, ...response.results],
        hasMore: response.hasMore,
        isLoading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Load more failed',
        isLoading: false,
      })
    }
  },

  clearResults: () => set({
    results: [],
    total: 0,
    hasMore: false,
    error: null,
  }),
}))

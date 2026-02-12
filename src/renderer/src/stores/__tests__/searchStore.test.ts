import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSearchStore } from '../searchStore'

/**
 * searchStore 单元测试
 *
 * 测试目标：
 * - 状态管理
 * - 搜索功能
 * - 分页加载
 */

// Mock window.api
const mockQuery = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  ;(global as any).window = {
    api: {
      search: {
        query: mockQuery,
      },
    },
  }
  // Reset store state
  useSearchStore.setState({
    isOpen: false,
    query: '',
    results: [],
    total: 0,
    hasMore: false,
    isLoading: false,
    error: null,
    filters: {},
  })
})

describe('searchStore', () => {
  describe('状态管理', () => {
    it('should have correct initial state', () => {
      const state = useSearchStore.getState()

      expect(state.isOpen).toBe(false)
      expect(state.query).toBe('')
      expect(state.results).toEqual([])
      expect(state.total).toBe(0)
      expect(state.hasMore).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.filters).toEqual({})
    })

    it('should open search', () => {
      useSearchStore.getState().openSearch()

      expect(useSearchStore.getState().isOpen).toBe(true)
    })

    it('should close search and reset state', () => {
      useSearchStore.setState({
        isOpen: true,
        query: 'test',
        results: [{ id: '1', type: 'conversation' }] as any,
        total: 1,
        hasMore: true,
        error: 'some error',
      })

      useSearchStore.getState().closeSearch()

      const state = useSearchStore.getState()
      expect(state.isOpen).toBe(false)
      expect(state.query).toBe('')
      expect(state.results).toEqual([])
      expect(state.total).toBe(0)
      expect(state.hasMore).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should set query', () => {
      useSearchStore.getState().setQuery('test query')

      expect(useSearchStore.getState().query).toBe('test query')
    })

    it('should set filters', () => {
      const filters = { type: 'conversation' }
      useSearchStore.getState().setFilters(filters as any)

      expect(useSearchStore.getState().filters).toEqual(filters)
    })

    it('should clear results', () => {
      useSearchStore.setState({
        results: [{ id: '1', type: 'conversation' }] as any,
        total: 1,
        hasMore: true,
        error: 'some error',
      })

      useSearchStore.getState().clearResults()

      const state = useSearchStore.getState()
      expect(state.results).toEqual([])
      expect(state.total).toBe(0)
      expect(state.hasMore).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('搜索功能', () => {
    it('should clear results for empty query', async () => {
      useSearchStore.setState({
        query: '   ',
        results: [{ id: '1', type: 'conversation' }] as any,
        total: 1,
        hasMore: true,
      })

      await useSearchStore.getState().search()

      const state = useSearchStore.getState()
      expect(state.results).toEqual([])
      expect(state.total).toBe(0)
      expect(state.hasMore).toBe(false)
      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('should search and update results', async () => {
      mockQuery.mockResolvedValueOnce({
        results: [{ id: '1', type: 'conversation', title: 'Test' }],
        total: 10,
        hasMore: true,
      })

      useSearchStore.setState({ query: 'test' })
      await useSearchStore.getState().search()

      expect(mockQuery).toHaveBeenCalledWith({
        query: 'test',
        filters: {},
        pagination: { limit: 20, offset: 0 },
      })

      const state = useSearchStore.getState()
      expect(state.results).toHaveLength(1)
      expect(state.total).toBe(10)
      expect(state.hasMore).toBe(true)
      expect(state.isLoading).toBe(false)
    })

    it('should handle search error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Search failed'))

      useSearchStore.setState({ query: 'test' })
      await useSearchStore.getState().search()

      const state = useSearchStore.getState()
      expect(state.error).toBe('Search failed')
      expect(state.isLoading).toBe(false)
    })

    it('should handle non-Error search failure', async () => {
      mockQuery.mockRejectedValueOnce('Unknown error')

      useSearchStore.setState({ query: 'test' })
      await useSearchStore.getState().search()

      const state = useSearchStore.getState()
      expect(state.error).toBe('Search failed')
    })
  })

  describe('分页加载', () => {
    it('should load more results', async () => {
      useSearchStore.setState({
        query: 'test',
        results: [{ id: '1', type: 'conversation' }] as any,
        hasMore: true,
      })

      mockQuery.mockResolvedValueOnce({
        results: [{ id: '2', type: 'conversation' }],
        hasMore: false,
      })

      await useSearchStore.getState().loadMore()

      expect(mockQuery).toHaveBeenCalledWith({
        query: 'test',
        filters: {},
        pagination: { limit: 20, offset: 1 },
      })

      const state = useSearchStore.getState()
      expect(state.results).toHaveLength(2)
      expect(state.hasMore).toBe(false)
    })

    it('should skip loadMore when no more results', async () => {
      useSearchStore.setState({
        query: 'test',
        hasMore: false,
      })

      await useSearchStore.getState().loadMore()

      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('should skip loadMore when already loading', async () => {
      useSearchStore.setState({
        query: 'test',
        hasMore: true,
        isLoading: true,
      })

      await useSearchStore.getState().loadMore()

      expect(mockQuery).not.toHaveBeenCalled()
    })

    it('should handle loadMore error', async () => {
      useSearchStore.setState({
        query: 'test',
        results: [{ id: '1', type: 'conversation' }] as any,
        hasMore: true,
      })

      mockQuery.mockRejectedValueOnce(new Error('Load failed'))

      await useSearchStore.getState().loadMore()

      const state = useSearchStore.getState()
      expect(state.error).toBe('Load failed')
      expect(state.isLoading).toBe(false)
    })

    it('should handle non-Error loadMore failure', async () => {
      useSearchStore.setState({
        query: 'test',
        results: [],
        hasMore: true,
      })

      mockQuery.mockRejectedValueOnce('Unknown error')

      await useSearchStore.getState().loadMore()

      expect(useSearchStore.getState().error).toBe('Load more failed')
    })
  })
})

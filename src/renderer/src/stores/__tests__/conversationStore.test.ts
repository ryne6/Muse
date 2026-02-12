import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123'),
}))

// Use vi.hoisted to define mock before vi.mock hoisting
const mockDbClient = vi.hoisted(() => ({
  conversations: {
    getAll: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  messages: {
    getAllWithTools: vi.fn(),
  },
}))

vi.mock('@/services/dbClient', () => ({
  dbClient: mockDbClient,
}))

import { useConversationStore } from '../conversationStore'

describe('ConversationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useConversationStore.setState({
      conversations: [],
      currentConversationId: null,
      isLoading: false,
      loadedConversationIds: new Set<string>(),
      loadingConversationId: null,
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useConversationStore.getState()
      expect(state.conversations).toEqual([])
      expect(state.currentConversationId).toBeNull()
      expect(state.isLoading).toBe(false)
    })
  })

  describe('loadConversations', () => {
    it('should load conversations from database', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Chat 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockDbClient.conversations.getAll.mockResolvedValue(mockConversations)

      await useConversationStore.getState().loadConversations()

      expect(mockDbClient.conversations.getAll).toHaveBeenCalled()
      expect(mockDbClient.messages.getAllWithTools).not.toHaveBeenCalled()
      expect(useConversationStore.getState().conversations).toHaveLength(1)
      expect(
        useConversationStore.getState().conversations[0]?.messages
      ).toEqual([])
      expect(useConversationStore.getState().isLoading).toBe(false)
    })

    it('should set loading state during load', async () => {
      const loadingStates: boolean[] = []
      const unsubscribe = useConversationStore.subscribe(state => {
        loadingStates.push(state.isLoading)
      })

      mockDbClient.conversations.getAll.mockResolvedValue([])

      await useConversationStore.getState().loadConversations()

      unsubscribe()
      expect(loadingStates).toContain(true)
      expect(useConversationStore.getState().isLoading).toBe(false)
    })

    it('should handle load error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockDbClient.conversations.getAll.mockRejectedValue(new Error('DB error'))

      await useConversationStore.getState().loadConversations()

      expect(consoleSpy).toHaveBeenCalled()
      expect(useConversationStore.getState().isLoading).toBe(false)
      consoleSpy.mockRestore()
    })
  })

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      mockDbClient.conversations.create.mockResolvedValue(undefined)

      const result = await useConversationStore
        .getState()
        .createConversation('Test Chat')

      expect(result.title).toBe('Test Chat')
      expect(result.messages).toEqual([])
      expect(mockDbClient.conversations.create).toHaveBeenCalled()
    })

    it('should use default title if not provided', async () => {
      mockDbClient.conversations.create.mockResolvedValue(undefined)

      const result = await useConversationStore.getState().createConversation()

      expect(result.title).toBe('New Chat')
    })

    it('should add conversation to state and set as current', async () => {
      mockDbClient.conversations.create.mockResolvedValue(undefined)

      await useConversationStore.getState().createConversation('Test')

      const state = useConversationStore.getState()
      expect(state.conversations).toHaveLength(1)
      expect(state.currentConversationId).toBe('mock-uuid-123')
    })
  })

  describe('deleteConversation', () => {
    beforeEach(() => {
      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat 1',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
          },
          {
            id: 'conv-2',
            title: 'Chat 2',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
          },
        ],
        currentConversationId: 'conv-1',
      })
    })

    it('should delete conversation from state', async () => {
      mockDbClient.conversations.delete.mockResolvedValue(undefined)

      await useConversationStore.getState().deleteConversation('conv-1')

      expect(useConversationStore.getState().conversations).toHaveLength(1)
      expect(mockDbClient.conversations.delete).toHaveBeenCalledWith('conv-1')
    })

    it('should switch to next conversation when deleting current', async () => {
      mockDbClient.conversations.delete.mockResolvedValue(undefined)

      await useConversationStore.getState().deleteConversation('conv-1')

      expect(useConversationStore.getState().currentConversationId).toBe(
        'conv-2'
      )
    })

    it('should set currentId to null when deleting last conversation', async () => {
      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat 1',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
          },
        ],
        currentConversationId: 'conv-1',
      })
      mockDbClient.conversations.delete.mockResolvedValue(undefined)

      await useConversationStore.getState().deleteConversation('conv-1')

      expect(useConversationStore.getState().currentConversationId).toBeNull()
    })
  })

  describe('renameConversation', () => {
    beforeEach(() => {
      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Old Title',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
          },
        ],
      })
    })

    it('should rename conversation', async () => {
      mockDbClient.conversations.update.mockResolvedValue(undefined)

      await useConversationStore
        .getState()
        .renameConversation('conv-1', 'New Title')

      const conv = useConversationStore.getState().conversations[0]
      expect(conv.title).toBe('New Title')
      expect(mockDbClient.conversations.update).toHaveBeenCalledWith('conv-1', {
        title: 'New Title',
      })
    })
  })

  describe('loadConversation', () => {
    it('should set currentConversationId', () => {
      useConversationStore.getState().loadConversation('conv-123')

      expect(useConversationStore.getState().currentConversationId).toBe(
        'conv-123'
      )
    })
  })

  describe('updateConversation', () => {
    beforeEach(() => {
      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
          },
        ],
      })
    })

    it('should update conversation with partial data', () => {
      useConversationStore
        .getState()
        .updateConversation('conv-1', { title: 'Updated' })

      expect(useConversationStore.getState().conversations[0].title).toBe(
        'Updated'
      )
    })
  })

  describe('addMessage', () => {
    beforeEach(() => {
      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
          },
        ],
        currentConversationId: 'conv-1',
      })
    })

    it('should add message to current conversation', () => {
      const message = {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: Date.now(),
      }

      useConversationStore.getState().addMessage(message)

      const conv = useConversationStore.getState().conversations[0]
      expect(conv.messages).toHaveLength(1)
      expect(conv.messages[0].content).toBe('Hello')
    })

    it('should not add message if no current conversation', () => {
      useConversationStore.setState({ currentConversationId: null })
      const message = {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Hello',
        timestamp: Date.now(),
      }

      useConversationStore.getState().addMessage(message)

      expect(
        useConversationStore.getState().conversations[0].messages
      ).toHaveLength(0)
    })
  })

  describe('getCurrentConversation', () => {
    it('should return current conversation', () => {
      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
          },
        ],
        currentConversationId: 'conv-1',
      })

      const result = useConversationStore.getState().getCurrentConversation()

      expect(result?.id).toBe('conv-1')
    })

    it('should return null if no current conversation', () => {
      useConversationStore.setState({ currentConversationId: null })

      const result = useConversationStore.getState().getCurrentConversation()

      expect(result).toBeNull()
    })
  })

  describe('getConversationsByDate', () => {
    it('should group conversations by date', () => {
      const now = Date.now()
      const today = new Date(now).setHours(0, 0, 0, 0)

      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Today',
            createdAt: 0,
            updatedAt: today + 1000,
            messages: [],
          },
          {
            id: 'conv-2',
            title: 'Old',
            createdAt: 0,
            updatedAt: today - 40 * 86400000,
            messages: [],
          },
        ],
      })

      const result = useConversationStore.getState().getConversationsByDate()

      expect(result.today).toHaveLength(1)
      expect(result.older).toHaveLength(1)
    })
  })

  describe('clearCurrentConversation', () => {
    it('should clear currentConversationId', () => {
      useConversationStore.setState({ currentConversationId: 'conv-1' })

      useConversationStore.getState().clearCurrentConversation()

      expect(useConversationStore.getState().currentConversationId).toBeNull()
    })
  })
})

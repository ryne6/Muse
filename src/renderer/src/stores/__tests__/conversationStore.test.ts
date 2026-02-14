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

vi.mock('~/services/dbClient', () => ({
  dbClient: mockDbClient,
}))

const mockWorkspacePath = vi.hoisted(() => ({ value: '~main/global/workspace' }))

vi.mock('../workspaceStore', () => ({
  useWorkspaceStore: {
    getState: () => ({ workspacePath: mockWorkspacePath.value }),
  },
}))

vi.mock('../settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      memoryEnabled: false,
      currentProviderId: null,
      currentModelId: null,
    }),
  },
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
    beforeEach(() => {
      global.window = global.window || ({} as any)
      global.window.api = {
        ...(global.window.api || {}),
        workspace: {
          createDefault: vi
            .fn()
            .mockResolvedValue({ path: '~main/muse/workspaces/mock-uuid-123' }),
        },
      } as any
    })

    it('should create a new conversation', async () => {
      mockDbClient.conversations.create.mockResolvedValue(undefined)

      const result = await useConversationStore
        .getState()
        .createConversation('Test Chat')

      expect(result.title).toBe('Test Chat')
      expect(result.messages).toEqual([])
      expect(result.workspace).toBe('~main/muse/workspaces/mock-uuid-123')
      expect(window.api.workspace.createDefault).toHaveBeenCalledWith(
        'mock-uuid-123'
      )
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

    it('should continue without workspace when createDefault fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      ;(window.api.workspace.createDefault as any).mockRejectedValue(
        new Error('workspace failed')
      )
      mockDbClient.conversations.create.mockResolvedValue(undefined)

      const result = await useConversationStore
        .getState()
        .createConversation('Fallback')

      expect(result.workspace).toBeUndefined()
      expect(mockDbClient.conversations.create).toHaveBeenCalledWith(
        expect.objectContaining({ workspace: undefined })
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create default workspace, continuing without it:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
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

  describe('getEffectiveWorkspace', () => {
    it('should return conversation workspace when set', () => {
      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
            workspace: '~main/conv/workspace',
          },
        ],
        currentConversationId: 'conv-1',
      })

      const result = useConversationStore.getState().getEffectiveWorkspace()

      expect(result).toBe('~main/conv/workspace')
    })

    it('should fallback to global workspace when conversation has no workspace', () => {
      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
            workspace: null,
          },
        ],
        currentConversationId: 'conv-1',
      })

      const result = useConversationStore.getState().getEffectiveWorkspace()

      expect(result).toBe('~main/global/workspace')
    })

    it('should fallback to global workspace when no current conversation', () => {
      useConversationStore.setState({
        conversations: [],
        currentConversationId: null,
      })

      const result = useConversationStore.getState().getEffectiveWorkspace()

      expect(result).toBe('~main/global/workspace')
    })

    it('should return null when neither conversation nor global workspace set', () => {
      mockWorkspacePath.value = null as any
      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
            workspace: null,
          },
        ],
        currentConversationId: 'conv-1',
      })

      const result = useConversationStore.getState().getEffectiveWorkspace()

      expect(result).toBeNull()
      mockWorkspacePath.value = '~main/global/workspace'
    })
  })

  describe('setWorkspace', () => {
    beforeEach(() => {
      global.window = global.window || ({} as any)
      global.window.api = {
        ...(global.window.api || {}),
        ipc: { invoke: vi.fn().mockResolvedValue(undefined) },
      } as any

      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
            workspace: null,
          },
        ],
      })
    })

    it('should call IPC and update conversation workspace', async () => {
      await useConversationStore
        .getState()
        .setWorkspace('conv-1', '~main/new/workspace')

      expect(window.api.ipc.invoke).toHaveBeenCalledWith(
        'db:conversations:updateWorkspace',
        { id: 'conv-1', workspace: '~main/new/workspace' }
      )
      expect(
        useConversationStore.getState().conversations[0].workspace
      ).toBe('~main/new/workspace')
    })

    it('should set workspace to null', async () => {
      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
            workspace: '~main/old/workspace',
          },
        ],
      })

      await useConversationStore
        .getState()
        .setWorkspace('conv-1', null)

      expect(window.api.ipc.invoke).toHaveBeenCalledWith(
        'db:conversations:updateWorkspace',
        { id: 'conv-1', workspace: null }
      )
      expect(
        useConversationStore.getState().conversations[0].workspace
      ).toBeNull()
    })
  })

  describe('updateConversationSystemPrompt', () => {
    beforeEach(() => {
      global.window = global.window || ({} as any)
      global.window.api = {
        ...(global.window.api || {}),
        ipc: { invoke: vi.fn().mockResolvedValue(undefined) },
      } as any

      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
            systemPrompt: null,
          },
        ],
      })
    })

    it('should call IPC and update system prompt', async () => {
      await useConversationStore
        .getState()
        .updateConversationSystemPrompt('conv-1', 'You are helpful')

      expect(window.api.ipc.invoke).toHaveBeenCalledWith(
        'db:conversations:updateSystemPrompt',
        { id: 'conv-1', systemPrompt: 'You are helpful' }
      )
      expect(
        useConversationStore.getState().conversations[0].systemPrompt
      ).toBe('You are helpful')
    })

    it('should clear system prompt with null', async () => {
      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
            systemPrompt: 'Old prompt',
          },
        ],
      })

      await useConversationStore
        .getState()
        .updateConversationSystemPrompt('conv-1', null)

      expect(
        useConversationStore.getState().conversations[0].systemPrompt
      ).toBeNull()
    })
  })

  describe('updateMessage', () => {
    beforeEach(() => {
      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            createdAt: 0,
            updatedAt: 0,
            messages: [
              {
                id: 'msg-1',
                role: 'assistant',
                content: 'Hello',
                timestamp: 1000,
              },
              {
                id: 'msg-2',
                role: 'user',
                content: 'World',
                timestamp: 2000,
              },
            ],
          },
          {
            id: 'conv-2',
            title: 'Other',
            createdAt: 0,
            updatedAt: 0,
            messages: [
              {
                id: 'msg-3',
                role: 'user',
                content: 'Untouched',
                timestamp: 3000,
              },
            ],
          },
        ],
      })
    })

    it('should update only the target message via updater function', () => {
      useConversationStore
        .getState()
        .updateMessage('conv-1', 'msg-1', m => ({
          ...m,
          content: m.content + ' World',
        }))

      const conv = useConversationStore.getState().conversations[0]
      expect(conv.messages[0].content).toBe('Hello World')
      expect(conv.messages[1].content).toBe('World')
    })

    it('should not affect other conversations', () => {
      useConversationStore
        .getState()
        .updateMessage('conv-1', 'msg-1', m => ({
          ...m,
          content: 'Changed',
        }))

      const otherConv = useConversationStore.getState().conversations[1]
      expect(otherConv.messages[0].content).toBe('Untouched')
    })

    it('should leave non-matching messages unchanged', () => {
      useConversationStore
        .getState()
        .updateMessage('conv-1', 'msg-1', m => ({
          ...m,
          thinking: 'some thought',
        }))

      const conv = useConversationStore.getState().conversations[0]
      expect(conv.messages[0].thinking).toBe('some thought')
      expect(conv.messages[1].thinking).toBeUndefined()
    })
  })

  describe('deleteConversation workspace cleanup', () => {
    beforeEach(() => {
      global.window = global.window || ({} as any)
      global.window.api = {
        ...(global.window.api || {}),
        workspace: {
          cleanup: vi.fn().mockResolvedValue({ deleted: true }),
          createDefault: vi.fn(),
        },
      } as any
    })

    it('should cleanup workspace when conversation has one', async () => {
      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
            workspace: '~main/muse/workspaces/conv-1',
          },
        ],
        currentConversationId: 'conv-1',
      })
      mockDbClient.conversations.delete.mockResolvedValue(undefined)

      await useConversationStore.getState().deleteConversation('conv-1')

      expect(window.api.workspace.cleanup).toHaveBeenCalledWith(
        '~main/muse/workspaces/conv-1'
      )
    })

    it('should not cleanup when conversation has no workspace', async () => {
      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
            workspace: null,
          },
        ],
        currentConversationId: 'conv-1',
      })
      mockDbClient.conversations.delete.mockResolvedValue(undefined)

      await useConversationStore.getState().deleteConversation('conv-1')

      expect(window.api.workspace.cleanup).not.toHaveBeenCalled()
    })

    it('should handle cleanup failure gracefully', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      ;(window.api.workspace.cleanup as any).mockRejectedValue(
        new Error('cleanup failed')
      )

      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
            workspace: '~main/muse/workspaces/conv-1',
          },
        ],
        currentConversationId: 'conv-1',
      })
      mockDbClient.conversations.delete.mockResolvedValue(undefined)

      await useConversationStore.getState().deleteConversation('conv-1')

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to cleanup workspace:',
        expect.any(Error)
      )
      // Conversation should still be deleted from state
      expect(useConversationStore.getState().conversations).toHaveLength(0)
      consoleSpy.mockRestore()
    })

    it('should log when workspace is not empty', async () => {
      const consoleSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {})
      ;(window.api.workspace.cleanup as any).mockResolvedValue({
        deleted: false,
        reason: 'not_empty',
      })

      useConversationStore.setState({
        conversations: [
          {
            id: 'conv-1',
            title: 'Chat',
            createdAt: 0,
            updatedAt: 0,
            messages: [],
            workspace: '~main/muse/workspaces/conv-1',
          },
        ],
        currentConversationId: 'conv-1',
      })
      mockDbClient.conversations.delete.mockResolvedValue(undefined)

      await useConversationStore.getState().deleteConversation('conv-1')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('not empty')
      )
      consoleSpy.mockRestore()
    })
  })
})

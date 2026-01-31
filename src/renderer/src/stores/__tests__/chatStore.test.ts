import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useChatStore } from '../chatStore'

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123')
}))

// Use vi.hoisted to define mock before vi.mock hoisting
const { mockSendMessageStream, MockAPIClientError } = vi.hoisted(() => {
  class MockAPIClientError extends Error {
    readonly apiError?: { code?: string; message: string; retryable?: boolean }
    readonly status?: number

    constructor(
      message: string,
      apiError?: { code?: string; message: string; retryable?: boolean },
      status?: number
    ) {
      super(message)
      this.name = 'APIClientError'
      this.apiError = apiError
      this.status = status
    }

    get retryable(): boolean {
      return this.apiError?.retryable ?? false
    }
  }

  return {
    mockSendMessageStream: vi.fn(),
    MockAPIClientError
  }
})

// Mock apiClient with APIClientError
vi.mock('../../services/apiClient', () => ({
  apiClient: {
    sendMessageStream: (...args: any[]) => mockSendMessageStream(...args)
  },
  APIClientError: MockAPIClientError
}))

// Mock conversationStore
const mockAddMessage = vi.fn()
const mockGetCurrentConversation = vi.fn()
const mockUpdateConversation = vi.fn()
const mockRenameConversation = vi.fn()

vi.mock('../conversationStore', () => ({
  useConversationStore: {
    getState: () => ({
      getCurrentConversation: mockGetCurrentConversation,
      addMessage: mockAddMessage,
      updateConversation: mockUpdateConversation,
      renameConversation: mockRenameConversation
    })
  }
}))

const mockGetCurrentProvider = vi.fn()
const mockGetCurrentModel = vi.fn()
const mockGetToolPermissions = vi.fn(() => ({ allowAll: false }))
const mockSetToolAllowAll = vi.fn()

vi.mock('../settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      getCurrentProvider: mockGetCurrentProvider,
      getCurrentModel: mockGetCurrentModel,
      getToolPermissions: mockGetToolPermissions,
      setToolAllowAll: mockSetToolAllowAll,
      temperature: 1,
      thinkingEnabled: false,
    })
  }
}))

vi.mock('../workspaceStore', () => ({
  useWorkspaceStore: {
    getState: () => ({ workspacePath: '/test/workspace' })
  }
}))

describe('ChatStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useChatStore.setState({ isLoading: false, error: null, lastError: null, retryable: false })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useChatStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('sendMessage', () => {
    const mockConfig = { apiKey: 'test-key', model: 'gpt-4' }

    it('should set loading state when sending message', async () => {
      // Track loading state changes
      const loadingStates: boolean[] = []
      const unsubscribe = useChatStore.subscribe((state) => {
        loadingStates.push(state.isLoading)
      })

      const mockConversation = {
        id: 'conv-1',
        messages: [{ id: '1', role: 'user', content: 'Hello' }]
      }
      mockGetCurrentConversation.mockReturnValue(mockConversation)

      // Use a delayed mock to ensure we can observe loading state
      mockSendMessageStream.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 10))
      )

      await useChatStore.getState().sendMessage(
        'conv-1',
        'Hello',
        'openai',
        mockConfig
      )

      unsubscribe()

      // Should have set loading to true then false
      expect(loadingStates).toContain(true)
      expect(useChatStore.getState().isLoading).toBe(false)
    })

    it('should add user message to conversation', async () => {
      mockGetCurrentConversation.mockReturnValue(null)

      await useChatStore.getState().sendMessage(
        'conv-1',
        'Hello world',
        'openai',
        mockConfig
      )

      expect(mockAddMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Hello world'
        })
      )
    })

    it('should set error when no conversation found', async () => {
      mockGetCurrentConversation.mockReturnValue(null)

      await useChatStore.getState().sendMessage(
        'conv-1',
        'Hello',
        'openai',
        mockConfig
      )

      expect(useChatStore.getState().error).toBe('No conversation found')
      expect(useChatStore.getState().isLoading).toBe(false)
    })

    it('should call apiClient.sendMessageStream with correct params', async () => {
      const mockConversation = {
        id: 'conv-1',
        messages: [
          { id: '1', role: 'user', content: 'Hello' }
        ]
      }
      mockGetCurrentConversation.mockReturnValue(mockConversation)
      mockSendMessageStream.mockResolvedValue(undefined)

      await useChatStore.getState().sendMessage(
        'conv-1',
        'Hello',
        'openai',
        mockConfig
      )

      expect(mockSendMessageStream).toHaveBeenCalledWith(
        'openai',
        expect.any(Array),
        mockConfig,
        expect.any(Function),
        expect.any(AbortSignal),
        expect.objectContaining({ toolPermissions: { allowAll: false } })
      )
    })

    it('should add assistant placeholder message', async () => {
      const mockConversation = {
        id: 'conv-1',
        messages: [{ id: '1', role: 'user', content: 'Hello' }]
      }
      mockGetCurrentConversation.mockReturnValue(mockConversation)
      mockSendMessageStream.mockResolvedValue(undefined)

      await useChatStore.getState().sendMessage(
        'conv-1',
        'Hello',
        'openai',
        mockConfig
      )

      // Should add both user message and assistant placeholder
      expect(mockAddMessage).toHaveBeenCalledTimes(2)
      expect(mockAddMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({
          role: 'assistant',
          content: ''
        })
      )
    })

    it('should include image blocks for prior attachments in aiMessages', async () => {
      global.window = global.window || ({} as any)
      global.window.api = {
        attachments: {
          getBase64: vi.fn().mockResolvedValue('base64-data')
        }
      } as any

      const mockConversation = {
        id: 'conv-1',
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Hello',
            attachments: [
              {
                id: 'att-1',
                messageId: '1',
                filename: 'image.png',
                mimeType: 'image/png',
                note: null,
                size: 123,
                width: null,
                height: null,
                createdAt: new Date()
              }
            ]
          }
        ]
      }

      mockGetCurrentConversation.mockReturnValue(mockConversation)
      mockSendMessageStream.mockResolvedValue(undefined)

      await useChatStore.getState().sendMessage(
        'conv-1',
        'Next',
        'openai',
        mockConfig
      )

      const aiMessages = mockSendMessageStream.mock.calls[0][1]
      const historyMessage = aiMessages[0]
      expect(Array.isArray(historyMessage.content)).toBe(true)
      expect(historyMessage.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'image',
            mimeType: 'image/png',
            data: 'base64-data'
          })
        ])
      )
    })
  })

  describe('error handling', () => {
    const mockConfig = { apiKey: 'test-key', model: 'gpt-4' }
    const mockConversation = {
      id: 'conv-1',
      messages: [{ id: '1', role: 'user', content: 'Hello' }]
    }

    beforeEach(() => {
      mockGetCurrentConversation.mockReturnValue(mockConversation)
    })

    it('should handle 401 Unauthorized error', async () => {
      const apiError = {
        code: 'UNAUTHORIZED',
        message: 'Invalid API key. Please check your provider configuration.',
        retryable: false
      }
      mockSendMessageStream.mockRejectedValue(new MockAPIClientError('Unauthorized', apiError, 401))

      await useChatStore.getState().sendMessage(
        'conv-1',
        'Hello',
        'openai',
        mockConfig
      )

      expect(useChatStore.getState().error).toBe(
        'Invalid API key. Please check your provider configuration.'
      )
    })

    it('should handle 429 rate limit error', async () => {
      const apiError = {
        code: 'RATE_LIMITED',
        message: 'Rate limit exceeded. Please wait a moment and try again.',
        retryable: true
      }
      mockSendMessageStream.mockRejectedValue(new MockAPIClientError('Rate limited', apiError, 429))

      await useChatStore.getState().sendMessage(
        'conv-1',
        'Hello',
        'openai',
        mockConfig
      )

      expect(useChatStore.getState().error).toBe(
        'Rate limit exceeded. Please wait a moment and try again.'
      )
      expect(useChatStore.getState().retryable).toBe(true)
    })

    it('should handle 500 server error', async () => {
      const apiError = {
        code: 'PROVIDER_ERROR',
        message: 'Provider service error. Please try again later.',
        retryable: false
      }
      mockSendMessageStream.mockRejectedValue(new MockAPIClientError('Server error', apiError, 500))

      await useChatStore.getState().sendMessage(
        'conv-1',
        'Hello',
        'openai',
        mockConfig
      )

      expect(useChatStore.getState().error).toBe(
        'Provider service error. Please try again later.'
      )
    })

    it('should handle connection error', async () => {
      const apiError = {
        code: 'NETWORK_ERROR',
        message: 'Cannot connect to API server. Please ensure the server is running.',
        retryable: true
      }
      mockSendMessageStream.mockRejectedValue(new MockAPIClientError('fetch failed', apiError))

      await useChatStore.getState().sendMessage(
        'conv-1',
        'Hello',
        'openai',
        mockConfig
      )

      expect(useChatStore.getState().error).toBe(
        'Cannot connect to API server. Please ensure the server is running.'
      )
    })

    it('should handle timeout error', async () => {
      const apiError = {
        code: 'TIMEOUT',
        message: 'Request timeout. Please check your network connection.',
        retryable: true
      }
      mockSendMessageStream.mockRejectedValue(new MockAPIClientError('Timeout', apiError, 504))

      await useChatStore.getState().sendMessage(
        'conv-1',
        'Hello',
        'openai',
        mockConfig
      )

      expect(useChatStore.getState().error).toBe(
        'Request timeout. Please check your network connection.'
      )
    })

    it('should update assistant message with error content', async () => {
      const apiError = {
        code: 'INTERNAL_ERROR',
        message: 'Test error',
        retryable: false
      }
      mockSendMessageStream.mockRejectedValue(new MockAPIClientError('Test error', apiError))

      await useChatStore.getState().sendMessage(
        'conv-1',
        'Hello',
        'openai',
        mockConfig
      )

      expect(mockUpdateConversation).toHaveBeenCalled()
    })

    it('should store lastError for APIClientError', async () => {
      const apiError = {
        code: 'RATE_LIMITED',
        message: 'Rate limit exceeded',
        retryable: true
      }
      mockSendMessageStream.mockRejectedValue(new MockAPIClientError('Rate limited', apiError, 429))

      await useChatStore.getState().sendMessage(
        'conv-1',
        'Hello',
        'openai',
        mockConfig
      )

      expect(useChatStore.getState().lastError).toEqual(apiError)
    })
  })

  describe('approveToolCall', () => {
    const mockProvider = {
      id: 'p1',
      name: 'OpenAI',
      type: 'openai',
      apiKey: 'key',
      baseURL: null,
      apiFormat: 'chat-completions',
      enabled: true,
      createdAt: new Date(),
    }

    const mockModel = {
      id: 'm1',
      providerId: 'p1',
      modelId: 'gpt-4',
      name: 'GPT-4',
      description: null,
      enabled: true,
      createdAt: new Date(),
    }

    it('should send allow-once approval message', async () => {
      const mockConversation = {
        id: 'conv-1',
        messages: [{ id: '1', role: 'user', content: 'Hello' }]
      }
      mockGetCurrentConversation.mockReturnValue(mockConversation)
      mockGetCurrentProvider.mockReturnValue(mockProvider)
      mockGetCurrentModel.mockReturnValue(mockModel)
      mockSendMessageStream.mockResolvedValue(undefined)

      await useChatStore.getState().approveToolCall('conv-1', 'tc-1', 'Bash', false)

      expect(mockSendMessageStream).toHaveBeenCalledWith(
        'openai',
        expect.any(Array),
        expect.objectContaining({ apiKey: 'key', model: 'gpt-4' }),
        expect.any(Function),
        expect.any(AbortSignal),
        expect.objectContaining({ allowOnceToolCallIds: ['tc-1'] })
      )
    })
  })
})

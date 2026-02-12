import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  mockSystemPrompts,
  mockConversationWithPrompt,
  mockConversationWithoutPrompt,
} from '../../../../../tests/fixtures/prompts'

/**
 * 系统提示词集成测试
 *
 * 测试目标：
 * - 系统提示词合并流程
 * - 全局系统提示词持久化
 * - 对话系统提示词处理
 */

// Use vi.hoisted for mock setup
const {
  mockSendMessageStream,
  mockGetCurrentConversation,
  mockGetGlobalSystemPrompt,
} = vi.hoisted(() => ({
  mockSendMessageStream: vi.fn(),
  mockGetCurrentConversation: vi.fn(),
  mockGetGlobalSystemPrompt: vi.fn(() => ''),
}))

// Mock window.api for skills
beforeEach(() => {
  ;(global as any).window = {
    api: {
      skills: {
        getAll: vi.fn().mockResolvedValue([]),
      },
    },
  }
})

// Mock apiClient
vi.mock('../../services/apiClient', () => ({
  apiClient: {
    sendMessageStream: mockSendMessageStream,
  },
  APIClientError: class extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'APIClientError'
    }
  },
}))

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid'),
}))

// Mock conversationStore
vi.mock('../conversationStore', () => ({
  useConversationStore: {
    getState: () => ({
      getCurrentConversation: mockGetCurrentConversation,
      addMessage: vi.fn(),
      updateConversation: vi.fn(),
      renameConversation: vi.fn(),
      getEffectiveWorkspace: () => '/test/workspace',
    }),
  },
}))

// Mock settingsStore
vi.mock('../settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      getCurrentProvider: vi.fn(() => ({
        id: 'p1',
        type: 'openai',
        apiKey: 'key',
      })),
      getCurrentModel: vi.fn(() => ({ id: 'm1', modelId: 'gpt-4' })),
      getToolPermissions: vi.fn(() => ({ allowAll: false })),
      setToolAllowAll: vi.fn(),
      temperature: 1,
      thinkingEnabled: false,
      globalSystemPrompt: mockGetGlobalSystemPrompt(),
    }),
  },
}))

// Mock workspaceStore
vi.mock('../workspaceStore', () => ({
  useWorkspaceStore: {
    getState: () => ({ workspacePath: '/test/workspace' }),
  },
}))

import { useChatStore } from '../chatStore'

describe('Prompts Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useChatStore.setState({
      isLoading: false,
      error: null,
      lastError: null,
      retryable: false,
    })
    mockSendMessageStream.mockResolvedValue(undefined)
  })

  describe('系统提示词合并流程', () => {
    it('should merge global and conversation prompts under Custom Instructions', async () => {
      mockGetGlobalSystemPrompt.mockReturnValue(mockSystemPrompts.global)
      mockGetCurrentConversation.mockReturnValue({
        ...mockConversationWithPrompt,
        messages: [{ id: '1', role: 'user', content: 'Hello' }],
      })

      await useChatStore
        .getState()
        .sendMessage('conv-1', 'Test message', 'openai', {
          apiKey: 'key',
          model: 'gpt-4',
        })

      expect(mockSendMessageStream).toHaveBeenCalled()
      const aiMessages = mockSendMessageStream.mock.calls[0][1]
      const systemMessage = aiMessages[0]

      expect(systemMessage.role).toBe('system')
      expect(systemMessage.content).toContain('## Custom Instructions')
      expect(systemMessage.content).toContain(mockSystemPrompts.global)
      expect(systemMessage.content).toContain(
        mockConversationWithPrompt.systemPrompt
      )
    })

    it('should only include global prompt when no conversation prompt', async () => {
      mockGetGlobalSystemPrompt.mockReturnValue(mockSystemPrompts.global)
      mockGetCurrentConversation.mockReturnValue({
        ...mockConversationWithoutPrompt,
        messages: [{ id: '1', role: 'user', content: 'Hello' }],
      })

      await useChatStore
        .getState()
        .sendMessage('conv-1', 'Test message', 'openai', {
          apiKey: 'key',
          model: 'gpt-4',
        })

      const aiMessages = mockSendMessageStream.mock.calls[0][1]
      const systemMessage = aiMessages[0]

      expect(systemMessage.content).toContain('## Custom Instructions')
      expect(systemMessage.content).toContain(mockSystemPrompts.global)
    })

    it('should only include conversation prompt when no global prompt', async () => {
      mockGetGlobalSystemPrompt.mockReturnValue('')
      mockGetCurrentConversation.mockReturnValue({
        ...mockConversationWithPrompt,
        messages: [{ id: '1', role: 'user', content: 'Hello' }],
      })

      await useChatStore
        .getState()
        .sendMessage('conv-1', 'Test message', 'openai', {
          apiKey: 'key',
          model: 'gpt-4',
        })

      const aiMessages = mockSendMessageStream.mock.calls[0][1]
      const systemMessage = aiMessages[0]

      expect(systemMessage.content).toContain('## Custom Instructions')
      expect(systemMessage.content).toContain(
        mockConversationWithPrompt.systemPrompt
      )
    })

    it('should not include Custom Instructions section when no prompts', async () => {
      mockGetGlobalSystemPrompt.mockReturnValue('')
      mockGetCurrentConversation.mockReturnValue({
        ...mockConversationWithoutPrompt,
        messages: [{ id: '1', role: 'user', content: 'Hello' }],
      })

      await useChatStore
        .getState()
        .sendMessage('conv-1', 'Test message', 'openai', {
          apiKey: 'key',
          model: 'gpt-4',
        })

      const aiMessages = mockSendMessageStream.mock.calls[0][1]
      const systemMessage = aiMessages[0]

      expect(systemMessage.content).not.toContain('## Custom Instructions')
    })
  })

  describe('提示词顺序', () => {
    it('should place global prompt before conversation prompt', async () => {
      mockGetGlobalSystemPrompt.mockReturnValue('GLOBAL_PROMPT')
      mockGetCurrentConversation.mockReturnValue({
        ...mockConversationWithPrompt,
        systemPrompt: 'CONVERSATION_PROMPT',
        messages: [{ id: '1', role: 'user', content: 'Hello' }],
      })

      await useChatStore
        .getState()
        .sendMessage('conv-1', 'Test message', 'openai', {
          apiKey: 'key',
          model: 'gpt-4',
        })

      const aiMessages = mockSendMessageStream.mock.calls[0][1]
      const systemMessage = aiMessages[0]

      const globalIndex = systemMessage.content.indexOf('GLOBAL_PROMPT')
      const convIndex = systemMessage.content.indexOf('CONVERSATION_PROMPT')

      expect(globalIndex).toBeLessThan(convIndex)
    })
  })
})

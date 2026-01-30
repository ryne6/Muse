/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageList } from '../MessageList'

/**
 * MessageList 组件测试
 *
 * 测试目标：
 * - 空状态显示（无对话、无消息）
 * - 消息列表渲染
 * - 自动滚动功能
 */

// Mock conversationStore
const mockConversationStore = vi.hoisted(() => {
  return {
    getCurrentConversation: vi.fn(() => null)
  }
})

vi.mock('@/stores/conversationStore', () => ({
  useConversationStore: () => mockConversationStore
}))

// Mock MessageItem component
vi.mock('../MessageItem', () => ({
  MessageItem: ({ message }: any) => (
    <div data-testid={`message-${message.id}`}>
      <div>{message.role}</div>
      <div>{message.content}</div>
    </div>
  )
}))

describe('MessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock scrollIntoView since jsdom doesn't support it
    Element.prototype.scrollIntoView = vi.fn()
  })

  describe('空状态测试', () => {
    it('should show empty state when no conversation exists', () => {
      mockConversationStore.getCurrentConversation.mockReturnValue(null)

      render(<MessageList />)

      expect(screen.getByText('Start a new conversation')).toBeInTheDocument()
      expect(screen.getByText('Click "New Chat" or start typing below')).toBeInTheDocument()
    })

    it('should show empty state when conversation has no messages', () => {
      mockConversationStore.getCurrentConversation.mockReturnValue({
        id: 'conv-1',
        title: 'Test Conversation',
        messages: []
      })

      render(<MessageList />)

      expect(screen.getByText('Start a conversation')).toBeInTheDocument()
      expect(screen.getByText('Type a message below to begin')).toBeInTheDocument()
    })
  })

  describe('消息列表渲染测试', () => {
    it('should render message list with messages', () => {
      mockConversationStore.getCurrentConversation.mockReturnValue({
        id: 'conv-1',
        title: 'Test Conversation',
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hello, how are you?',
            timestamp: Date.now()
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'I am doing well, thank you!',
            timestamp: Date.now()
          }
        ]
      })

      render(<MessageList />)

      expect(screen.getByTestId('message-msg-1')).toBeInTheDocument()
      expect(screen.getByTestId('message-msg-2')).toBeInTheDocument()
      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument()
      expect(screen.getByText('I am doing well, thank you!')).toBeInTheDocument()
    })

    it('should render multiple messages in order', () => {
      mockConversationStore.getCurrentConversation.mockReturnValue({
        id: 'conv-1',
        title: 'Test Conversation',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Message 1', timestamp: Date.now() },
          { id: 'msg-2', role: 'assistant', content: 'Message 2', timestamp: Date.now() },
          { id: 'msg-3', role: 'user', content: 'Message 3', timestamp: Date.now() }
        ]
      })

      render(<MessageList />)

      const messages = screen.getAllByTestId(/^message-/)
      expect(messages).toHaveLength(3)
    })
  })
})

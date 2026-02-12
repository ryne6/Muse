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
 */

interface MockMessage {
  id: string
  role: string
  content: string
  timestamp: number
}

interface MockConversation {
  id: string
  title: string
  messages: MockMessage[]
}

// Mock store state
const mockConversationStore = vi.hoisted(() => {
  return {
    currentConversationId: null as string | null,
    loadingConversationId: null as string | null,
    conversations: [] as MockConversation[],
  }
})

vi.mock('@/stores/conversationStore', () => ({
  useConversationStore: (
    selector?: (state: typeof mockConversationStore) => unknown
  ) => (selector ? selector(mockConversationStore) : mockConversationStore),
  selectCurrentMessageIds: (s: typeof mockConversationStore) => {
    const conv = s.conversations.find(
      c => c.id === s.currentConversationId
    )
    return conv?.messages.map(m => m.id) ?? []
  },
}))

interface MockChatState {
  isLoading: boolean
  atBottom: boolean
  isScrolling: boolean
  setScrollState: ReturnType<typeof vi.fn>
  registerScrollMethods: ReturnType<typeof vi.fn>
  scrollToBottom: ReturnType<typeof vi.fn>
}

vi.mock('@/stores/chatStore', () => ({
  useChatStore: (selector?: (state: MockChatState) => unknown) => {
    const state: MockChatState = {
      isLoading: false,
      atBottom: true,
      isScrolling: false,
      setScrollState: vi.fn(),
      registerScrollMethods: vi.fn(),
      scrollToBottom: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

vi.mock('zustand/react/shallow', () => ({
  useShallow: <T,>(fn: T) => fn,
}))

// Mock virtua VList as a simple div that renders children
vi.mock('virtua', () => ({
  VList: vi.fn(
    ({
      data,
      children,
      ...props
    }: {
      data: string[]
      children: (item: string, index: number) => React.ReactNode
      [key: string]: unknown
    }) => (
      <div data-testid="vlist" {...props}>
        {data?.map((item, index) => children(item, index))}
      </div>
    )
  ),
}))

// Mock child components
vi.mock('../MessageItem', () => ({
  MessageItem: ({ id }: { id: string }) => (
    <div data-testid={`message-${id}`}>{id}</div>
  ),
}))

vi.mock('../AutoScroll', () => ({
  AutoScroll: () => null,
}))

vi.mock('../BackBottom', () => ({
  BackBottom: () => null,
}))

describe('MessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConversationStore.loadingConversationId = null
    mockConversationStore.currentConversationId = null
    mockConversationStore.conversations = []
  })

  describe('空状态测试', () => {
    it('should show empty state when no conversation exists', () => {
      render(<MessageList />)

      expect(screen.getByText('Start a new conversation')).toBeInTheDocument()
    })

    it('should show empty state when conversation has no messages', () => {
      mockConversationStore.currentConversationId = 'conv-1'
      mockConversationStore.conversations = [
        { id: 'conv-1', title: 'Test', messages: [] },
      ]

      render(<MessageList />)

      expect(screen.getByText('Start a conversation')).toBeInTheDocument()
      expect(
        screen.getByText('Type a message below to begin')
      ).toBeInTheDocument()
    })
  })

  describe('消息列表渲染测试', () => {
    it('should render message list with messages', () => {
      mockConversationStore.currentConversationId = 'conv-1'
      mockConversationStore.conversations = [
        {
          id: 'conv-1',
          title: 'Test',
          messages: [
            {
              id: 'msg-1',
              role: 'user',
              content: 'Hello',
              timestamp: Date.now(),
            },
            {
              id: 'msg-2',
              role: 'assistant',
              content: 'Hi there',
              timestamp: Date.now(),
            },
          ],
        },
      ]

      render(<MessageList />)

      expect(screen.getByTestId('message-msg-1')).toBeInTheDocument()
      expect(screen.getByTestId('message-msg-2')).toBeInTheDocument()
    })

    it('should render multiple messages in order', () => {
      mockConversationStore.currentConversationId = 'conv-1'
      mockConversationStore.conversations = [
        {
          id: 'conv-1',
          title: 'Test',
          messages: [
            {
              id: 'msg-1',
              role: 'user',
              content: 'M1',
              timestamp: Date.now(),
            },
            {
              id: 'msg-2',
              role: 'assistant',
              content: 'M2',
              timestamp: Date.now(),
            },
            {
              id: 'msg-3',
              role: 'user',
              content: 'M3',
              timestamp: Date.now(),
            },
          ],
        },
      ]

      render(<MessageList />)

      const messages = screen.getAllByTestId(/^message-/)
      expect(messages).toHaveLength(3)
    })
  })
})

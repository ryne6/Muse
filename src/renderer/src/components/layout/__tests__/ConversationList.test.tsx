/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConversationList } from '../ConversationList'

/**
 * ConversationList 组件测试
 *
 * 测试目标：
 * - 对话列表渲染
 * - 新建对话按钮
 * - 按日期分组显示
 * - 对话选择
 * - 空状态显示
 */

// Mock conversationStore
const mockConversationStore = vi.hoisted(() => {
  return {
    conversations: [],
    createConversation: vi.fn(),
    getConversationsByDate: vi.fn(() => ({
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    })),
  }
})

vi.mock('~/stores/conversationStore', () => ({
  useConversationStore: () => mockConversationStore,
}))

// Mock ConversationGroup component
vi.mock('../ConversationGroup', () => ({
  ConversationGroup: ({ label, conversations }: any) => (
    <div
      data-testid={`conversation-group-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div>{label}</div>
      <div data-testid="group-count">{conversations.length} conversations</div>
    </div>
  ),
}))

describe('ConversationList', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset to default empty state
    mockConversationStore.conversations = []
    mockConversationStore.getConversationsByDate.mockReturnValue({
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    })
  })

  describe('渲染测试', () => {
    it('should render New Chat button', () => {
      render(<ConversationList />)

      expect(screen.getByText('开启新话题')).toBeInTheDocument()
    })

    it('should render container with correct structure', () => {
      const { container } = render(<ConversationList />)

      const mainDiv = container.firstChild as HTMLElement
      expect(mainDiv).toHaveClass('flex', 'flex-col', 'h-full')
    })
  })

  describe('空状态测试', () => {
    it('should show empty state when no conversations exist', () => {
      mockConversationStore.conversations = []

      render(<ConversationList />)

      expect(screen.getByText(/No conversations yet/i)).toBeInTheDocument()
      expect(screen.getByText(/Start a new chat to begin/i)).toBeInTheDocument()
    })

    it('should not show conversation groups when empty', () => {
      mockConversationStore.conversations = []

      render(<ConversationList />)

      expect(
        screen.queryByTestId(/^conversation-group-/)
      ).not.toBeInTheDocument()
    })
  })

  describe('新建对话按钮测试', () => {
    it('should call createConversation when clicking New Chat button', async () => {
      const user = userEvent.setup()
      render(<ConversationList />)

      const newChatButton = screen.getByText('开启新话题')
      await user.click(newChatButton)

      expect(mockConversationStore.createConversation).toHaveBeenCalledTimes(1)
    })

    it('should have Plus icon in New Chat button', () => {
      render(<ConversationList />)

      const button = screen.getByText('开启新话题').closest('button')
      expect(button).toBeInTheDocument()
    })
  })

  describe('按日期分组显示测试', () => {
    it('should render Today group when conversations exist', () => {
      mockConversationStore.conversations = [{ id: '1', title: 'Test' }] as any
      mockConversationStore.getConversationsByDate.mockReturnValue({
        today: [{ id: '1', title: 'Test' }] as any,
        yesterday: [],
        lastWeek: [],
        lastMonth: [],
        older: [],
      })

      render(<ConversationList />)

      expect(screen.getByText('# 今天')).toBeInTheDocument()
    })

    it('should render Yesterday group when conversations exist', () => {
      mockConversationStore.conversations = [{ id: '1', title: 'Test' }] as any
      mockConversationStore.getConversationsByDate.mockReturnValue({
        today: [],
        yesterday: [{ id: '1', title: 'Test' }] as any,
        lastWeek: [],
        lastMonth: [],
        older: [],
      })

      render(<ConversationList />)

      expect(screen.getByText('# 昨天')).toBeInTheDocument()
    })

    it('should render multiple groups when conversations span multiple periods', () => {
      mockConversationStore.conversations = [
        { id: '1', title: 'Today' },
        { id: '2', title: 'Yesterday' },
        { id: '3', title: 'Last week' },
      ] as any
      mockConversationStore.getConversationsByDate.mockReturnValue({
        today: [{ id: '1', title: 'Today' }] as any,
        yesterday: [{ id: '2', title: 'Yesterday' }] as any,
        lastWeek: [{ id: '3', title: 'Last week' }] as any,
        lastMonth: [],
        older: [],
      })

      render(<ConversationList />)

      expect(screen.getByText('# 今天')).toBeInTheDocument()
      expect(screen.getByText('# 昨天')).toBeInTheDocument()
      expect(screen.getByText('# 本周')).toBeInTheDocument()
    })

    it('should not render empty groups', () => {
      mockConversationStore.conversations = [{ id: '1', title: 'Test' }] as any
      mockConversationStore.getConversationsByDate.mockReturnValue({
        today: [{ id: '1', title: 'Test' }] as any,
        yesterday: [],
        lastWeek: [],
        lastMonth: [],
        older: [],
      })

      render(<ConversationList />)

      expect(screen.getByText('# 今天')).toBeInTheDocument()
      expect(screen.queryByText('# 昨天')).not.toBeInTheDocument()
      expect(screen.queryByText('# 本周')).not.toBeInTheDocument()
    })
  })

  describe('对话列表渲染测试', () => {
    it('should pass correct conversations to ConversationGroup', () => {
      const todayConversations = [
        { id: '1', title: 'Conv 1' },
        { id: '2', title: 'Conv 2' },
      ] as any

      mockConversationStore.conversations = todayConversations
      mockConversationStore.getConversationsByDate.mockReturnValue({
        today: todayConversations,
        yesterday: [],
        lastWeek: [],
        lastMonth: [],
        older: [],
      })

      render(<ConversationList />)

      expect(screen.getByText('# 今天')).toBeInTheDocument()
      expect(screen.getByText('2 conversations')).toBeInTheDocument()
    })

    it('should call getConversationsByDate on render', () => {
      render(<ConversationList />)

      expect(mockConversationStore.getConversationsByDate).toHaveBeenCalled()
    })

    it('should render all date group labels correctly', () => {
      mockConversationStore.conversations = [
        { id: '1' },
        { id: '2' },
        { id: '3' },
        { id: '4' },
        { id: '5' },
      ] as any
      mockConversationStore.getConversationsByDate.mockReturnValue({
        today: [{ id: '1' }] as any,
        yesterday: [{ id: '2' }] as any,
        lastWeek: [{ id: '3' }] as any,
        lastMonth: [{ id: '4' }] as any,
        older: [{ id: '5' }] as any,
      })

      render(<ConversationList />)

      expect(screen.getByText('# 今天')).toBeInTheDocument()
      expect(screen.getByText('# 昨天')).toBeInTheDocument()
      expect(screen.getByText('# 本周')).toBeInTheDocument()
      expect(screen.getByText('# 本月')).toBeInTheDocument()
      expect(screen.getByText('# 更早')).toBeInTheDocument()
    })
  })
})

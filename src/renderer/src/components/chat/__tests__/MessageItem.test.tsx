/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MessageItem } from '../MessageItem'

vi.mock('~/assets/providers/logo.png', () => ({
  default: 'logo.png',
}))

vi.mock('../MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}))

const mockMessages = [
  {
    id: 'm1',
    role: 'assistant',
    content: 'Hello',
    timestamp: Date.now(),
    attachments: [],
  },
  {
    id: 'm2',
    role: 'user',
    content: 'hi',
    timestamp: Date.now(),
    attachments: [],
  },
]

const mockConversationStore = vi.hoisted(() => ({
  currentConversationId: 'conv-1',
  conversations: [
    {
      id: 'conv-1',
      title: 'Test',
      messages: [] as (typeof mockMessages)[number][],
    },
  ],
}))

vi.mock('~/stores/conversationStore', () => ({
  useConversationStore: (
    selector?: (state: typeof mockConversationStore) => unknown
  ) => (selector ? selector(mockConversationStore) : mockConversationStore),
}))

describe('MessageItem', () => {
  it('renders assistant header with name and timestamp', () => {
    mockConversationStore.conversations[0].messages = mockMessages
    render(<MessageItem id="m1" />)
    expect(screen.getByText('Crow')).toBeInTheDocument()
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument()
  })

  it('renders user message as a bubble only', () => {
    mockConversationStore.conversations[0].messages = mockMessages
    render(<MessageItem id="m2" />)
    const bubble = screen.getByText('hi').closest('[data-user-bubble]')
    expect(bubble).toBeTruthy()
  })

  it('returns null for unknown id', () => {
    mockConversationStore.conversations[0].messages = mockMessages
    const { container } = render(<MessageItem id="unknown" />)
    expect(container.innerHTML).toBe('')
  })
})

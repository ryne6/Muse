/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MessageItem } from '../MessageItem'

vi.mock('@/assets/providers/logo.png', () => ({
  default: 'logo.png'
}))

vi.mock('../MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>
}))

const baseMessage = {
  id: 'm1',
  role: 'assistant',
  content: 'Hello',
  timestamp: Date.now(),
  attachments: [],
} as any

describe('MessageItem', () => {
  it('renders assistant header with name and timestamp', () => {
    render(<MessageItem message={baseMessage} />)
    expect(screen.getByText('Lobe AI')).toBeInTheDocument()
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument()
  })

  it('renders user message as a bubble only', () => {
    render(<MessageItem message={{ ...baseMessage, role: 'user', content: 'hi' }} />)
    const bubble = screen.getByText('hi').closest('[data-user-bubble]')
    expect(bubble).toBeTruthy()
  })
})

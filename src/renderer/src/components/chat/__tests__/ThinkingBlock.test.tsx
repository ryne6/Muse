/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThinkingBlock } from '../ThinkingBlock'

vi.mock('lucide-react', () => {
  const make = (name: string) => {
    const Icon = (props: any) => <span data-testid={name} {...props} />
    Icon.displayName = name
    return Icon
  }
  return {
    ChevronDown: make('ChevronDown'),
    ChevronUp: make('ChevronUp'),
  }
})

vi.mock('@lobehub/ui', () => ({
  ScrollArea: ({ children }: any) => (
    <div data-testid="ScrollArea">{children}</div>
  ),
}))

describe('ThinkingBlock', () => {
  it('returns null when thinking content is empty', () => {
    const { container } = render(<ThinkingBlock thinking="" />)
    expect(container.innerHTML).toBe('')
  })

  it('shows in-progress title when not complete', () => {
    render(<ThinkingBlock thinking="analyzing..." isComplete={false} />)
    expect(screen.getByText('Thinking...')).toBeInTheDocument()
  })

  it('shows complete title when complete', () => {
    render(<ThinkingBlock thinking="done" isComplete />)
    expect(screen.getByText('Thought for a moment')).toBeInTheDocument()
  })

  it('does not show expand button for short text', () => {
    render(<ThinkingBlock thinking="short text" />)
    expect(screen.queryByText('展开')).not.toBeInTheDocument()
  })

  it('expands and collapses for long text', () => {
    const longThinking = 'x'.repeat(260)
    render(<ThinkingBlock thinking={longThinking} />)

    expect(screen.getByText('展开')).toBeInTheDocument()
    expect(screen.queryByTestId('ScrollArea')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('展开'))
    expect(screen.getByText('收起')).toBeInTheDocument()
    expect(screen.getByTestId('ScrollArea')).toBeInTheDocument()

    fireEvent.click(screen.getByText('收起'))
    expect(screen.getByText('展开')).toBeInTheDocument()
    expect(screen.queryByTestId('ScrollArea')).not.toBeInTheDocument()
  })
})

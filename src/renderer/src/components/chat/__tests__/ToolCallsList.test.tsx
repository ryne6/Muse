/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ToolCallsList } from '../ToolCallsList'
import type { ToolCall, ToolResult } from '~shared/types/conversation'

vi.mock('lucide-react', () => {
  const make = (name: string) => {
    const Icon = (props: any) => <span data-testid={name} {...props} />
    Icon.displayName = name
    return Icon
  }

  return {
    FileText: make('FileText'),
    FilePlus: make('FilePlus'),
    FileEdit: make('FileEdit'),
    Folder: make('Folder'),
    Wrench: make('Wrench'),
    CheckCircle2: make('CheckCircle2'),
    XCircle: make('XCircle'),
    Loader2: make('Loader2'),
    ChevronDown: make('ChevronDown'),
    ChevronUp: make('ChevronUp'),
    ChevronRight: make('ChevronRight'),
    Terminal: make('Terminal'),
    ListTodo: make('ListTodo'),
    createLucideIcon: (name: string) => make(name),
  }
})

vi.mock('@lobehub/ui', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('~/stores/chatStore', () => ({
  useChatStore: (selector: any) =>
    selector({ approveToolCall: vi.fn() }),
}))

vi.mock('~/stores/conversationStore', () => ({
  useConversationStore: (selector: any) =>
    selector({ currentConversationId: 'conv-1' }),
}))

describe('ToolCallsList', () => {
  describe('TodoWrite filtering', () => {
    it('filters out TodoWrite tool calls', () => {
      const toolCalls: ToolCall[] = [
        { id: 'tc-1', name: 'Read', input: { path: '~main/foo' } },
        { id: 'tc-2', name: 'TodoWrite', input: { todos: [] } },
      ]
      render(<ToolCallsList toolCalls={toolCalls} />)
      expect(screen.getByTestId('FileText')).toBeTruthy()
      expect(screen.queryByTestId('ListTodo')).toBeNull()
    })

    it('returns null when all tool calls are TodoWrite', () => {
      const toolCalls: ToolCall[] = [
        { id: 'tc-1', name: 'TodoWrite', input: {} },
        { id: 'tc-2', name: 'TodoWrite', input: {} },
      ]
      const { container } = render(<ToolCallsList toolCalls={toolCalls} />)
      expect(container.innerHTML).toBe('')
    })

    it('returns null for empty tool calls array', () => {
      const { container } = render(<ToolCallsList toolCalls={[]} />)
      expect(container.innerHTML).toBe('')
    })
  })

  describe('tool result matching', () => {
    it('renders tool calls with matching results', () => {
      const toolCalls: ToolCall[] = [
        { id: 'tc-1', name: 'Read', input: { path: '~main/foo' } },
        { id: 'tc-2', name: 'Bash', input: { command: 'ls' } },
      ]
      const toolResults: ToolResult[] = [
        { toolCallId: 'tc-1', output: 'file content' },
        { toolCallId: 'tc-2', output: 'dir listing' },
      ]
      render(
        <ToolCallsList toolCalls={toolCalls} toolResults={toolResults} />
      )
      expect(screen.getByTestId('FileText')).toBeTruthy()
      expect(screen.getByTestId('Terminal')).toBeTruthy()
    })

    it('renders tool calls without results (pending state)', () => {
      const toolCalls: ToolCall[] = [
        { id: 'tc-1', name: 'Read', input: { path: '~main/foo' } },
      ]
      render(<ToolCallsList toolCalls={toolCalls} toolResults={[]} />)
      expect(screen.getByTestId('FileText')).toBeTruthy()
    })

    it('renders multiple non-TodoWrite calls while filtering TodoWrite', () => {
      const toolCalls: ToolCall[] = [
        { id: 'tc-1', name: 'Read', input: {} },
        { id: 'tc-2', name: 'TodoWrite', input: {} },
        { id: 'tc-3', name: 'Write', input: {} },
        { id: 'tc-4', name: 'TodoWrite', input: {} },
        { id: 'tc-5', name: 'Bash', input: {} },
      ]
      render(<ToolCallsList toolCalls={toolCalls} />)
      expect(screen.getByTestId('FileText')).toBeTruthy()
      expect(screen.getByTestId('FilePlus')).toBeTruthy()
      expect(screen.getByTestId('Terminal')).toBeTruthy()
      expect(screen.queryByTestId('ListTodo')).toBeNull()
    })
  })
})

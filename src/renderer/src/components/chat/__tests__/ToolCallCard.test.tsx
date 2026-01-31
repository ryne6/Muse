/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToolCallCard } from '../ToolCallCard'
import type { ToolCall, ToolResult } from '@shared/types/conversation'

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
    Terminal: make('Terminal'),
    ListTodo: make('ListTodo'),
  }
})

const renderCard = (name: string) => {
  const toolCall: ToolCall = { id: 'tool-1', name, input: {} }
  const toolResult: ToolResult = { toolCallId: 'tool-1', output: 'ok' }
  render(<ToolCallCard toolCall={toolCall} toolResult={toolResult} />)
}

describe('ToolCallCard', () => {
  it('renders Read icon', () => {
    renderCard('Read')
    expect(screen.getByTestId('FileText')).toBeTruthy()
  })

  it('renders Write icon', () => {
    renderCard('Write')
    expect(screen.getByTestId('FilePlus')).toBeTruthy()
  })

  it('renders Edit icon', () => {
    renderCard('Edit')
    expect(screen.getByTestId('FileEdit')).toBeTruthy()
  })

  it('renders LS icon', () => {
    renderCard('LS')
    expect(screen.getByTestId('Folder')).toBeTruthy()
  })

  it('renders Bash icon', () => {
    renderCard('Bash')
    expect(screen.getByTestId('Terminal')).toBeTruthy()
  })

  it('renders TodoWrite icon', () => {
    renderCard('TodoWrite')
    expect(screen.getByTestId('ListTodo')).toBeTruthy()
  })
})

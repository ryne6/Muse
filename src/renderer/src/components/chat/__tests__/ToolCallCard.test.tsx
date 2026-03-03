/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToolCallCard } from '../ToolCallCard'
import type { ToolCall, ToolResult } from '~shared/types/conversation'
import { TOOL_PERMISSION_PREFIX } from '~shared/types/toolPermissions'
import { TOOL_QUESTION_PREFIX } from '~shared/types/toolQuestions'

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
    HelpCircle: make('HelpCircle'),
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

const mockApproveToolCall = vi.fn()
const mockDenyToolCall = vi.fn()
const mockSubmitQuestionAnswer = vi.fn()

vi.mock('~/stores/chatStore', () => ({
  useChatStore: (selector: any) =>
    selector({
      approveToolCall: mockApproveToolCall,
      denyToolCall: mockDenyToolCall,
      submitQuestionAnswer: mockSubmitQuestionAnswer,
    }),
}))

vi.mock('~/stores/conversationStore', () => ({
  useConversationStore: (selector: any) =>
    selector({ currentConversationId: 'conv-1' }),
}))

const renderCard = (name: string) => {
  const toolCall: ToolCall = { id: 'tool-1', name, input: {} }
  const toolResult: ToolResult = { toolCallId: 'tool-1', output: 'ok' }
  render(<ToolCallCard toolCall={toolCall} toolResult={toolResult} />)
}

describe('ToolCallCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders Question icon', () => {
    renderCard('Question')
    expect(screen.getByTestId('HelpCircle')).toBeTruthy()
  })

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

  it('renders permission prompt buttons when permission is required', () => {
    const toolCall: ToolCall = { id: 'tool-1', name: 'Bash', input: {} }
    const toolResult: ToolResult = {
      toolCallId: 'tool-1',
      output: `${TOOL_PERMISSION_PREFIX}${JSON.stringify({
        kind: 'permission_request',
        toolName: 'Bash',
        toolCallId: 'tool-1',
      })}`,
    }

    render(<ToolCallCard toolCall={toolCall} toolResult={toolResult} />)

    expect(screen.getByText('允许')).toBeTruthy()
    expect(screen.getByText('拒绝')).toBeTruthy()
  })

  it('renders question prompt and submits selected answer', async () => {
    mockSubmitQuestionAnswer.mockResolvedValue(undefined)
    const toolCall: ToolCall = {
      id: 'tool-q-1',
      name: 'Question',
      input: {
        question: 'Which environment should we deploy to?',
      },
    }
    const toolResult: ToolResult = {
      toolCallId: 'tool-q-1',
      output: `${TOOL_QUESTION_PREFIX}${JSON.stringify({
        kind: 'question_request',
        toolCallId: 'tool-q-1',
        question: 'Which environment should we deploy to?',
        choices: ['staging', 'production'],
        allowFreeText: false,
        required: true,
        submitLabel: 'Send Answer',
      })}`,
    }

    render(<ToolCallCard toolCall={toolCall} toolResult={toolResult} />)

    expect(
      screen.getByText('Which environment should we deploy to?')
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'staging' }))
    fireEvent.click(screen.getByRole('button', { name: 'Send Answer' }))

    await waitFor(() => {
      expect(mockSubmitQuestionAnswer).toHaveBeenCalledWith(
        'conv-1',
        'Question',
        'tool-q-1',
        'Which environment should we deploy to?',
        'staging'
      )
    })
  })
})

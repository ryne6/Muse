/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PromptsSettings } from '../PromptsSettings'

vi.mock('lucide-react', () => {
  const make = (name: string) => {
    const Icon = (props: any) => <span data-testid={name} {...props} />
    Icon.displayName = name
    return Icon
  }
  return {
    Plus: make('Plus'),
    Pencil: make('Pencil'),
    Trash2: make('Trash2'),
    FileText: make('FileText'),
  }
})

vi.mock('@lobehub/ui', () => ({
  Modal: ({ open, children, title, footer, onCancel }: any) =>
    open ? (
      <div role="dialog">
        <div>{title}</div>
        {children}
        {footer}
        <button onClick={onCancel}>modal-close</button>
      </div>
    ) : null,
  Dropdown: ({ children, menu }: any) => (
    <div>
      {children}
      {menu?.items?.map((item: any) => (
        <button key={item.key} onClick={item.onClick}>
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))

const { storeState, setGlobalSystemPromptMock } = vi.hoisted(() => {
  const state = {
    globalSystemPrompt: 'initial prompt',
    setGlobalSystemPrompt: vi.fn(),
  }
  return {
    storeState: state,
    setGlobalSystemPromptMock: state.setGlobalSystemPrompt,
  }
})

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: (selector: any) => selector(storeState),
}))

const notifySuccess = vi.fn()
const notifyError = vi.fn()

vi.mock('@/utils/notify', () => ({
  notify: {
    success: (...args: any[]) => notifySuccess(...args),
    error: (...args: any[]) => notifyError(...args),
  },
}))

describe('PromptsSettings', () => {
  const getAllMock = vi.fn()
  const createMock = vi.fn()
  const updateMock = vi.fn()
  const deleteMock = vi.fn()

  const preset = {
    id: 'preset-1',
    name: 'React Expert',
    content: 'You are a React expert',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getAllMock.mockResolvedValue([])
    createMock.mockResolvedValue(preset)
    updateMock.mockResolvedValue(preset)
    deleteMock.mockResolvedValue({ success: true })

    ;(window as any).api.promptPresets = {
      getAll: getAllMock,
      create: createMock,
      update: updateMock,
      delete: deleteMock,
    }

    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders empty preset state', async () => {
    render(<PromptsSettings />)

    await waitFor(() => {
      expect(screen.getByText('No presets yet')).toBeInTheDocument()
    })
    expect(screen.getByText('Create presets for quick access')).toBeInTheDocument()
  })

  it('selects preset and updates global system prompt', async () => {
    getAllMock.mockResolvedValue([preset])
    render(<PromptsSettings />)

    await waitFor(() => {
      expect(screen.getAllByText('React Expert').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'React Expert' })[0])

    expect(setGlobalSystemPromptMock).toHaveBeenCalledWith(
      'You are a React expert'
    )
    expect(notifySuccess).toHaveBeenCalledWith('Applied preset: React Expert')
  })

  it('validates required fields when creating preset', async () => {
    render(<PromptsSettings />)

    fireEvent.click(screen.getByRole('button', { name: /new preset/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(notifyError).toHaveBeenCalledWith('Name and content are required')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('creates a preset successfully', async () => {
    render(<PromptsSettings />)

    fireEvent.click(screen.getByRole('button', { name: /new preset/i }))
    fireEvent.change(screen.getByPlaceholderText('e.g., React Expert'), {
      target: { value: 'Code Reviewer' },
    })
    fireEvent.change(
      screen.getByPlaceholderText('Enter the system prompt content...'),
      {
        target: { value: 'Review code for bugs' },
      }
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith({
        name: 'Code Reviewer',
        content: 'Review code for bugs',
      })
    })
    expect(notifySuccess).toHaveBeenCalledWith('Preset created')
  })

  it('updates an existing preset', async () => {
    getAllMock.mockResolvedValue([preset])
    render(<PromptsSettings />)

    await waitFor(() => {
      expect(screen.getAllByText('React Expert').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByTestId('Pencil').closest('button')!)
    fireEvent.change(screen.getByPlaceholderText('e.g., React Expert'), {
      target: { value: 'React Architect' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith('preset-1', {
        name: 'React Architect',
        content: 'You are a React expert',
      })
    })
    expect(notifySuccess).toHaveBeenCalledWith('Preset updated')
  })

  it('handles save failure', async () => {
    createMock.mockRejectedValueOnce(new Error('save failed'))
    render(<PromptsSettings />)

    fireEvent.click(screen.getByRole('button', { name: /new preset/i }))
    fireEvent.change(screen.getByPlaceholderText('e.g., React Expert'), {
      target: { value: 'Broken Preset' },
    })
    fireEvent.change(
      screen.getByPlaceholderText('Enter the system prompt content...'),
      {
        target: { value: 'content' },
      }
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Failed to save preset')
    })
  })

  it('does not delete preset when confirm is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    getAllMock.mockResolvedValue([preset])
    render(<PromptsSettings />)

    await waitFor(() => {
      expect(screen.getAllByText('React Expert').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByTestId('Trash2').closest('button')!)
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it('deletes preset after confirmation', async () => {
    getAllMock.mockResolvedValue([preset])
    render(<PromptsSettings />)

    await waitFor(() => {
      expect(screen.getAllByText('React Expert').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByTestId('Trash2').closest('button')!)

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('preset-1')
    })
    expect(notifySuccess).toHaveBeenCalledWith('Preset deleted')
  })

  it('handles delete failure', async () => {
    deleteMock.mockRejectedValueOnce(new Error('delete failed'))
    getAllMock.mockResolvedValue([preset])
    render(<PromptsSettings />)

    await waitFor(() => {
      expect(screen.getAllByText('React Expert').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByTestId('Trash2').closest('button')!)

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Failed to delete preset')
    })
  })
})

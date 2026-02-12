/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('lucide-react', () => {
  const make = (name: string) => {
    const Icon = (props: any) => <span data-testid={name} {...props} />
    Icon.displayName = name
    return Icon
  }
  return {
    Plus: make('Plus'),
    Power: make('Power'),
    Trash2: make('Trash2'),
    Server: make('Server'),
    RefreshCw: make('RefreshCw'),
  }
})

vi.mock('@lobehub/ui', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))

vi.mock('@/utils/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/utils/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}))

const mockGetAll = vi.fn()
const mockGetServerStates = vi.fn()
const mockCreate = vi.fn()
const mockDelete = vi.fn()
const mockToggleEnabled = vi.fn()

vi.mock('@/services/dbClient', () => ({
  dbClient: {
    mcp: {
      getAll: (...args: any[]) => mockGetAll(...args),
      getServerStates: (...args: any[]) => mockGetServerStates(...args),
      create: (...args: any[]) => mockCreate(...args),
      delete: (...args: any[]) => mockDelete(...args),
      toggleEnabled: (...args: any[]) => mockToggleEnabled(...args),
    },
  },
}))

import { MCPSettings } from '../MCPSettings'
import { notify } from '@/utils/notify'

function makeServer(
  id: string,
  name: string,
  args: string[] | string | null | undefined
) {
  return { id, name, command: 'npx', args, enabled: true }
}

describe('MCPSettings — parseArgs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetServerStates.mockResolvedValue([])
    mockCreate.mockResolvedValue(undefined)
    mockDelete.mockResolvedValue(undefined)
    mockToggleEnabled.mockResolvedValue(undefined)
  })

  it('handles args as a normal string array', async () => {
    mockGetAll.mockResolvedValue([
      makeServer('s1', 'fs-server', ['-y', '@anthropic/mcp-server']),
    ])

    render(<MCPSettings />)

    await waitFor(() => {
      expect(screen.getByText(/npx/)).toBeInTheDocument()
    })
    expect(screen.getByText(/npx -y @anthropic\/mcp-server/)).toBeInTheDocument()
  })

  it('handles args as a legacy JSON string', async () => {
    mockGetAll.mockResolvedValue([
      makeServer('s2', 'legacy-server', '["--port","3000"]'),
    ])

    render(<MCPSettings />)

    await waitFor(() => {
      expect(screen.getByText(/npx --port 3000/)).toBeInTheDocument()
    })
  })

  it('handles null args gracefully (empty)', async () => {
    mockGetAll.mockResolvedValue([
      makeServer('s3', 'no-args', null),
    ])

    render(<MCPSettings />)

    await waitFor(() => {
      expect(screen.getByText('no-args')).toBeInTheDocument()
    })
    // Should render just the command with no trailing args
    const commandEl = screen.getByText((content, element) => {
      return element?.tagName === 'DIV' &&
        element.classList.contains('text-xs') &&
        content.trim() === 'npx'
    })
    expect(commandEl).toBeInTheDocument()
  })

  it('handles undefined args gracefully (empty)', async () => {
    mockGetAll.mockResolvedValue([
      makeServer('s4', 'undef-args', undefined),
    ])

    render(<MCPSettings />)

    await waitFor(() => {
      expect(screen.getByText('undef-args')).toBeInTheDocument()
    })
  })

  it('handles invalid JSON string by returning empty array', async () => {
    mockGetAll.mockResolvedValue([
      makeServer('s5', 'bad-json', 'not-valid-json'),
    ])

    render(<MCPSettings />)

    await waitFor(() => {
      expect(screen.getByText('bad-json')).toBeInTheDocument()
    })
    // Invalid JSON should result in just the command, no args
    const commandEl = screen.getByText((content, element) => {
      return element?.tagName === 'DIV' &&
        element.classList.contains('text-xs') &&
        content.trim() === 'npx'
    })
    expect(commandEl).toBeInTheDocument()
  })

  it('handles empty string args', async () => {
    mockGetAll.mockResolvedValue([
      makeServer('s6', 'empty-str', ''),
    ])

    render(<MCPSettings />)

    await waitFor(() => {
      expect(screen.getByText('empty-str')).toBeInTheDocument()
    })
  })

  it('handles empty array args', async () => {
    mockGetAll.mockResolvedValue([
      makeServer('s7', 'empty-arr', []),
    ])

    render(<MCPSettings />)

    await waitFor(() => {
      expect(screen.getByText('empty-arr')).toBeInTheDocument()
    })
  })
})

describe('MCPSettings — interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    vi.stubGlobal('confirm', vi.fn(() => true))
    mockGetAll.mockResolvedValue([])
    mockGetServerStates.mockResolvedValue([])
    mockCreate.mockResolvedValue(undefined)
    mockDelete.mockResolvedValue(undefined)
    mockToggleEnabled.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('renders empty state when no servers configured', async () => {
    render(<MCPSettings />)

    await waitFor(() => {
      expect(screen.getByText('No MCP servers configured')).toBeInTheDocument()
    })
    expect(
      screen.getByText('Add a server to extend AI capabilities')
    ).toBeInTheDocument()
  })

  it('renders connected status with tool count from server states', async () => {
    mockGetAll.mockResolvedValue([makeServer('s1', 'fs-server', ['-y'])])
    mockGetServerStates.mockResolvedValue([
      {
        config: { name: 'fs-server' },
        status: 'connected',
        tools: [{ name: 'read_file' }, { name: 'write_file' }],
      },
    ])

    render(<MCPSettings />)

    await waitFor(() => {
      expect(screen.getByText('2 tools')).toBeInTheDocument()
    })
  })

  it('renders error state and error message', async () => {
    mockGetAll.mockResolvedValue([makeServer('s1', 'fs-server', ['-y'])])
    mockGetServerStates.mockResolvedValue([
      {
        config: { name: 'fs-server' },
        status: 'error',
        tools: [],
        error: 'Connection failed',
      },
    ])

    render(<MCPSettings />)

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('Connection failed')).toBeInTheDocument()
    })
  })

  it('refresh button reloads server states', async () => {
    render(<MCPSettings />)

    await waitFor(() => {
      expect(mockGetServerStates).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

    await waitFor(() => {
      expect(mockGetServerStates).toHaveBeenCalledTimes(2)
    })
  })

  it('auto-refreshes status every 5 seconds', async () => {
    vi.useFakeTimers()
    render(<MCPSettings />)

    expect(mockGetServerStates).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(mockGetServerStates).toHaveBeenCalledTimes(2)
  })

  it('validates required fields when adding server', async () => {
    render(<MCPSettings />)
    await waitFor(() => {
      expect(mockGetAll).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole('button', { name: /add server/i }))
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))

    expect(notify.error).toHaveBeenCalledWith('Name and command are required')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates new server and parses args by whitespace', async () => {
    render(<MCPSettings />)

    fireEvent.click(screen.getByRole('button', { name: /add server/i }))
    fireEvent.change(screen.getByPlaceholderText(/server name/i), {
      target: { value: 'filesystem' },
    })
    fireEvent.change(screen.getByPlaceholderText(/command/i), {
      target: { value: 'npx' },
    })
    fireEvent.change(screen.getByPlaceholderText(/arguments/i), {
      target: { value: '-y @anthropic/mcp-server-filesystem' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        name: 'filesystem',
        command: 'npx',
        args: ['-y', '@anthropic/mcp-server-filesystem'],
        enabled: true,
      })
    })
    expect(notify.success).toHaveBeenCalledWith('MCP server "filesystem" added')
  })

  it('toggles server enabled state', async () => {
    mockGetAll.mockResolvedValue([makeServer('s1', 'fs-server', [])])
    render(<MCPSettings />)

    await waitFor(() => {
      expect(screen.getByText('fs-server')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /on/i }))

    await waitFor(() => {
      expect(mockToggleEnabled).toHaveBeenCalledWith('s1')
    })
    expect(notify.success).toHaveBeenCalledWith('fs-server disabled')
  })

  it('does not delete when user cancels confirmation', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    mockGetAll.mockResolvedValue([makeServer('s1', 'fs-server', [])])
    render(<MCPSettings />)

    await waitFor(() => {
      expect(screen.getByText('fs-server')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('Trash2').closest('button')!)

    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('deletes server after confirmation', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    mockGetAll.mockResolvedValue([makeServer('s1', 'fs-server', [])])
    render(<MCPSettings />)

    await waitFor(() => {
      expect(screen.getByText('fs-server')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('Trash2').closest('button')!)

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('s1')
    })
    expect(notify.success).toHaveBeenCalledWith('fs-server deleted')
  })
})

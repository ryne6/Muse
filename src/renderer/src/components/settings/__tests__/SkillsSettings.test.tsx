/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { SkillsSettings } from '../SkillsSettings'

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
    FolderOpen: make('FolderOpen'),
    RefreshCw: make('RefreshCw'),
  }
})

vi.mock('~/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

const notifySuccess = vi.fn()
const notifyError = vi.fn()

vi.mock('~/utils/notify', () => ({
  notify: {
    success: (...args: any[]) => notifySuccess(...args),
    error: (...args: any[]) => notifyError(...args),
  },
}))

const getDirectoriesMock = vi.fn()
const getCountMock = vi.fn()
const addDirectoryMock = vi.fn()
const toggleDirectoryMock = vi.fn()
const removeDirectoryMock = vi.fn()

vi.mock('~/services/dbClient', () => ({
  dbClient: {
    skills: {
      getDirectories: (...args: any[]) => getDirectoriesMock(...args),
      getCount: (...args: any[]) => getCountMock(...args),
      addDirectory: (...args: any[]) => addDirectoryMock(...args),
      toggleDirectory: (...args: any[]) => toggleDirectoryMock(...args),
      removeDirectory: (...args: any[]) => removeDirectoryMock(...args),
    },
  },
}))

describe('SkillsSettings', () => {
  const directories = [
    {
      id: 'dir-1',
      path: '~main/Users/x/.codex/skills',
      enabled: true,
      createdAt: new Date(),
    },
    {
      id: 'dir-2',
      path: '~main/tmp/disabled-skills',
      enabled: false,
      createdAt: new Date(),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    getDirectoriesMock.mockResolvedValue([])
    getCountMock.mockResolvedValue(3)
    addDirectoryMock.mockResolvedValue({ success: true })
    toggleDirectoryMock.mockResolvedValue({ success: true })
    removeDirectoryMock.mockResolvedValue({ success: true })
    ;(window as any).api.dialog = {
      selectDirectory: vi.fn(async () => '~main/new/skills/dir'),
    }
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    )
    vi.spyOn(window, 'dispatchEvent')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders empty state when no directories configured', async () => {
    render(<SkillsSettings />)

    await waitFor(() => {
      expect(
        screen.getByText('No skills directories configured')
      ).toBeInTheDocument()
    })
  })

  it('renders directories and handles count fallback on error', async () => {
    getDirectoriesMock.mockResolvedValue(directories)
    getCountMock
      .mockResolvedValueOnce(5)
      .mockRejectedValueOnce(new Error('count failed'))

    render(<SkillsSettings />)

    await waitFor(() => {
      expect(
        screen.getByText('~main/Users/x/.codex/skills')
      ).toBeInTheDocument()
      expect(screen.getByText('~main/tmp/disabled-skills')).toBeInTheDocument()
    })

    expect(screen.getByText('(5 skills)')).toBeInTheDocument()
    expect(screen.getByText('(0 skills)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /on/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /off/i })).toBeInTheDocument()
  })

  it('refreshes directory list on refresh button click', async () => {
    getDirectoriesMock.mockResolvedValue(directories)
    render(<SkillsSettings />)

    await waitFor(() => {
      expect(getDirectoriesMock).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

    await waitFor(() => {
      expect(getDirectoriesMock).toHaveBeenCalledTimes(2)
    })
  })

  it('adds a directory when user selects one', async () => {
    render(<SkillsSettings />)

    fireEvent.click(screen.getByRole('button', { name: /add directory/i }))

    await waitFor(() => {
      expect(addDirectoryMock).toHaveBeenCalledWith('~main/new/skills/dir')
    })
    expect(notifySuccess).toHaveBeenCalledWith(
      'Skills directory added: /new/skills/dir'
    )
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'skills-updated' })
    )
  })

  it('does nothing when no directory is selected', async () => {
    ;(window as any).api.dialog.selectDirectory = vi.fn(async () => null)
    render(<SkillsSettings />)

    fireEvent.click(screen.getByRole('button', { name: /add directory/i }))

    await waitFor(() => {
      expect((window as any).api.dialog.selectDirectory).toHaveBeenCalled()
    })
    expect(addDirectoryMock).not.toHaveBeenCalled()
  })

  it('handles add directory failures', async () => {
    addDirectoryMock.mockRejectedValueOnce(new Error('add failed'))
    render(<SkillsSettings />)

    fireEvent.click(screen.getByRole('button', { name: /add directory/i }))

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Failed to add directory')
    })
  })

  it('toggles directory status', async () => {
    getDirectoriesMock.mockResolvedValue(directories)
    render(<SkillsSettings />)

    await waitFor(() => {
      expect(
        screen.getByText('~main/Users/x/.codex/skills')
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /on/i }))

    await waitFor(() => {
      expect(toggleDirectoryMock).toHaveBeenCalledWith('dir-1')
    })
    expect(notifySuccess).toHaveBeenCalledWith(
      '~main/Users/x/.codex/skills disabled'
    )
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'skills-updated' })
    )
  })

  it('handles toggle failures', async () => {
    toggleDirectoryMock.mockRejectedValueOnce(new Error('toggle failed'))
    getDirectoriesMock.mockResolvedValue([directories[0]])
    render(<SkillsSettings />)

    await waitFor(() => {
      expect(
        screen.getByText('~main/Users/x/.codex/skills')
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /on/i }))

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Failed to update directory')
    })
  })

  it('does not delete when confirmation is cancelled', async () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false)
    )
    getDirectoriesMock.mockResolvedValue([directories[0]])
    render(<SkillsSettings />)

    await waitFor(() => {
      expect(
        screen.getByText('~main/Users/x/.codex/skills')
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('Trash2').closest('button')!)
    expect(removeDirectoryMock).not.toHaveBeenCalled()
  })

  it('deletes directory after confirmation', async () => {
    getDirectoriesMock.mockResolvedValue([directories[0]])
    render(<SkillsSettings />)

    await waitFor(() => {
      expect(
        screen.getByText('~main/Users/x/.codex/skills')
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('Trash2').closest('button')!)

    await waitFor(() => {
      expect(removeDirectoryMock).toHaveBeenCalledWith('dir-1')
    })
    expect(notifySuccess).toHaveBeenCalledWith(
      'Directory removed: /Users/x/.codex/skills'
    )
  })

  it('handles delete failures', async () => {
    removeDirectoryMock.mockRejectedValueOnce(new Error('delete failed'))
    getDirectoriesMock.mockResolvedValue([directories[0]])
    render(<SkillsSettings />)

    await waitFor(() => {
      expect(
        screen.getByText('~main/Users/x/.codex/skills')
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('Trash2').closest('button')!)

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('Failed to remove directory')
    })
  })
})

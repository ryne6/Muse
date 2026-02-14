/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemorySettings } from '../MemorySettings'
import type { MemoryRecord } from '~shared/types/ipc'

vi.mock('lucide-react', () => {
  const make = (name: string) => {
    const Icon = (props: any) => <span data-testid={name} {...props} />
    Icon.displayName = name
    return Icon
  }
  return {
    Trash2: make('Trash2'),
    Search: make('Search'),
    Brain: make('Brain'),
    Download: make('Download'),
    Upload: make('Upload'),
    Pencil: make('Pencil'),
    Check: make('Check'),
    X: make('X'),
    AlertTriangle: make('AlertTriangle'),
    Loader2: make('Loader2'),
  }
})

vi.mock('~/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

vi.mock('~/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))

const { storeState, setMemoryEnabledMock } = vi.hoisted(() => {
  const state = {
    memoryEnabled: true,
    setMemoryEnabled: vi.fn(),
  }
  return {
    storeState: state,
    setMemoryEnabledMock: state.setMemoryEnabled,
  }
})

vi.mock('~/stores/settingsStore', () => ({
  useSettingsStore: (selector: any) => selector(storeState),
}))

const notifySuccess = vi.fn()
const notifyError = vi.fn()

vi.mock('~/utils/notify', () => ({
  notify: {
    success: (...args: any[]) => notifySuccess(...args),
    error: (...args: any[]) => notifyError(...args),
  },
}))

const makeMemory = (overrides?: Partial<MemoryRecord>): MemoryRecord => ({
  id: 'mem-1',
  type: 'user',
  category: 'preference',
  content: 'Use pnpm',
  tags: null,
  source: 'manual',
  conversationId: null,
  filePath: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

function fireFileChange(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, 'files', {
    value: files,
    writable: false,
    configurable: true,
  })
  fireEvent.change(input)
}

function createImportFile(name: string, text: string): File {
  const file = new File(['x'], name, { type: 'application/json' })
  Object.defineProperty(file, 'text', {
    value: vi.fn().mockResolvedValue(text),
    configurable: true,
  })
  return file
}

describe('MemorySettings', () => {
  const getByTypeMock = vi.fn()
  const searchMock = vi.fn()
  const deleteMock = vi.fn()
  const updateMock = vi.fn()
  const deleteByTypeMock = vi.fn()
  const exportMock = vi.fn()
  const importMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    storeState.memoryEnabled = true
    getByTypeMock.mockImplementation(async (type: string) => {
      if (type === 'user') return [makeMemory({ id: 'u1', type: 'user' })]
      return [
        makeMemory({
          id: 'p1',
          type: 'project',
          category: 'knowledge',
          content: 'Project uses Electron',
          source: 'auto',
        }),
      ]
    })
    searchMock.mockResolvedValue([])
    deleteMock.mockResolvedValue({ success: true })
    updateMock.mockResolvedValue({ success: true })
    deleteByTypeMock.mockResolvedValue({ success: true })
    exportMock.mockResolvedValue([{ id: 'u1' }])
    importMock.mockResolvedValue({ imported: 1, skipped: 0 })

    ;(window as any).api.memory = {
      getByType: getByTypeMock,
      search: searchMock,
      delete: deleteMock,
      update: updateMock,
      deleteByType: deleteByTypeMock,
      export: exportMock,
      import: importMock,
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows disabled state and does not load memories when feature is off', async () => {
    storeState.memoryEnabled = false
    render(<MemorySettings />)

    await waitFor(() => {
      expect(screen.getByText('记忆功能已关闭')).toBeInTheDocument()
    })
    expect(getByTypeMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('switch', { name: '记忆功能开关' }))
    expect(setMemoryEnabledMock).toHaveBeenCalledWith(true)
  })

  it('loads and renders user/project memories when enabled', async () => {
    render(<MemorySettings />)

    await waitFor(() => {
      expect(screen.getByText(/共 2 条记忆/)).toBeInTheDocument()
    })
    expect(screen.getByText('用户记忆 (1)')).toBeInTheDocument()
    expect(screen.getByText('项目记忆 (1)')).toBeInTheDocument()
    expect(screen.getByText('Use pnpm')).toBeInTheDocument()
    expect(screen.getByText('Project uses Electron')).toBeInTheDocument()
  })

  it('searches memories and renders empty result state', async () => {
    searchMock.mockResolvedValueOnce([])
    render(<MemorySettings />)

    await waitFor(() => {
      expect(screen.getByText('用户记忆 (1)')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('搜索记忆...')
    fireEvent.change(input, { target: { value: 'missing' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(searchMock).toHaveBeenCalledWith('missing')
    })
    expect(screen.getByText('搜索结果 (0)')).toBeInTheDocument()
    expect(screen.getByText('无匹配结果')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '清除' }))
    await waitFor(() => {
      expect(screen.getByText('用户记忆 (1)')).toBeInTheDocument()
    })
  })

  it('handles search failures', async () => {
    searchMock.mockRejectedValueOnce(new Error('search failed'))
    render(<MemorySettings />)

    await waitFor(() => {
      expect(screen.getByText('用户记忆 (1)')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText('搜索记忆...')
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('搜索失败')
    })
  })

  it('edits memory content and saves on Enter', async () => {
    render(<MemorySettings />)

    await waitFor(() => {
      expect(screen.getByText('Use pnpm')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByTestId('Pencil')[0].closest('button')!)

    const editInput = screen.getByDisplayValue('Use pnpm')
    fireEvent.change(editInput, { target: { value: '  Use bun  ' } })
    fireEvent.keyDown(editInput, { key: 'Enter' })

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith('u1', { content: 'Use bun' })
    })
    expect(notifySuccess).toHaveBeenCalledWith('已更新')
  })

  it('cancels editing on Escape', async () => {
    render(<MemorySettings />)

    await waitFor(() => {
      expect(screen.getByText('Use pnpm')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByTestId('Pencil')[0].closest('button')!)
    const editInput = screen.getByDisplayValue('Use pnpm')
    fireEvent.change(editInput, { target: { value: 'changed' } })
    fireEvent.keyDown(editInput, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByDisplayValue('changed')).not.toBeInTheDocument()
    })
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('deletes memory and refreshes current search results', async () => {
    searchMock
      .mockResolvedValueOnce([makeMemory({ id: 'u1', type: 'user' })])
      .mockResolvedValueOnce([makeMemory({ id: 'u1', type: 'user' })])

    render(<MemorySettings />)

    await waitFor(() => {
      expect(screen.getByText('Use pnpm')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('搜索记忆...')
    fireEvent.change(searchInput, { target: { value: 'pnpm' } })
    fireEvent.keyDown(searchInput, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('搜索结果 (1)')).toBeInTheDocument()
    })

    fireEvent.click(screen.getAllByTestId('Trash2')[0].closest('button')!)

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('u1')
    })
    expect(notifySuccess).toHaveBeenCalledWith('记忆已删除')
    expect(searchMock).toHaveBeenCalledTimes(2)
  })

  it('confirms and clears user memories by type', async () => {
    render(<MemorySettings />)

    await waitFor(() => {
      expect(screen.getByText('用户记忆 (1)')).toBeInTheDocument()
    })

    const clearButtons = screen.getAllByRole('button', { name: '清空' })
    fireEvent.click(clearButtons[0])
    expect(screen.getByText('确认清空?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '确认' }))

    await waitFor(() => {
      expect(deleteByTypeMock).toHaveBeenCalledWith('user')
    })
    expect(notifySuccess).toHaveBeenCalledWith('已清空用户记忆')
  })

  it('exports memories successfully', async () => {
    const originalCreateElement = document.createElement.bind(document)
    const clickMock = vi.fn()
    vi.spyOn(document, 'createElement').mockImplementation((tagName: any) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: clickMock,
        } as any
      }
      return originalCreateElement(tagName)
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    render(<MemorySettings />)
    await waitFor(() => {
      expect(screen.getByText('用户记忆 (1)')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /导出/i }))

    await waitFor(() => {
      expect(exportMock).toHaveBeenCalled()
    })
    expect(clickMock).toHaveBeenCalled()
    expect(notifySuccess).toHaveBeenCalledWith('已导出 1 条记忆')
  })

  it('handles export failure', async () => {
    exportMock.mockRejectedValueOnce(new Error('export failed'))
    render(<MemorySettings />)

    await waitFor(() => {
      expect(screen.getByText('用户记忆 (1)')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /导出/i }))
    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('导出失败')
    })
  })

  it('validates import file size', async () => {
    render(<MemorySettings />)
    await waitFor(() => {
      expect(screen.getByText('用户记忆 (1)')).toBeInTheDocument()
    })

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    const bigFile = new File([new Uint8Array(1024 * 1024 + 1)], 'big.json', {
      type: 'application/json',
    })

    fireFileChange(fileInput, [bigFile])

    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('文件过大：最大支持 1 MB')
    })
    expect(importMock).not.toHaveBeenCalled()
  })

  it('validates import JSON format and item count', async () => {
    render(<MemorySettings />)
    await waitFor(() => {
      expect(screen.getByText('用户记忆 (1)')).toBeInTheDocument()
    })
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement

    const notArrayFile = createImportFile('invalid.json', '{"id":"x"}')
    fireFileChange(fileInput, [notArrayFile])
    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('文件格式错误：需要 JSON 数组')
    })

    const tooMany = Array.from({ length: 501 }, (_, i) => ({ id: i }))
    const tooManyFile = createImportFile('too-many.json', JSON.stringify(tooMany))
    fireFileChange(fileInput, [tooManyFile])
    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith(
        '条目过多：最多支持 500 条，当前 501 条'
      )
    })
  })

  it('imports memories successfully and handles parse error', async () => {
    render(<MemorySettings />)
    await waitFor(() => {
      expect(screen.getByText('用户记忆 (1)')).toBeInTheDocument()
    })

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement

    const validFile = createImportFile(
      'memories.json',
      JSON.stringify([{ type: 'user', category: 'knowledge', content: 'x' }])
    )
    fireFileChange(fileInput, [validFile])
    await waitFor(() => {
      expect(importMock).toHaveBeenCalled()
    })
    expect(notifySuccess).toHaveBeenCalledWith('导入 1 条，跳过 0 条重复')

    const invalidJsonFile = createImportFile('broken.json', 'not-json')
    fireFileChange(fileInput, [invalidJsonFile])
    await waitFor(() => {
      expect(notifyError).toHaveBeenCalledWith('导入失败：请检查文件格式')
    })
  })
})

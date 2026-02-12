/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileExplorer } from '../FileExplorer'

/**
 * FileExplorer 组件测试
 *
 * 测试目标：
 * - 文件树加载和渲染
 * - 文件夹展开/折叠
 * - 文件选择
 * - 加载状态显示
 * - 错误处理（工作区未选择、加载失败）
 * - Electron API mock 验证
 */

// Mock window.api
const mockWindowApi = vi.hoisted(() => {
  return {
    workspace: {
      get: vi.fn(async () => ({
        path: '/test/workspace',
      })),
    },
    fs: {
      listFiles: vi.fn(async (path: string) => ({
        files: [
          {
            name: 'file1.ts',
            path: `${path}/file1.ts`,
            isDirectory: false,
            size: 1024,
            modifiedTime: Date.now(),
          },
          {
            name: 'folder1',
            path: `${path}/folder1`,
            isDirectory: true,
            size: 0,
            modifiedTime: Date.now(),
          },
        ],
      })),
    },
  }
})

// Set up global window.api
beforeEach(() => {
  global.window = global.window || ({} as any)
  global.window.api = mockWindowApi as any

  // Reset mocks to default implementation
  mockWindowApi.workspace.get.mockResolvedValue({ path: '/test/workspace' })
  mockWindowApi.fs.listFiles.mockResolvedValue({
    files: [
      {
        name: 'file1.ts',
        path: '/test/workspace/file1.ts',
        isDirectory: false,
        size: 1024,
        modifiedTime: Date.now(),
      },
      {
        name: 'folder1',
        path: '/test/workspace/folder1',
        isDirectory: true,
        size: 0,
        modifiedTime: Date.now(),
      },
    ],
  })

  vi.clearAllMocks()
})

// Mock child components
vi.mock('../FileTree', () => ({
  FileTree: ({ nodes, onToggle, onSelect, selectedPath }: any) => (
    <div data-testid="file-tree">
      {nodes.map((node: any) => (
        <div key={node.path} data-testid={`file-node-${node.name}`}>
          <button onClick={() => node.isDirectory && onToggle(node.path)}>
            {node.name}
          </button>
          <button onClick={() => onSelect(node.path, node.isDirectory)}>
            Select {node.name}
          </button>
        </div>
      ))}
    </div>
  ),
}))

describe('FileExplorer', () => {
  describe('渲染测试', () => {
    it('should show "No workspace selected" when workspace is not available', async () => {
      // Mock: no workspace
      mockWindowApi.workspace.get.mockResolvedValue({ path: null })

      render(<FileExplorer />)

      await waitFor(() => {
        expect(screen.getByText('No workspace selected')).toBeInTheDocument()
      })
    })

    it('should render workspace name in header', async () => {
      render(<FileExplorer />)

      await waitFor(() => {
        expect(screen.getByText('workspace')).toBeInTheDocument()
      })
    })

    it('should render refresh button', async () => {
      render(<FileExplorer />)

      await waitFor(() => {
        const refreshButton = screen.getByRole('button')
        expect(refreshButton).toBeInTheDocument()
      })
    })
  })

  describe('文件树加载测试', () => {
    it('should call workspace.get on mount', async () => {
      render(<FileExplorer />)

      await waitFor(() => {
        expect(mockWindowApi.workspace.get).toHaveBeenCalled()
      })
    })

    it('should call fs.listFiles when workspace is loaded', async () => {
      render(<FileExplorer />)

      await waitFor(() => {
        expect(mockWindowApi.fs.listFiles).toHaveBeenCalledWith(
          '/test/workspace'
        )
      })
    })

    it('should render file tree with loaded files', async () => {
      render(<FileExplorer />)

      await waitFor(() => {
        expect(screen.getByTestId('file-tree')).toBeInTheDocument()
        expect(screen.getByTestId('file-node-file1.ts')).toBeInTheDocument()
        expect(screen.getByTestId('file-node-folder1')).toBeInTheDocument()
      })
    })

    it('should show loading state initially', async () => {
      // Make listFiles slow to capture loading state
      mockWindowApi.fs.listFiles.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return {
          files: [
            {
              name: 'file1.ts',
              path: '/test/workspace/file1.ts',
              isDirectory: false,
              size: 1024,
              modifiedTime: Date.now(),
            },
          ],
        }
      })

      render(<FileExplorer />)

      // Wait for workspace to load, then check for loading state
      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument()
      })

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })
    })
  })

  describe('文件夹展开/折叠测试', () => {
    it('should load folder children when expanding folder', async () => {
      const user = userEvent.setup()
      render(<FileExplorer />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('file-node-folder1')).toBeInTheDocument()
      })

      // Click to expand folder
      const folderButton = screen.getByText('folder1')
      await user.click(folderButton)

      // Should call listFiles for the folder
      await waitFor(() => {
        expect(mockWindowApi.fs.listFiles).toHaveBeenCalledWith(
          '/test/workspace/folder1'
        )
      })
    })
  })

  describe('文件选择测试', () => {
    it('should handle file selection', async () => {
      const user = userEvent.setup()
      const consoleSpy = vi.spyOn(console, 'log')

      render(<FileExplorer />)

      // Wait for files to load
      await waitFor(() => {
        expect(screen.getByTestId('file-node-file1.ts')).toBeInTheDocument()
      })

      // Click to select file
      const selectButton = screen.getByText('Select file1.ts')
      await user.click(selectButton)

      // Should log selection
      expect(consoleSpy).toHaveBeenCalledWith(
        'Selected:',
        '/test/workspace/file1.ts',
        'isDirectory:',
        false
      )

      consoleSpy.mockRestore()
    })
  })

  describe('刷新功能测试', () => {
    it('should reload file tree when refresh button is clicked', async () => {
      const user = userEvent.setup()
      render(<FileExplorer />)

      // Wait for initial load and file tree to render
      await waitFor(() => {
        expect(screen.getByTestId('file-tree')).toBeInTheDocument()
      })

      // Find refresh button by aria-label
      const refreshButton = screen.getByRole('button', {
        name: 'Refresh file tree',
      })
      await user.click(refreshButton)

      // Should call listFiles again
      await waitFor(() => {
        expect(mockWindowApi.fs.listFiles).toHaveBeenCalledTimes(2)
      })
    })

    it('should disable refresh button while loading', async () => {
      // Make listFiles slow
      mockWindowApi.fs.listFiles.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return {
          files: [
            {
              name: 'file1.ts',
              path: '/test/workspace/file1.ts',
              isDirectory: false,
              size: 1024,
              modifiedTime: Date.now(),
            },
          ],
        }
      })

      render(<FileExplorer />)

      // Wait for workspace to load and header to render
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Refresh file tree' })
        ).toBeInTheDocument()
      })

      // Button should be disabled during loading
      const refreshButton = screen.getByRole('button', {
        name: 'Refresh file tree',
      })
      expect(refreshButton).toBeDisabled()

      // Wait for loading to complete
      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled()
      })
    })
  })
})

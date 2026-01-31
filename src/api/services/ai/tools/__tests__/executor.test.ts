import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ToolExecutor } from '../executor'
import axios from 'axios'
import { TOOL_PERMISSION_PREFIX } from '@shared/types/toolPermissions'

// Mock axios
vi.mock('axios')

describe('ToolExecutor', () => {
  let executor: ToolExecutor

  beforeEach(() => {
    vi.clearAllMocks()
    executor = new ToolExecutor()
  })

  describe('execute', () => {
    it('should return permission request for dangerous tool when not allowed', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { output: 'ok' }
      })

      const result = await executor.execute(
        'Bash',
        { command: 'ls' },
        { toolCallId: 'tc-1', toolPermissions: { allowAll: false } }
      )

      expect(result.startsWith(TOOL_PERMISSION_PREFIX)).toBe(true)
      expect(axios.post).not.toHaveBeenCalled()
    })

    it('should allow dangerous tool when allowOnceTools includes name', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { output: 'ok' }
      })

      await executor.execute(
        'Bash',
        { command: 'ls' },
        { toolCallId: 'tc-1', allowOnceTools: ['Bash'] }
      )

      expect(axios.post).toHaveBeenCalled()
    })

    it('should route to readFile for Read tool', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { content: 'file content' }
      })

      const result = await executor.execute('Read', { path: '/test/file.txt' })

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/fs:readFile',
        { path: '/test/file.txt' }
      )
      expect(result).toBe('file content')
    })

    it('should route to writeFile for Write tool', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { success: true }
      })

      const result = await executor.execute(
        'Write',
        {
          path: '/test/file.txt',
          content: 'new content'
        },
        { toolPermissions: { allowAll: true } }
      )

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/fs:writeFile',
        { path: '/test/file.txt', content: 'new content' }
      )
      expect(result).toContain('Successfully wrote')
    })

    it('should route to listFiles for LS tool', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          files: [
            { name: 'file1.txt', isDirectory: false, size: 1024 },
            { name: 'dir1', isDirectory: true, size: 0 }
          ]
        }
      })

      const result = await executor.execute('LS', { path: '/test' })

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/fs:listFiles',
        { path: '/test', pattern: undefined }
      )
      expect(result).toContain('Contents of /test')
    })

    it('should route to executeCommand for Bash tool', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { output: 'command output', error: '' }
      })

      const result = await executor.execute(
        'Bash',
        {
          command: 'npm test',
          cwd: '/test'
        },
        { toolPermissions: { allowAll: true } }
      )

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/exec:command',
        { command: 'npm test', cwd: '/test' }
      )
      expect(result).toContain('Command: npm test')
    })

    it('should route to editFile for Edit tool', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { replaced: 2 }
      })

      const result = await executor.execute(
        'Edit',
        {
          path: '/test/file.txt',
          old_text: 'old',
          new_text: 'new',
          replace_all: true
        },
        { toolPermissions: { allowAll: true } }
      )

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/fs:editFile',
        { path: '/test/file.txt', oldText: 'old', newText: 'new', replaceAll: true }
      )
      expect(result).toContain('Replaced 2 occurrence')
    })

    it('should return markdown list for TodoWrite tool', async () => {
      const result = await executor.execute('TodoWrite', {
        todos: [
          { id: '1', title: 'Do thing', status: 'todo' },
          { id: '2', title: 'In progress', status: 'in_progress', notes: 'Working on it' },
          { id: '3', title: 'Done', status: 'done' }
        ]
      })

      expect(result).toContain('- [ ] Do thing')
      expect(result).toContain('- [~] In progress')
      expect(result).toContain('- [x] Done')
      expect(result).toContain('  - Working on it')
    })

    it('should route to fs:glob for Glob tool', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { files: ['/test/a.ts', '/test/b.ts'] }
      })

      const result = await executor.execute('Glob', { pattern: '**/*.ts', path: '/test' })

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/fs:glob',
        { pattern: '**/*.ts', path: '/test' }
      )
      expect(result).toContain('/test/a.ts')
      expect(result).toContain('/test/b.ts')
    })

    it('should route to fs:grep for Grep tool', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { results: [{ file: '/test/a.ts', line: 12, content: 'const a = 1' }] }
      })

      const result = await executor.execute('Grep', { pattern: 'const', path: '/test' })

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/fs:grep',
        { pattern: 'const', path: '/test', glob: undefined, ignoreCase: undefined, maxResults: undefined }
      )
      expect(result).toContain('/test/a.ts:12 const a = 1')
    })

    it('should route to git:status for GitStatus tool', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { output: 'On branch main' }
      })

      const result = await executor.execute('GitStatus', { path: '/repo' })

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/git:status',
        { path: '/repo' }
      )
      expect(result).toContain('On branch main')
    })

    it('should route to web:fetch for WebFetch tool', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { content: 'Example content' }
      })

      const result = await executor.execute('WebFetch', { url: 'https://example.com' })

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/web:fetch',
        { url: 'https://example.com', maxLength: undefined }
      )
      expect(result).toContain('Example content')
    })

    it('should route to web:search for WebSearch tool', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { results: [{ title: 'Result', url: 'https://example.com', snippet: 'Snippet' }] }
      })

      const result = await executor.execute('WebSearch', { query: 'test' })

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/web:search',
        { query: 'test', limit: undefined, recencyDays: undefined, domains: undefined }
      )
      expect(result).toContain('1. Result')
      expect(result).toContain('https://example.com')
      expect(result).toContain('Snippet')
    })

    it('should return error message for unknown tool', async () => {
      const result = await executor.execute('unknown_tool', {})
      expect(result).toContain('Error: Unknown tool: unknown_tool')
    })

    it('should handle readFile errors gracefully', async () => {
      vi.mocked(axios.post).mockRejectedValue({
        response: { data: { error: 'File not found' } }
      })

      const result = await executor.execute('Read', { path: '/nonexistent.txt' })
      expect(result).toContain('Error: Failed to read file')
    })
  })

  describe('Read', () => {
    it('should read file content successfully', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { content: 'const x = 1;' }
      })

      const result = await executor.execute('Read', { path: '/src/index.ts' })
      expect(result).toBe('const x = 1;')
    })

    it('should handle network errors', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('Network error'))

      const result = await executor.execute('Read', { path: '/test.txt' })
      expect(result).toContain('Error: Failed to read file')
      expect(result).toContain('Network error')
    })

    it('should handle API errors with response data', async () => {
      vi.mocked(axios.post).mockRejectedValue({
        response: { data: { error: 'Permission denied' } }
      })

      const result = await executor.execute('Read', { path: '/etc/passwd' })
      expect(result).toContain('Permission denied')
    })
  })

  describe('Write', () => {
    it('should write file content successfully', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { success: true }
      })

      const content = 'Hello, World!'
      const result = await executor.execute(
        'Write',
        {
          path: '/test/output.txt',
          content
        },
        { toolPermissions: { allowAll: true } }
      )

      expect(result).toContain(`Successfully wrote ${content.length} characters`)
      expect(result).toContain('/test/output.txt')
    })

    it('should handle write failure', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { success: false }
      })

      const result = await executor.execute(
        'Write',
        {
          path: '/readonly/file.txt',
          content: 'test'
        },
        { toolPermissions: { allowAll: true } }
      )

      expect(result).toContain('Error: Failed to write file')
    })

    it('should handle network errors during write', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('Connection refused'))

      const result = await executor.execute(
        'Write',
        {
          path: '/test.txt',
          content: 'test'
        },
        { toolPermissions: { allowAll: true } }
      )

      expect(result).toContain('Error: Failed to write file')
    })
  })

  describe('LS', () => {
    it('should list files with proper formatting', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          files: [
            { name: 'file1.txt', isDirectory: false, size: 500 },
            { name: 'file2.js', isDirectory: false, size: 2048 },
            { name: 'subdir', isDirectory: true, size: 0 }
          ]
        }
      })

      const result = await executor.execute('LS', { path: '/project' })

      expect(result).toContain('[FILE] file1.txt')
      expect(result).toContain('[FILE] file2.js')
      expect(result).toContain('[DIR] subdir')
      expect(result).toContain('500B')
      expect(result).toContain('2.0KB')
    })

    it('should handle empty directory', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { files: [] }
      })

      const result = await executor.execute('LS', { path: '/empty' })

      expect(result).toContain('is empty')
    })

    it('should pass pattern parameter', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { files: [{ name: 'test.ts', isDirectory: false, size: 100 }] }
      })

      await executor.execute('LS', { path: '/src', pattern: '*.ts' })

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/fs:listFiles',
        { path: '/src', pattern: '*.ts' }
      )
    })

    it('should format file sizes correctly', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          files: [
            { name: 'small.txt', isDirectory: false, size: 100 },
            { name: 'medium.txt', isDirectory: false, size: 1024 * 10 },
            { name: 'large.txt', isDirectory: false, size: 1024 * 1024 * 2 }
          ]
        }
      })

      const result = await executor.execute('LS', { path: '/test' })

      expect(result).toContain('100B')
      expect(result).toContain('10.0KB')
      expect(result).toContain('2.0MB')
    })
  })

  describe('Bash', () => {
    it('should execute command successfully', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          output: 'Test passed',
          error: ''
        }
      })

      const result = await executor.execute(
        'Bash',
        {
          command: 'npm test',
          cwd: '/project'
        },
        { toolPermissions: { allowAll: true } }
      )

      expect(result).toContain('Command: npm test')
      expect(result).toContain('Test passed')
    })

    it('should handle command with error output', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          output: '',
          error: 'Warning: deprecated package'
        }
      })

      const result = await executor.execute(
        'Bash',
        {
          command: 'npm install'
        },
        { toolPermissions: { allowAll: true } }
      )

      expect(result).toContain('Error/Warning')
      expect(result).toContain('deprecated package')
    })

    it('should handle command without cwd', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { output: 'output', error: '' }
      })

      await executor.execute('Bash', { command: 'pwd' }, { toolPermissions: { allowAll: true } })

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/exec:command',
        { command: 'pwd', cwd: undefined }
      )
    })

    it('should handle command execution failure', async () => {
      vi.mocked(axios.post).mockRejectedValue({
        response: { data: { error: 'Command not found' } }
      })

      const result = await executor.execute(
        'Bash',
        {
          command: 'unknown_command'
        },
        { toolPermissions: { allowAll: true } }
      )

      expect(result).toContain('Error: Failed to execute command')
    })
  })

  describe('error handling', () => {
    it('should return generic error message for non-Error throws', async () => {
      vi.mocked(axios.post).mockRejectedValue('string error')

      const result = await executor.execute('Read', { path: '/test.txt' })
      expect(result).toContain('Error:')
    })

    it('should not crash on undefined input', async () => {
      const result = await executor.execute('Read', undefined)
      expect(result).toContain('Error')
    })
  })
})

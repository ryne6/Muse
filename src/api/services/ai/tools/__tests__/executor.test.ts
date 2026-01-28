import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ToolExecutor } from '../executor'
import axios from 'axios'

// Mock axios
vi.mock('axios')

describe('ToolExecutor', () => {
  let executor: ToolExecutor

  beforeEach(() => {
    vi.clearAllMocks()
    executor = new ToolExecutor()
  })

  describe('execute', () => {
    it('should route to readFile for read_file tool', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { content: 'file content' }
      })

      const result = await executor.execute('read_file', { path: '/test/file.txt' })

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/fs:readFile',
        { path: '/test/file.txt' }
      )
      expect(result).toBe('file content')
    })

    it('should route to writeFile for write_file tool', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { success: true }
      })

      const result = await executor.execute('write_file', {
        path: '/test/file.txt',
        content: 'new content'
      })

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/fs:writeFile',
        { path: '/test/file.txt', content: 'new content' }
      )
      expect(result).toContain('Successfully wrote')
    })

    it('should route to listFiles for list_files tool', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          files: [
            { name: 'file1.txt', isDirectory: false, size: 1024 },
            { name: 'dir1', isDirectory: true, size: 0 }
          ]
        }
      })

      const result = await executor.execute('list_files', { path: '/test' })

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/fs:listFiles',
        { path: '/test', pattern: undefined }
      )
      expect(result).toContain('Contents of /test')
    })

    it('should route to executeCommand for execute_command tool', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { output: 'command output', error: '' }
      })

      const result = await executor.execute('execute_command', {
        command: 'npm test',
        cwd: '/test'
      })

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/exec:command',
        { command: 'npm test', cwd: '/test' }
      )
      expect(result).toContain('Command: npm test')
    })

    it('should return error message for unknown tool', async () => {
      const result = await executor.execute('unknown_tool', {})
      expect(result).toContain('Error: Unknown tool: unknown_tool')
    })

    it('should handle readFile errors gracefully', async () => {
      vi.mocked(axios.post).mockRejectedValue({
        response: { data: { error: 'File not found' } }
      })

      const result = await executor.execute('read_file', { path: '/nonexistent.txt' })
      expect(result).toContain('Error: Failed to read file')
    })
  })

  describe('readFile', () => {
    it('should read file content successfully', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { content: 'const x = 1;' }
      })

      const result = await executor.execute('read_file', { path: '/src/index.ts' })
      expect(result).toBe('const x = 1;')
    })

    it('should handle network errors', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('Network error'))

      const result = await executor.execute('read_file', { path: '/test.txt' })
      expect(result).toContain('Error: Failed to read file')
      expect(result).toContain('Network error')
    })

    it('should handle API errors with response data', async () => {
      vi.mocked(axios.post).mockRejectedValue({
        response: { data: { error: 'Permission denied' } }
      })

      const result = await executor.execute('read_file', { path: '/etc/passwd' })
      expect(result).toContain('Permission denied')
    })
  })

  describe('writeFile', () => {
    it('should write file content successfully', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { success: true }
      })

      const content = 'Hello, World!'
      const result = await executor.execute('write_file', {
        path: '/test/output.txt',
        content
      })

      expect(result).toContain(`Successfully wrote ${content.length} characters`)
      expect(result).toContain('/test/output.txt')
    })

    it('should handle write failure', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { success: false }
      })

      const result = await executor.execute('write_file', {
        path: '/readonly/file.txt',
        content: 'test'
      })

      expect(result).toContain('Error: Failed to write file')
    })

    it('should handle network errors during write', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('Connection refused'))

      const result = await executor.execute('write_file', {
        path: '/test.txt',
        content: 'test'
      })

      expect(result).toContain('Error: Failed to write file')
    })
  })

  describe('listFiles', () => {
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

      const result = await executor.execute('list_files', { path: '/project' })

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

      const result = await executor.execute('list_files', { path: '/empty' })

      expect(result).toContain('is empty')
    })

    it('should pass pattern parameter', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { files: [{ name: 'test.ts', isDirectory: false, size: 100 }] }
      })

      await executor.execute('list_files', { path: '/src', pattern: '*.ts' })

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

      const result = await executor.execute('list_files', { path: '/test' })

      expect(result).toContain('100B')
      expect(result).toContain('10.0KB')
      expect(result).toContain('2.0MB')
    })
  })

  describe('executeCommand', () => {
    it('should execute command successfully', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: {
          output: 'Test passed',
          error: ''
        }
      })

      const result = await executor.execute('execute_command', {
        command: 'npm test',
        cwd: '/project'
      })

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

      const result = await executor.execute('execute_command', {
        command: 'npm install'
      })

      expect(result).toContain('Error/Warning')
      expect(result).toContain('deprecated package')
    })

    it('should handle command without cwd', async () => {
      vi.mocked(axios.post).mockResolvedValue({
        data: { output: 'output', error: '' }
      })

      await executor.execute('execute_command', { command: 'pwd' })

      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:3001/ipc/exec:command',
        { command: 'pwd', cwd: undefined }
      )
    })

    it('should handle command execution failure', async () => {
      vi.mocked(axios.post).mockRejectedValue({
        response: { data: { error: 'Command not found' } }
      })

      const result = await executor.execute('execute_command', {
        command: 'unknown_command'
      })

      expect(result).toContain('Error: Failed to execute command')
    })
  })

  describe('error handling', () => {
    it('should return generic error message for non-Error throws', async () => {
      vi.mocked(axios.post).mockRejectedValue('string error')

      const result = await executor.execute('read_file', { path: '/test.txt' })
      expect(result).toContain('Error:')
    })

    it('should not crash on undefined input', async () => {
      const result = await executor.execute('read_file', undefined)
      expect(result).toContain('Error')
    })
  })
})

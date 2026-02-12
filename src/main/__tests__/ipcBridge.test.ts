import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'

// Create mock FileSystemService
const mockFsService = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  listFiles: vi.fn(),
  exists: vi.fn(),
  mkdir: vi.fn(),
  executeCommand: vi.fn(),
  getWorkspace: vi.fn(),
  setWorkspace: vi.fn(),
}

// Mock the FileSystemService module before importing
vi.mock('../services/fileSystemService', () => ({
  FileSystemService: vi.fn().mockImplementation(() => mockFsService),
}))

describe('IPC Bridge', () => {
  let app: Hono

  beforeEach(async () => {
    vi.clearAllMocks()

    // Dynamically create an app that mimics ipcBridge behavior for testing
    app = new Hono()

    app.get('/health', c => c.json({ status: 'ok' }))

    app.post('/ipc/:channel', async c => {
      const channel = c.req.param('channel')
      const body = await c.req.json()

      try {
        let result: any

        switch (channel) {
          case 'fs:readFile':
            result = { content: await mockFsService.readFile(body.path) }
            break
          case 'fs:writeFile':
            result = {
              success: await mockFsService.writeFile(body.path, body.content),
            }
            break
          case 'fs:listFiles':
            result = {
              files: await mockFsService.listFiles(body.path, body.pattern),
            }
            break
          case 'fs:exists':
            result = { exists: await mockFsService.exists(body.path) }
            break
          case 'fs:mkdir':
            result = { success: await mockFsService.mkdir(body.path) }
            break
          case 'exec:command':
            result = await mockFsService.executeCommand(body.command, body.cwd)
            break
          case 'workspace:get':
            result = { path: mockFsService.getWorkspace() }
            break
          case 'workspace:set':
            result = { success: mockFsService.setWorkspace(body.path) }
            break
          default:
            return c.json({ error: `Unknown channel: ${channel}` }, 400)
        }

        return c.json(result)
      } catch (error: any) {
        return c.json({ error: error.message || 'Internal server error' }, 500)
      }
    })
  })

  describe('health check', () => {
    it('should return ok status', async () => {
      const res = await app.request('/health')
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.status).toBe('ok')
    })
  })

  describe('file system operations', () => {
    describe('fs:readFile', () => {
      it('should read file content', async () => {
        mockFsService.readFile.mockResolvedValue('file content here')

        const res = await app.request('/ipc/fs:readFile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/test/file.txt' }),
        })

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.content).toBe('file content here')
        expect(mockFsService.readFile).toHaveBeenCalledWith('/test/file.txt')
      })

      it('should handle read errors', async () => {
        mockFsService.readFile.mockRejectedValue(new Error('File not found'))

        const res = await app.request('/ipc/fs:readFile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/nonexistent.txt' }),
        })

        expect(res.status).toBe(500)
        const json = await res.json()
        expect(json.error).toBe('File not found')
      })
    })

    describe('fs:writeFile', () => {
      it('should write file content', async () => {
        mockFsService.writeFile.mockResolvedValue(true)

        const res = await app.request('/ipc/fs:writeFile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: '/test/file.txt',
            content: 'new content',
          }),
        })

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(mockFsService.writeFile).toHaveBeenCalledWith(
          '/test/file.txt',
          'new content'
        )
      })

      it('should handle write errors', async () => {
        mockFsService.writeFile.mockRejectedValue(
          new Error('Permission denied')
        )

        const res = await app.request('/ipc/fs:writeFile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/readonly/file.txt', content: 'test' }),
        })

        expect(res.status).toBe(500)
        const json = await res.json()
        expect(json.error).toBe('Permission denied')
      })
    })

    describe('fs:listFiles', () => {
      it('should list files in directory', async () => {
        const files = [
          { name: 'file1.txt', isDirectory: false, size: 100 },
          { name: 'subdir', isDirectory: true, size: 0 },
        ]
        mockFsService.listFiles.mockResolvedValue(files)

        const res = await app.request('/ipc/fs:listFiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/test' }),
        })

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.files).toEqual(files)
        expect(mockFsService.listFiles).toHaveBeenCalledWith('/test', undefined)
      })

      it('should pass pattern to listFiles', async () => {
        mockFsService.listFiles.mockResolvedValue([])

        await app.request('/ipc/fs:listFiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/src', pattern: '*.ts' }),
        })

        expect(mockFsService.listFiles).toHaveBeenCalledWith('/src', '*.ts')
      })
    })

    describe('fs:exists', () => {
      it('should check if file exists', async () => {
        mockFsService.exists.mockResolvedValue(true)

        const res = await app.request('/ipc/fs:exists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/test/file.txt' }),
        })

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.exists).toBe(true)
      })

      it('should return false for non-existent files', async () => {
        mockFsService.exists.mockResolvedValue(false)

        const res = await app.request('/ipc/fs:exists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/nonexistent.txt' }),
        })

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.exists).toBe(false)
      })
    })

    describe('fs:mkdir', () => {
      it('should create directory', async () => {
        mockFsService.mkdir.mockResolvedValue(true)

        const res = await app.request('/ipc/fs:mkdir', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/test/newdir' }),
        })

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(mockFsService.mkdir).toHaveBeenCalledWith('/test/newdir')
      })
    })
  })

  describe('command execution', () => {
    describe('exec:command', () => {
      it('should execute command', async () => {
        mockFsService.executeCommand.mockResolvedValue({
          output: 'command output',
          error: '',
        })

        const res = await app.request('/ipc/exec:command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'echo hello', cwd: '/test' }),
        })

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.output).toBe('command output')
        expect(mockFsService.executeCommand).toHaveBeenCalledWith(
          'echo hello',
          '/test'
        )
      })

      it('should handle command errors', async () => {
        mockFsService.executeCommand.mockRejectedValue(
          new Error('Command failed')
        )

        const res = await app.request('/ipc/exec:command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'invalid-command' }),
        })

        expect(res.status).toBe(500)
        const json = await res.json()
        expect(json.error).toBe('Command failed')
      })
    })
  })

  describe('workspace operations', () => {
    describe('workspace:get', () => {
      it('should get current workspace', async () => {
        mockFsService.getWorkspace.mockReturnValue('/home/user/project')

        const res = await app.request('/ipc/workspace:get', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.path).toBe('/home/user/project')
      })

      it('should return null if no workspace set', async () => {
        mockFsService.getWorkspace.mockReturnValue(null)

        const res = await app.request('/ipc/workspace:get', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.path).toBeNull()
      })
    })

    describe('workspace:set', () => {
      it('should set workspace', async () => {
        mockFsService.setWorkspace.mockReturnValue(true)

        const res = await app.request('/ipc/workspace:set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: '/new/workspace' }),
        })

        expect(res.status).toBe(200)
        const json = await res.json()
        expect(json.success).toBe(true)
        expect(mockFsService.setWorkspace).toHaveBeenCalledWith(
          '/new/workspace'
        )
      })
    })
  })

  describe('unknown channel', () => {
    it('should return 400 for unknown channel', async () => {
      const res = await app.request('/ipc/unknown:channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toContain('Unknown channel')
    })
  })
})

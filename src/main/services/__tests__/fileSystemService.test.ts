import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FileSystemService } from '../fileSystemService'

// Mock fs module
vi.mock('fs', () => {
  const promises = {
    stat: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    access: vi.fn(),
    mkdir: vi.fn()
  }

  return {
    promises,
    default: { promises }
  }
})

// Mock child_process
vi.mock('child_process', () => {
  const exec = vi.fn()
  return {
    exec,
    default: { exec }
  }
})

vi.mock('fast-glob', () => ({
  default: vi.fn()
}))

import { promises as fs } from 'fs'
import { exec } from 'child_process'
import fg from 'fast-glob'

describe('FileSystemService', () => {
  let service: FileSystemService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new FileSystemService()
  })

  describe('readFile', () => {
    it('should read file content', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 100 } as any)
      vi.mocked(fs.readFile).mockResolvedValue('file content')

      const result = await service.readFile('/test/file.txt')

      expect(result).toBe('file content')
      expect(fs.readFile).toHaveBeenCalledWith('/test/file.txt', 'utf-8')
    })

    it('should reject files larger than 10MB', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 11 * 1024 * 1024 } as any)

      await expect(service.readFile('/large/file.txt'))
        .rejects.toThrow('File too large')
    })

    it('should handle read errors', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('File not found'))

      await expect(service.readFile('/missing.txt'))
        .rejects.toThrow('Failed to read file')
    })
  })

  describe('writeFile', () => {
    it('should write content to file', async () => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      const result = await service.writeFile('/test/file.txt', 'content')

      expect(result).toBe(true)
      expect(fs.writeFile).toHaveBeenCalledWith('/test/file.txt', 'content', 'utf-8')
    })

    it('should handle write errors', async () => {
      vi.mocked(fs.writeFile).mockRejectedValue(new Error('Permission denied'))

      await expect(service.writeFile('/readonly/file.txt', 'content'))
        .rejects.toThrow('Failed to write file')
    })
  })

  describe('glob', () => {
    it('should return matched files', async () => {
      vi.mocked(fg).mockResolvedValue(['/base/a.ts', '/base/b.ts'])

      const result = await service.glob('**/*.ts', '/base')

      expect(fg).toHaveBeenCalled()
      expect(result).toEqual(['/base/a.ts', '/base/b.ts'])
    })

    it('should limit results to 500 files', async () => {
      const manyFiles = Array.from({ length: 600 }, (_, i) => `/base/file-${i}.ts`)
      vi.mocked(fg).mockResolvedValue(manyFiles)

      const result = await service.glob('**/*.ts', '/base')

      expect(result).toHaveLength(500)
    })
  })

  describe('grep', () => {
    it('should find matching lines', async () => {
      vi.mocked(fg).mockResolvedValue(['/base/a.ts'])
      vi.mocked(fs.readFile).mockResolvedValue('const a = 1\nconst b = 2')

      const result = await service.grep('const', '/base', { glob: '**/*.ts' })

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ file: '/base/a.ts', line: 1, content: 'const a = 1' })
    })
  })
  describe('editFile', () => {
    it('should replace the first occurrence by default', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 100 } as any)
      vi.mocked(fs.readFile).mockResolvedValue('hello world hello')
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      const result = await service.editFile('/test/file.txt', 'hello', 'hi')

      expect(result).toBe(1)
      expect(fs.writeFile).toHaveBeenCalledWith('/test/file.txt', 'hi world hello', 'utf-8')
    })

    it('should replace all occurrences when replaceAll is true', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 100 } as any)
      vi.mocked(fs.readFile).mockResolvedValue('hello world hello')
      vi.mocked(fs.writeFile).mockResolvedValue(undefined)

      const result = await service.editFile('/test/file.txt', 'hello', 'hi', true)

      expect(result).toBe(2)
      expect(fs.writeFile).toHaveBeenCalledWith('/test/file.txt', 'hi world hi', 'utf-8')
    })

    it('should throw when text is not found', async () => {
      vi.mocked(fs.stat).mockResolvedValue({ size: 100 } as any)
      vi.mocked(fs.readFile).mockResolvedValue('no match here')

      await expect(service.editFile('/test/file.txt', 'missing', 'new'))
        .rejects.toThrow('Text not found')
    })
  })

  describe('listFiles', () => {
    it('should list files in directory', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'file.ts', isDirectory: () => false },
        { name: 'folder', isDirectory: () => true }
      ] as any)
      vi.mocked(fs.stat).mockResolvedValue({ size: 100, mtimeMs: 1000 } as any)

      const result = await service.listFiles('/test')

      expect(result).toHaveLength(2)
      expect(result[0].isDirectory).toBe(true) // folders first
    })

    it('should skip hidden files', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: '.hidden', isDirectory: () => false },
        { name: 'visible.ts', isDirectory: () => false }
      ] as any)
      vi.mocked(fs.stat).mockResolvedValue({ size: 100, mtimeMs: 1000 } as any)

      const result = await service.listFiles('/test')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('visible.ts')
    })

    it('should skip node_modules', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'node_modules', isDirectory: () => true },
        { name: 'src', isDirectory: () => true }
      ] as any)
      vi.mocked(fs.stat).mockResolvedValue({ size: 0, mtimeMs: 1000 } as any)

      const result = await service.listFiles('/test')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('src')
    })

    it('should filter by pattern', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'file.ts', isDirectory: () => false },
        { name: 'file.js', isDirectory: () => false }
      ] as any)
      vi.mocked(fs.stat).mockResolvedValue({ size: 100, mtimeMs: 1000 } as any)

      const result = await service.listFiles('/test', '.ts')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('file.ts')
    })
  })

  describe('exists', () => {
    it('should return true for existing path', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined)

      const result = await service.exists('/existing/path')

      expect(result).toBe(true)
    })

    it('should return false for non-existing path', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))

      const result = await service.exists('/missing/path')

      expect(result).toBe(false)
    })
  })

  describe('mkdir', () => {
    it('should create directory', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined)

      const result = await service.mkdir('/new/dir')

      expect(result).toBe(true)
      expect(fs.mkdir).toHaveBeenCalledWith('/new/dir', { recursive: true })
    })
  })

  describe('workspace', () => {
    it('should get and set workspace', () => {
      expect(service.getWorkspace()).toBeNull()

      service.setWorkspace('/my/workspace')

      expect(service.getWorkspace()).toBe('/my/workspace')
    })
  })
})

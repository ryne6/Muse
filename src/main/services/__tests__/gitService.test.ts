import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GitService } from '../gitService'
import { exec } from 'child_process'

vi.mock('child_process', () => {
  const exec = vi.fn()
  return {
    exec,
    default: { exec },
  }
})

const mockExec = vi.mocked(exec)

function mockExecSuccess(stdout = 'ok', stderr = '') {
  mockExec.mockImplementation((command: any, options: any, callback: any) => {
    const cb = typeof options === 'function' ? options : callback
    cb(null, stdout, stderr)
    return {} as any
  })
}

describe('GitService', () => {
  let service: GitService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new GitService()
  })

  it('should run git status', async () => {
    mockExecSuccess('status output', '')

    const result = await service.status('/repo')

    expect(mockExec).toHaveBeenCalledWith(
      'git status',
      expect.objectContaining({ cwd: '/repo' }),
      expect.any(Function)
    )
    expect(result.output).toBe('status output')
  })

  it('should run git diff with flags', async () => {
    mockExecSuccess('diff output', '')

    await service.diff('/repo', true, 'file.txt')

    expect(mockExec).toHaveBeenCalledWith(
      'git diff --staged -- "file.txt"',
      expect.objectContaining({ cwd: '/repo' }),
      expect.any(Function)
    )
  })

  it('should run git log with maxCount', async () => {
    mockExecSuccess('log output', '')

    await service.log('/repo', 5)

    expect(mockExec).toHaveBeenCalledWith(
      'git log -n 5',
      expect.objectContaining({ cwd: '/repo' }),
      expect.any(Function)
    )
  })

  it('should stage files before commit', async () => {
    mockExec
      .mockImplementationOnce((command: any, options: any, callback: any) => {
        const cb = typeof options === 'function' ? options : callback
        cb(null, '', '')
        return {} as any
      })
      .mockImplementationOnce((command: any, options: any, callback: any) => {
        const cb = typeof options === 'function' ? options : callback
        cb(null, 'commit ok', '')
        return {} as any
      })

    const result = await service.commit('/repo', 'message', ['file.txt'])

    expect(mockExec).toHaveBeenNthCalledWith(
      1,
      'git add -- "file.txt"',
      expect.objectContaining({ cwd: '/repo' }),
      expect.any(Function)
    )
    expect(mockExec).toHaveBeenNthCalledWith(
      2,
      'git commit -m "message"',
      expect.objectContaining({ cwd: '/repo' }),
      expect.any(Function)
    )
    expect(result.output).toContain('commit ok')
  })

  it('should run git push', async () => {
    mockExecSuccess('push output', '')

    await service.push('/repo', 'origin', 'main')

    expect(mockExec).toHaveBeenCalledWith(
      'git push origin main',
      expect.objectContaining({ cwd: '/repo' }),
      expect.any(Function)
    )
  })

  it('should create a branch on checkout when requested', async () => {
    mockExecSuccess('checkout output', '')

    await service.checkout('/repo', 'feature', true)

    expect(mockExec).toHaveBeenCalledWith(
      'git checkout -b feature',
      expect.objectContaining({ cwd: '/repo' }),
      expect.any(Function)
    )
  })
})

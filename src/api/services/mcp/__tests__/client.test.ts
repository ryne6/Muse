import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * MCPClient 单元测试
 *
 * 测试目标：
 * - 连接生命周期管理
 * - 工具操作
 * - OAuth URL 处理
 */

// Use vi.hoisted for mock setup
const {
  mockClientConnect,
  mockListTools,
  mockCallTool,
  mockTransportClose,
  mockOpenExternal,
  mockExec,
} = vi.hoisted(() => ({
  mockClientConnect: vi.fn().mockResolvedValue(undefined),
  mockListTools: vi.fn().mockResolvedValue({ tools: [] }),
  mockCallTool: vi.fn().mockResolvedValue({ content: [] }),
  mockTransportClose: vi.fn().mockResolvedValue(undefined),
  mockOpenExternal: vi.fn(),
  mockExec: vi.fn(),
}))

// Store transport instance for testing handlers
let transportInstance: any = null
let stderrCallback: ((data: Buffer) => void) | null = null

// Mock MCP SDK Client with class
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: class MockClient {
    connect = mockClientConnect
    listTools = mockListTools
    callTool = mockCallTool
  },
}))

// Mock MCP SDK Transport with class
vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: class MockTransport {
    stderr = {
      on: vi.fn((event: string, callback: (data: Buffer) => void) => {
        if (event === 'data') {
          stderrCallback = callback
        }
      }),
    }
    onerror: ((error: Error) => void) | null = null
    onclose: (() => void) | null = null
    close = mockTransportClose

    constructor() {
      transportInstance = this
    }
  },
}))

// Mock Electron
vi.mock('electron', () => ({
  shell: { openExternal: mockOpenExternal },
}))

// Mock child_process
vi.mock('child_process', () => ({
  exec: mockExec,
  default: { exec: mockExec },
}))

import { MCPClient } from '../client'
import type { MCPServerConfig } from '../types'

describe('MCPClient', () => {
  let client: MCPClient
  const mockConfig: MCPServerConfig = {
    id: 'test-id',
    name: 'test-server',
    command: 'node',
    args: ['server.js'],
    env: {},
    enabled: true,
    createdAt: Date.now(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    transportInstance = null
    stderrCallback = null
    client = new MCPClient(mockConfig)
  })

  afterEach(async () => {
    await client.disconnect()
  })

  describe('初始状态', () => {
    it('should have disconnected status initially', () => {
      expect(client.status).toBe('disconnected')
    })

    it('should have empty tools initially', () => {
      expect(client.tools).toEqual([])
    })

    it('should have no error initially', () => {
      expect(client.error).toBeUndefined()
    })
  })

  describe('连接生命周期', () => {
    it('should connect successfully', async () => {
      await client.connect()

      expect(client.status).toBe('connected')
      expect(mockClientConnect).toHaveBeenCalled()
    })

    it('should skip connect if already connected', async () => {
      await client.connect()
      await client.connect()

      expect(mockClientConnect).toHaveBeenCalledTimes(1)
    })

    it('should set error status on connection failure', async () => {
      mockClientConnect.mockRejectedValueOnce(new Error('Connection failed'))

      await expect(client.connect()).rejects.toThrow('Connection failed')
      expect(client.status).toBe('error')
      expect(client.error).toBe('Connection failed')
    })

    it('should disconnect and clean up resources', async () => {
      await client.connect()
      await client.disconnect()

      expect(client.status).toBe('disconnected')
      expect(client.tools).toEqual([])
      expect(mockTransportClose).toHaveBeenCalled()
    })

    it('should skip disconnect if already disconnected', async () => {
      await client.disconnect()

      expect(mockTransportClose).not.toHaveBeenCalled()
    })
  })

  describe('工具操作', () => {
    it('should refresh tools after connect', async () => {
      mockListTools.mockResolvedValueOnce({
        tools: [
          {
            name: 'read_file',
            description: 'Read a file',
            inputSchema: {
              properties: { path: { type: 'string' } },
              required: ['path'],
            },
          },
        ],
      })

      await client.connect()

      expect(client.tools).toHaveLength(1)
      expect(client.tools[0].name).toBe('read_file')
      expect(client.tools[0].serverName).toBe('test-server')
    })

    it('should throw error when refreshTools called without connection', async () => {
      await expect(client.refreshTools()).rejects.toThrow('Not connected')
    })

    it('should call tool and return result', async () => {
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'file content' }],
        isError: false,
      })

      await client.connect()
      const result = await client.callTool('read_file', { path: '/test.txt' })

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'read_file',
        arguments: { path: '/test.txt' },
      })
      expect(result.content).toHaveLength(1)
      expect(result.content[0]).toEqual({ type: 'text', text: 'file content' })
      expect(result.isError).toBe(false)
    })

    it('should throw error when callTool called without connection', async () => {
      await expect(client.callTool('read_file', {})).rejects.toThrow(
        'Not connected'
      )
    })

    it('should handle image content type', async () => {
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: 'image', data: 'base64data', mimeType: 'image/png' }],
        isError: false,
      })

      await client.connect()
      const result = await client.callTool('screenshot', {})

      expect(result.content[0]).toEqual({
        type: 'image',
        data: 'base64data',
        mimeType: 'image/png',
      })
    })

    it('should handle resource content type', async () => {
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: 'resource' }],
        isError: false,
      })

      await client.connect()
      const result = await client.callTool('get_resource', {})

      expect(result.content[0]).toEqual({ type: 'resource' })
    })

    it('should handle tool result without content field', async () => {
      mockCallTool.mockResolvedValueOnce({})

      await client.connect()
      const result = await client.callTool('empty_tool', {})

      expect(result.content).toEqual([])
    })

    it('should handle tool result without isError field', async () => {
      mockCallTool.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'result' }],
      })

      await client.connect()
      const result = await client.callTool('test_tool', {})

      expect(result.isError).toBe(false)
    })
  })

  describe('Transport 事件处理', () => {
    it('should set error status on transport error', async () => {
      await client.connect()

      // Trigger transport error
      transportInstance?.onerror?.(new Error('Transport error'))

      expect(client.status).toBe('error')
      expect(client.error).toBe('Transport error')
    })

    it('should set disconnected status on transport close', async () => {
      await client.connect()

      // Trigger transport close
      transportInstance?.onclose?.()

      expect(client.status).toBe('disconnected')
    })

    it('should not throw when transport close logging fails with EIO', async () => {
      await client.connect()

      const logSpy = vi.spyOn(console, 'log').mockImplementation(message => {
        if (
          typeof message === 'string' &&
          message.includes('[MCP:test-server] Transport closed')
        ) {
          const eioError = new Error('write EIO') as NodeJS.ErrnoException
          eioError.code = 'EIO'
          throw eioError
        }
      })

      expect(() => transportInstance?.onclose?.()).not.toThrow()
      expect(client.status).toBe('disconnected')
      logSpy.mockRestore()
    })
  })

  describe('Disconnect 错误处理', () => {
    it('should handle disconnect error gracefully', async () => {
      mockTransportClose.mockRejectedValueOnce(new Error('Close failed'))

      await client.connect()
      await client.disconnect()

      // Should still be disconnected despite error
      expect(client.status).toBe('disconnected')
    })
  })

  describe('OAuth URL 处理', () => {
    it('should open OAuth URL from stderr', async () => {
      await client.connect()

      // Simulate stderr output with OAuth URL
      stderrCallback?.(
        Buffer.from(
          'Please visit https://accounts.google.com/oauth/authorize?client_id=123'
        )
      )

      expect(mockOpenExternal).toHaveBeenCalledWith(
        'https://accounts.google.com/oauth/authorize?client_id=123'
      )
    })

    it('should open auth URL patterns', async () => {
      await client.connect()

      stderrCallback?.(Buffer.from('Login at https://example.com/login'))
      expect(mockOpenExternal).toHaveBeenCalledWith('https://example.com/login')
    })

    it('should open feishu auth URL', async () => {
      await client.connect()

      stderrCallback?.(Buffer.from('Auth: https://open.feishu.cn/authorize'))
      expect(mockOpenExternal).toHaveBeenCalledWith(
        'https://open.feishu.cn/authorize'
      )
    })

    it('should not open non-auth URLs', async () => {
      await client.connect()

      stderrCallback?.(Buffer.from('Visit https://example.com/docs'))
      expect(mockOpenExternal).not.toHaveBeenCalled()
    })

    it('should not open same URL twice', async () => {
      await client.connect()

      stderrCallback?.(Buffer.from('https://accounts.google.com/oauth'))
      stderrCallback?.(Buffer.from('https://accounts.google.com/oauth'))

      expect(mockOpenExternal).toHaveBeenCalledTimes(1)
    })

    it('should clean trailing punctuation from URLs', async () => {
      await client.connect()

      stderrCallback?.(Buffer.from('Visit https://example.com/oauth.'))
      expect(mockOpenExternal).toHaveBeenCalledWith('https://example.com/oauth')
    })

    it('should open larksuite.com auth URL', async () => {
      await client.connect()

      stderrCallback?.(
        Buffer.from('Auth: https://open.larksuite.com/authorize')
      )
      expect(mockOpenExternal).toHaveBeenCalledWith(
        'https://open.larksuite.com/authorize'
      )
    })

    it('should open consent URL', async () => {
      await client.connect()

      stderrCallback?.(
        Buffer.from('https://provider.example.com/consent?scope=read')
      )
      expect(mockOpenExternal).toHaveBeenCalledWith(
        'https://provider.example.com/consent?scope=read'
      )
    })

    it('should handle multiple URLs in single stderr output', async () => {
      await client.connect()

      stderrCallback?.(
        Buffer.from(
          'Visit https://example.com/docs or https://accounts.google.com/oauth'
        )
      )
      // Only the auth URL should be opened
      expect(mockOpenExternal).toHaveBeenCalledTimes(1)
      expect(mockOpenExternal).toHaveBeenCalledWith(
        'https://accounts.google.com/oauth'
      )
    })

    it('should open multiple auth URLs from single output', async () => {
      await client.connect()

      stderrCallback?.(
        Buffer.from(
          'https://example.com/login and https://accounts.google.com/oauth'
        )
      )
      expect(mockOpenExternal).toHaveBeenCalledTimes(2)
    })

    it('should clean trailing semicolons and colons from URLs', async () => {
      await client.connect()

      stderrCallback?.(Buffer.from('URL: https://example.com/oauth;'))
      expect(mockOpenExternal).toHaveBeenCalledWith('https://example.com/oauth')
    })

    it('should clean trailing parenthesis from URLs', async () => {
      await client.connect()

      stderrCallback?.(Buffer.from('(https://example.com/authorize)'))
      expect(mockOpenExternal).toHaveBeenCalledWith(
        'https://example.com/authorize'
      )
    })

    it('should not open URL without auth patterns', async () => {
      await client.connect()

      stderrCallback?.(Buffer.from('https://cdn.example.com/assets/image.png'))
      expect(mockOpenExternal).not.toHaveBeenCalled()
    })

    it('should handle stderr with no URLs', async () => {
      await client.connect()

      stderrCallback?.(Buffer.from('Server started on port 3000'))
      expect(mockOpenExternal).not.toHaveBeenCalled()
    })
  })
})

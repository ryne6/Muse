import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createMockMCPServer, createMockMCPToolResult } from '../../../../../tests/utils/mcp-helpers'

/**
 * MCPManager 集成测试
 *
 * 测试目标：
 * - 服务器配置管理
 * - 工具名称路由
 * - 工具调用路由
 */

// Use vi.hoisted to define mocks before hoisting
const { mockConnect, mockDisconnect, mockCallTool } = vi.hoisted(() => {
  const mockConnect = vi.fn().mockResolvedValue(undefined)
  const mockDisconnect = vi.fn().mockResolvedValue(undefined)
  const mockCallTool = vi.fn()

  return { mockConnect, mockDisconnect, mockCallTool }
})

// Mock MCPClient with a proper class
vi.mock('../client', () => ({
  MCPClient: class MockMCPClient {
    status = 'connected'
    tools: any[]
    error = undefined

    constructor(public config: any) {
      this.tools = [
        {
          name: 'test_tool',
          description: 'Test tool',
          inputSchema: { type: 'object', properties: {}, required: [] },
          serverName: config.name
        }
      ]
    }

    connect = mockConnect
    disconnect = mockDisconnect
    callTool = mockCallTool
  }
}))

// Import after mocking
import { mcpManager } from '../manager'

describe('MCPManager Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCallTool.mockResolvedValue(createMockMCPToolResult('success'))
  })

  afterEach(async () => {
    // Clean up all servers
    await mcpManager.disconnectAll()
    // Clear configs by removing each server
    const states = mcpManager.getServerStates()
    for (const state of states) {
      await mcpManager.removeServer(state.config.name)
    }
  })

  describe('服务器配置管理', () => {
    it('should add server config and return in getServerStates', () => {
      const server = createMockMCPServer({ name: 'test-server-1' })
      mcpManager.addServer(server)

      const states = mcpManager.getServerStates()
      expect(states).toHaveLength(1)
      expect(states[0].config.name).toBe('test-server-1')
      expect(states[0].status).toBe('disconnected')
    })

    it('should connect to server when connectServer is called', async () => {
      const server = createMockMCPServer({ name: 'test-server-2' })
      mcpManager.addServer(server)

      await mcpManager.connectServer('test-server-2')

      expect(mockConnect).toHaveBeenCalled()
    })

    it('should skip disabled servers in connectAll', async () => {
      const enabledServer = createMockMCPServer({ name: 'enabled', enabled: true })
      const disabledServer = createMockMCPServer({ name: 'disabled', enabled: false })

      mcpManager.addServer(enabledServer)
      mcpManager.addServer(disabledServer)

      await mcpManager.connectAll()

      // mockConnect should only be called once (for enabled server)
      expect(mockConnect).toHaveBeenCalledTimes(1)
    })

    it('should remove server and disconnect', async () => {
      const server = createMockMCPServer({ name: 'to-remove' })
      mcpManager.addServer(server)
      await mcpManager.connectServer('to-remove')

      await mcpManager.removeServer('to-remove')

      const states = mcpManager.getServerStates()
      expect(states.find(s => s.config.name === 'to-remove')).toBeUndefined()
      expect(mockDisconnect).toHaveBeenCalled()
    })
  })

  describe('工具名称路由', () => {
    it('should identify MCP tool names correctly', () => {
      expect(mcpManager.isMCPTool('mcp__server__tool')).toBe(true)
      expect(mcpManager.isMCPTool('mcp__fs__read_file')).toBe(true)
      expect(mcpManager.isMCPTool('Read')).toBe(false)
      expect(mcpManager.isMCPTool('Bash')).toBe(false)
    })

    it('should return tool definitions with mcp__ prefix', async () => {
      const server = createMockMCPServer({ name: 'myserver' })
      mcpManager.addServer(server)
      await mcpManager.connectServer('myserver')

      const tools = mcpManager.getToolDefinitions()

      expect(tools.length).toBeGreaterThan(0)
      expect(tools[0].name).toBe('mcp__myserver__test_tool')
      expect(tools[0].description).toContain('[MCP:myserver]')
    })

    it('should aggregate tools from multiple servers', async () => {
      const server1 = createMockMCPServer({ name: 'server1' })
      const server2 = createMockMCPServer({ name: 'server2' })

      mcpManager.addServer(server1)
      mcpManager.addServer(server2)

      await mcpManager.connectAll()

      const tools = mcpManager.getAllTools()
      expect(tools.length).toBe(2)
    })
  })

  describe('工具调用路由', () => {
    it('should route tool call to correct server', async () => {
      const server = createMockMCPServer({ name: 'testserver' })
      mcpManager.addServer(server)
      await mcpManager.connectServer('testserver')

      await mcpManager.callTool('mcp__testserver__test_tool', { arg: 'value' })

      expect(mockCallTool).toHaveBeenCalledWith('test_tool', { arg: 'value' })
    })

    it('should throw error for non-existent server', async () => {
      await expect(
        mcpManager.callTool('mcp__nonexistent__tool', {})
      ).rejects.toThrow('MCP server nonexistent not found')
    })

    it('should throw error for invalid tool name format', async () => {
      await expect(
        mcpManager.callTool('invalid_tool_name', {})
      ).rejects.toThrow('Invalid MCP tool name')
    })

    it('should handle tool execution errors', async () => {
      const server = createMockMCPServer({ name: 'errorserver' })
      mcpManager.addServer(server)
      await mcpManager.connectServer('errorserver')

      mockCallTool.mockResolvedValueOnce(createMockMCPToolResult('Tool failed', true))

      await expect(
        mcpManager.callTool('mcp__errorserver__test_tool', {})
      ).rejects.toThrow('Tool failed')
    })
  })
})

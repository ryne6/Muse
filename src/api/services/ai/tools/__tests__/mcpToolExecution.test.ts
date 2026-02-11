import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * MCP 工具执行集成测试
 *
 * 测试目标：
 * - MCP 工具检测和路由
 * - MCP 工具结果处理
 */

// Mock mcpManager
const mockIsMCPTool = vi.fn()
const mockCallTool = vi.fn()

vi.mock('../../../mcp/manager', () => ({
  mcpManager: {
    isMCPTool: mockIsMCPTool,
    callTool: mockCallTool,
  }
}))

// Mock axios for IPC bridge calls
vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({ data: { content: 'mock content' } })
  }
}))

// Import after mocking
import { ToolExecutor } from '../executor'

describe('MCP Tool Execution Integration', () => {
  let executor: ToolExecutor

  beforeEach(() => {
    vi.clearAllMocks()
    executor = new ToolExecutor()
    mockIsMCPTool.mockImplementation((name: string) => name.startsWith('mcp__'))
  })

  describe('MCP 工具检测和路由', () => {
    it('should route MCP tools to mcpManager', async () => {
      mockCallTool.mockResolvedValue('MCP result')

      const result = await executor.execute('mcp__server__tool', { arg: 'value' }, { toolPermissions: { allowAll: true } })

      expect(mockIsMCPTool).toHaveBeenCalledWith('mcp__server__tool')
      expect(mockCallTool).toHaveBeenCalledWith('mcp__server__tool', { arg: 'value' })
      expect(result).toBe('MCP result')
    })

    it('should not route non-MCP tools to mcpManager', async () => {
      mockIsMCPTool.mockReturnValue(false)

      // This will fail because axios is mocked, but we just want to verify routing
      await executor.execute('Read', { path: '/test' })

      expect(mockIsMCPTool).toHaveBeenCalledWith('Read')
      expect(mockCallTool).not.toHaveBeenCalled()
    })

    it('should handle unknown tools with permission request', async () => {
      mockIsMCPTool.mockReturnValue(false)

      const result = await executor.execute('UnknownTool', {})

      // Unknown tools are classified as 'moderate' and require permission
      expect(result).toContain('__tool_permission__')
    })

    it('should handle unknown tools with error when allowAll', async () => {
      mockIsMCPTool.mockReturnValue(false)

      const result = await executor.execute('UnknownTool', {}, { toolPermissions: { allowAll: true } })

      expect(result).toContain('Error')
      expect(result).toContain('Unknown tool')
    })
  })

  describe('MCP 工具结果处理', () => {
    it('should return successful MCP tool result', async () => {
      mockCallTool.mockResolvedValue('Tool executed successfully')

      const result = await executor.execute('mcp__fs__read', { path: '/test' }, { toolPermissions: { allowAll: true } })

      expect(result).toBe('Tool executed successfully')
    })

    it('should handle MCP tool errors gracefully', async () => {
      mockCallTool.mockRejectedValue(new Error('MCP connection failed'))

      const result = await executor.execute('mcp__fs__read', { path: '/test' }, { toolPermissions: { allowAll: true } })

      expect(result).toBe('Error: MCP connection failed')
    })

    it('should handle MCP tool errors without message', async () => {
      mockCallTool.mockRejectedValue({})

      const result = await executor.execute('mcp__fs__read', { path: '/test' }, { toolPermissions: { allowAll: true } })

      expect(result).toBe('Error: MCP tool execution failed')
    })
  })
})

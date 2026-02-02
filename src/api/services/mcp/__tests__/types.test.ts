import { describe, it, expect } from 'vitest'
import {
  parseMCPToolName,
  createMCPToolName,
  MCP_TOOL_PREFIX
} from '../types'

/**
 * MCP Types 工具函数测试
 *
 * 测试目标：
 * - parseMCPToolName 解析 MCP 工具名
 * - createMCPToolName 创建 MCP 工具名
 * - 边界情况处理
 */

describe('MCP Types', () => {
  describe('MCP_TOOL_PREFIX', () => {
    it('should be mcp__', () => {
      expect(MCP_TOOL_PREFIX).toBe('mcp__')
    })
  })

  describe('parseMCPToolName', () => {
    it('should parse valid MCP tool name', () => {
      const result = parseMCPToolName('mcp__filesystem__read_file')

      expect(result).not.toBeNull()
      expect(result!.serverName).toBe('filesystem')
      expect(result!.toolName).toBe('read_file')
    })

    it('should handle tool names with multiple underscores', () => {
      const result = parseMCPToolName('mcp__my_server__my_tool_name')

      expect(result).not.toBeNull()
      expect(result!.serverName).toBe('my_server')
      expect(result!.toolName).toBe('my_tool_name')
    })

    it('should handle tool names with double underscores', () => {
      const result = parseMCPToolName('mcp__server__tool__with__parts')

      expect(result).not.toBeNull()
      expect(result!.serverName).toBe('server')
      expect(result!.toolName).toBe('tool__with__parts')
    })

    it('should return null for non-MCP tool name', () => {
      const result = parseMCPToolName('read_file')

      expect(result).toBeNull()
    })

    it('should return null for invalid prefix', () => {
      const result = parseMCPToolName('mcp_filesystem__read_file')

      expect(result).toBeNull()
    })

    it('should return null for missing tool name', () => {
      const result = parseMCPToolName('mcp__filesystem')

      expect(result).toBeNull()
    })

    it('should return null for empty string', () => {
      const result = parseMCPToolName('')

      expect(result).toBeNull()
    })

    it('should return null for just prefix', () => {
      const result = parseMCPToolName('mcp__')

      expect(result).toBeNull()
    })
  })

  describe('createMCPToolName', () => {
    it('should create valid MCP tool name', () => {
      const result = createMCPToolName('filesystem', 'read_file')

      expect(result).toBe('mcp__filesystem__read_file')
    })

    it('should handle server names with underscores', () => {
      const result = createMCPToolName('my_server', 'tool')

      expect(result).toBe('mcp__my_server__tool')
    })

    it('should handle tool names with underscores', () => {
      const result = createMCPToolName('server', 'my_tool_name')

      expect(result).toBe('mcp__server__my_tool_name')
    })

    it('should handle empty server name', () => {
      const result = createMCPToolName('', 'tool')

      expect(result).toBe('mcp____tool')
    })

    it('should handle empty tool name', () => {
      const result = createMCPToolName('server', '')

      expect(result).toBe('mcp__server__')
    })
  })

  describe('roundtrip', () => {
    it('should parse what was created', () => {
      const serverName = 'test_server'
      const toolName = 'test_tool'

      const created = createMCPToolName(serverName, toolName)
      const parsed = parseMCPToolName(created)

      expect(parsed).not.toBeNull()
      expect(parsed!.serverName).toBe(serverName)
      expect(parsed!.toolName).toBe(toolName)
    })

    it('should handle complex names in roundtrip', () => {
      const serverName = 'complex_server_name'
      const toolName = 'complex__tool__name'

      const created = createMCPToolName(serverName, toolName)
      const parsed = parseMCPToolName(created)

      expect(parsed).not.toBeNull()
      expect(parsed!.serverName).toBe(serverName)
      expect(parsed!.toolName).toBe(toolName)
    })
  })
})

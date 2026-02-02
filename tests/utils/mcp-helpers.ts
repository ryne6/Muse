/**
 * Test helpers for MCP feature
 */

import type { MCPServerConfig, MCPTool, MCPServerState } from '@api/services/mcp/types'

let idCounter = 0

/**
 * Create a mock MCP server configuration
 */
export function createMockMCPServer(overrides?: Partial<MCPServerConfig>): MCPServerConfig {
  return {
    id: `mcp-${Date.now()}-${idCounter++}`,
    name: 'test-server',
    command: 'node',
    args: ['server.js'],
    env: {},
    enabled: true,
    createdAt: Date.now(),
    ...overrides
  }
}

/**
 * Create a mock MCP tool
 */
export function createMockMCPTool(serverName: string, toolName: string, overrides?: Partial<MCPTool>): MCPTool {
  return {
    name: toolName,
    description: `Mock ${toolName} tool`,
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    serverName,
    ...overrides
  }
}

/**
 * Create a mock MCP server state
 */
export function createMockMCPServerState(
  config: MCPServerConfig,
  status: MCPServerState['status'] = 'connected',
  tools: MCPTool[] = []
): MCPServerState {
  return {
    config,
    status,
    tools,
    error: status === 'error' ? 'Mock error' : undefined
  }
}

/**
 * Create a mock MCP tool result
 */
export function createMockMCPToolResult(text: string, isError = false) {
  return {
    content: [{ type: 'text' as const, text }],
    isError
  }
}

/**
 * Create multiple mock servers with tools
 */
export function createMockMCPEnvironment() {
  const server1 = createMockMCPServer({ name: 'filesystem' })
  const server2 = createMockMCPServer({ name: 'database' })

  const tools1 = [
    createMockMCPTool('filesystem', 'read_file'),
    createMockMCPTool('filesystem', 'write_file'),
  ]

  const tools2 = [
    createMockMCPTool('database', 'query'),
    createMockMCPTool('database', 'execute'),
  ]

  return {
    servers: [server1, server2],
    tools: [...tools1, ...tools2],
    serverStates: [
      createMockMCPServerState(server1, 'connected', tools1),
      createMockMCPServerState(server2, 'connected', tools2),
    ]
  }
}

// MCP Server Configuration
export interface MCPServerConfig {
  id: string
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  enabled: boolean
  createdAt: number
}

// MCP Server Connection Status
export type MCPServerStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// MCP Tool Definition (converted from MCP SDK format)
export interface MCPTool {
  name: string
  description?: string
  inputSchema: {
    type: 'object'
    properties?: Record<string, unknown>
    required?: string[]
  }
  serverName: string  // Which server this tool belongs to
}

// MCP Server State (runtime)
export interface MCPServerState {
  config: MCPServerConfig
  status: MCPServerStatus
  tools: MCPTool[]
  error?: string
}

// Tool call result from MCP
export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

// MCP prefix for tool names: mcp__{serverName}__{toolName}
export const MCP_TOOL_PREFIX = 'mcp__'

// Parse MCP tool name to get server name and original tool name
export function parseMCPToolName(fullName: string): { serverName: string; toolName: string } | null {
  if (!fullName.startsWith(MCP_TOOL_PREFIX)) {
    return null
  }
  const parts = fullName.slice(MCP_TOOL_PREFIX.length).split('__')
  if (parts.length < 2) {
    return null
  }
  return {
    serverName: parts[0],
    toolName: parts.slice(1).join('__'),
  }
}

// Create MCP tool name from server name and tool name
export function createMCPToolName(serverName: string, toolName: string): string {
  return `${MCP_TOOL_PREFIX}${serverName}__${toolName}`
}

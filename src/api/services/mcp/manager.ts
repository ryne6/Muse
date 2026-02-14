import { MCPClient } from './client'
import type { MCPServerConfig, MCPTool, MCPServerState } from './types'
import { createMCPToolName, parseMCPToolName } from './types'

class MCPManager {
  private clients: Map<string, MCPClient> = new Map()
  private configs: Map<string, MCPServerConfig> = new Map()

  // Get all server states
  getServerStates(): MCPServerState[] {
    return Array.from(this.configs.values()).map(config => {
      const client = this.clients.get(config.name)
      return {
        config,
        status: client?.status || 'disconnected',
        tools: client?.tools || [],
        error: client?.error,
      }
    })
  }

  // Get all available tools from all connected servers
  getAllTools(): MCPTool[] {
    const tools: MCPTool[] = []
    for (const client of this.clients.values()) {
      if (client.status === 'connected') {
        tools.push(...client.tools)
      }
    }
    return tools
  }

  // Get tools formatted for AI providers (with mcp__ prefix)
  getToolDefinitions(): Array<{
    name: string
    description: string
    input_schema: {
      type: 'object'
      properties?: Record<string, unknown>
      required?: string[]
    }
  }> {
    return this.getAllTools().map(tool => ({
      name: createMCPToolName(tool.serverName, tool.name),
      description: `[MCP:${tool.serverName}] ${tool.description || tool.name}`,
      input_schema: tool.inputSchema,
    }))
  }

  // Add a server configuration
  addServer(config: MCPServerConfig): void {
    this.configs.set(config.name, config)
  }

  // Remove a server
  async removeServer(name: string): Promise<void> {
    await this.disconnectServer(name)
    this.configs.delete(name)
  }

  // Connect to a specific server
  async connectServer(name: string): Promise<void> {
    const config = this.configs.get(name)
    if (!config) {
      throw new Error(`Server ${name} not found`)
    }

    if (!config.enabled) {
      console.log(`[MCPManager] Server ${name} is disabled, skipping`)
      return
    }

    let client = this.clients.get(name)
    if (!client) {
      client = new MCPClient(config)
      this.clients.set(name, client)
    }

    await client.connect()
  }

  // Disconnect from a specific server
  async disconnectServer(name: string): Promise<void> {
    const client = this.clients.get(name)
    if (client) {
      await client.disconnect()
      this.clients.delete(name)
    }
  }

  // Connect to all enabled servers
  async connectAll(): Promise<void> {
    const promises = Array.from(this.configs.values())
      .filter(config => config.enabled)
      .map(config =>
        this.connectServer(config.name).catch(err => {
          console.error(`[MCPManager] Failed to connect ${config.name}:`, err)
        })
      )

    await Promise.all(promises)
  }

  // Disconnect from all servers
  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.clients.keys()).map(name =>
      this.disconnectServer(name).catch(err => {
        console.error(`[MCPManager] Failed to disconnect ${name}:`, err)
      })
    )

    await Promise.all(promises)
  }

  // Check if a tool name is an MCP tool
  isMCPTool(toolName: string): boolean {
    return parseMCPToolName(toolName) !== null
  }

  // Call an MCP tool
  async callTool(
    fullToolName: string,
    args: Record<string, unknown>
  ): Promise<string> {
    const parsed = parseMCPToolName(fullToolName)
    if (!parsed) {
      throw new Error(`Invalid MCP tool name: ${fullToolName}`)
    }

    const client = this.clients.get(parsed.serverName)
    if (!client) {
      throw new Error(`MCP server ${parsed.serverName} not found`)
    }

    if (client.status !== 'connected') {
      throw new Error(`MCP server ${parsed.serverName} is not connected`)
    }

    const result = await client.callTool(parsed.toolName, args)

    // Convert result to string
    if (result.isError) {
      const errorText = result.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('\n')
      throw new Error(errorText || 'MCP tool execution failed')
    }

    return result.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n')
  }
}

// Singleton instance
export const mcpManager = new MCPManager()

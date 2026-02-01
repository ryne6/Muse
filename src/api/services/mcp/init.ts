import { MCPService } from '../../../main/db/services/mcpService'
import { mcpManager } from './manager'

// Helper to parse JSON fields that could be string (old data) or already parsed (new data)
function parseJsonField<T>(value: T | string | null | undefined): T | undefined {
  if (!value) return undefined
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return undefined
    }
  }
  return value
}

// Initialize MCP servers from database
export async function initializeMCP(): Promise<void> {
  try {
    // Load enabled servers from database
    const servers = await MCPService.getEnabled()

    if (servers.length === 0) {
      console.log('📦 No MCP servers configured')
      return
    }

    console.log(`📦 Loading ${servers.length} MCP server(s)...`)

    // Add each server to the manager
    for (const server of servers) {
      mcpManager.addServer({
        name: server.name,
        command: server.command,
        args: parseJsonField<string[]>(server.args),
        env: parseJsonField<Record<string, string>>(server.env),
        enabled: true,
      })
    }

    // Connect to all servers
    await mcpManager.connectAll()

    const connectedCount = mcpManager.getServerStates()
      .filter(s => s.status === 'connected').length

    console.log(`✅ MCP initialized: ${connectedCount}/${servers.length} connected`)
  } catch (error) {
    console.error('❌ MCP initialization failed:', error)
  }
}

// Connect a single MCP server (called when adding new server)
export async function connectMcpServer(server: {
  name: string
  command: string
  args?: string[] | null
  env?: Record<string, string> | null
  enabled: boolean
}): Promise<void> {
  if (!server.enabled) return

  mcpManager.addServer({
    name: server.name,
    command: server.command,
    args: parseJsonField<string[]>(server.args),
    env: parseJsonField<Record<string, string>>(server.env),
    enabled: true,
  })

  await mcpManager.connectServer(server.name)
  console.log(`✅ MCP server "${server.name}" connected`)
}

// Disconnect a single MCP server
export async function disconnectMcpServer(name: string): Promise<void> {
  await mcpManager.disconnectServer(name)
  console.log(`📦 MCP server "${name}" disconnected`)
}

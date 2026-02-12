import { serve } from '@hono/node-server'
import { createServer } from 'net'
import app from '../api'

// Store the actual port for IPC access
let actualPort: number | null = null

export function getApiPort(): number | null {
  return actualPort
}

// Check if a port is available
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => {
      server.close()
      resolve(true)
    })
    server.listen(port, '127.0.0.1')
  })
}

// Find an available port starting from the given port
async function findAvailablePort(
  startPort: number,
  maxAttempts = 10
): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i
    if (await isPortAvailable(port)) {
      return port
    }
    console.log(`⚠️ Port ${port} is in use, trying next...`)
  }
  throw new Error(`No available port found after ${maxAttempts} attempts`)
}

export async function startApiServer(port = 2323): Promise<number> {
  console.log(`🚀 Starting Hono API server...`)

  const availablePort = await findAvailablePort(port)
  actualPort = availablePort

  serve(
    {
      fetch: app.fetch,
      port: availablePort,
    },
    async info => {
      console.log(`✅ API server running at http://localhost:${info.port}`)

      // Initialize MCP servers after API server is ready
      try {
        const { initializeMCP } = await import('../api/services/mcp/init')
        await initializeMCP()

        // Initialize MCP tools for AI providers
        const { initMcpTools } =
          await import('../api/services/ai/tools/definitions')
        await initMcpTools()
      } catch (error) {
        console.error('❌ Failed to initialize MCP:', error)
      }
    }
  )

  return availablePort
}

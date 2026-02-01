import { serve } from '@hono/node-server'
import app from '../api'

export function startApiServer(port = 3000): void {
  console.log(`🚀 Starting Hono API server on port ${port}...`)

  serve(
    {
      fetch: app.fetch,
      port,
    },
    async (info) => {
      console.log(`✅ API server running at http://localhost:${info.port}`)

      // Initialize MCP servers after API server is ready
      try {
        const { initializeMCP } = await import('../api/services/mcp/init')
        await initializeMCP()

        // Initialize MCP tools for AI providers
        const { initMcpTools } = await import('../api/services/ai/tools/definitions')
        await initMcpTools()
      } catch (error) {
        console.error('❌ Failed to initialize MCP:', error)
      }
    }
  )
}

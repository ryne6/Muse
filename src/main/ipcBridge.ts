import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { FileSystemService } from './services/fileSystemService'

const app = new Hono()
const fsService = new FileSystemService()

// CORS for local API access
app.use('*', cors({
  origin: ['http://localhost:3000'],
  credentials: true,
}))

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

// IPC bridge endpoint
app.post('/ipc/:channel', async (c) => {
  const channel = c.req.param('channel')
  const body = await c.req.json()

  try {
    let result: any

    switch (channel) {
      case 'fs:readFile':
        result = { content: await fsService.readFile(body.path) }
        break

      case 'fs:writeFile':
        result = { success: await fsService.writeFile(body.path, body.content) }
        break

      case 'fs:listFiles':
        result = { files: await fsService.listFiles(body.path, body.pattern) }
        break

      case 'fs:exists':
        result = { exists: await fsService.exists(body.path) }
        break

      case 'fs:mkdir':
        result = { success: await fsService.mkdir(body.path) }
        break

      case 'exec:command':
        result = await fsService.executeCommand(body.command, body.cwd)
        break

      case 'workspace:get':
        result = { path: fsService.getWorkspace() }
        break

      case 'workspace:set':
        result = { success: fsService.setWorkspace(body.path) }
        break

      default:
        return c.json({ error: `Unknown channel: ${channel}` }, 400)
    }

    return c.json(result)
  } catch (error: any) {
    console.error(`[IPC Bridge] Error on ${channel}:`, error)
    return c.json({ error: error.message || 'Internal server error' }, 500)
  }
})

export function startIpcBridge(port = 3001): void {
  console.log(`🔗 Starting IPC Bridge on port ${port}...`)

  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`✅ IPC Bridge running at http://localhost:${info.port}`)
  })
}

export { fsService }

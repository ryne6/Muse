import { serve } from '@hono/node-server'
import app from '../api'

export function startApiServer(port = 3000): void {
  console.log(`🚀 Starting Hono API server on port ${port}...`)

  serve(
    {
      fetch: app.fetch,
      port,
    },
    (info) => {
      console.log(`✅ API server running at http://localhost:${info.port}`)
    }
  )
}

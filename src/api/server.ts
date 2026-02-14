import app from './index'

const port = process.env.PORT || 3000

console.log(`🚀 Hono API Server starting on port ${port}`)

declare const Bun: {
  serve: (options: {
    port: number
    fetch: (request: Request) => Response | Promise<Response>
  }) => { port: number }
}

const server = Bun.serve({
  port: Number(port),
  fetch: app.fetch,
})

console.log(`✅ Server running at http://localhost:${server.port}`)

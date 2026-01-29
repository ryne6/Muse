import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import chatRoutes from './routes/chat'

const app = new Hono()

// 中间件
app.use('*', logger())
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173'],
    credentials: true,
  })
)

// 健康检查
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() })
})

// 挂载路由
app.route('/api', chatRoutes)

// 404 处理
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})

// 错误处理
app.onError((err, c) => {
  console.error('Server error:', err)
  return c.json(
    {
      error: err.message || 'Internal Server Error',
    },
    500
  )
})

export default app

// Declare Bun types if not available
declare const Bun: any

// 如果直接运行此文件，启动服务器（仅在支持的运行时）
if (typeof Bun !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  const port = process.env.PORT || 3000
  console.log(`🚀 Hono API Server starting on port ${port}`)

  const server = Bun.serve({
    port: Number(port),
    fetch: app.fetch,
  })

  console.log(`✅ Server running at http://localhost:${server.port}`)
}

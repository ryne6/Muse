import { beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from './msw-handlers'
import '@testing-library/jest-dom/vitest'

// 设置 MSW (Mock Service Worker)
export const server = setupServer(...handlers)

beforeAll(() => {
  // 启动 mock 服务器
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  // 每个测试后重置 handlers
  server.resetHandlers()
})

afterAll(() => {
  // 关闭 mock 服务器
  server.close()
})

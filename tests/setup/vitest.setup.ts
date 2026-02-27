import { beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from './msw-handlers'
import '@testing-library/jest-dom/vitest'

const consoleFilters = [
  /Failed to send message:/,
  /Failed to load conversation messages:/,
  /Failed to get API port, using default:/,
  /Failed to get available models:/,
  /^\[MCP:test-server\] Connection failed:/,
  /^\[MCP:test-server\] Transport error:/,
  /^\[MCP:test-server\] Disconnect error:/,
  /KaTeX doesn't work in quirks mode/i,
  /\[antd: Image\].*rootClassName.*deprecated/i
]

const shouldFilterConsole = (args: unknown[]) => {
  if (!args.length) return false
  const firstArg = args[0]
  if (typeof firstArg !== 'string') return false
  return consoleFilters.some((pattern) => pattern.test(firstArg))
}

const consoleFilterKey = '__crowConsoleFilters__'
const globalRef = globalThis as typeof globalThis & {
  [consoleFilterKey]?: { originalError: typeof console.error; originalWarn: typeof console.warn }
}

if (!globalRef[consoleFilterKey]) {
  const originalConsoleError = console.error.bind(console)
  const originalConsoleWarn = console.warn.bind(console)

  console.error = (...args: unknown[]) => {
    if (shouldFilterConsole(args)) return
    originalConsoleError(...args)
  }

  console.warn = (...args: unknown[]) => {
    if (shouldFilterConsole(args)) return
    originalConsoleWarn(...args)
  }

  globalRef[consoleFilterKey] = {
    originalError: originalConsoleError,
    originalWarn: originalConsoleWarn
  }
}

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

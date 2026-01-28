import { vi } from 'vitest'

/**
 * Mock IPC 通信
 */

export const mockIpcHandlers: Record<string, any> = {}

export const mockIpcInvoke = vi.fn(async (channel: string, ...args: any[]) => {
  const handler = mockIpcHandlers[channel]
  if (handler) {
    return handler(...args)
  }

  // 默认返回值
  switch (channel) {
    case 'db:providers:getAll':
      return []
    case 'db:models:getAll':
      return []
    case 'db:conversations:getAll':
      return []
    case 'db:messages:getByConversationId':
      return []
    case 'workspace:get':
      return '/test/workspace'
    case 'check-server-health':
      return { status: 'ok' }
    default:
      return null
  }
})

export const mockIpcOn = vi.fn((channel: string, callback: (...args: any[]) => void) => {
  // Mock event listener
})

export const mockIpcSend = vi.fn((channel: string, ...args: any[]) => {
  // Mock send
})

/**
 * 注册 IPC handler
 */
export function registerMockIpcHandler(channel: string, handler: (...args: any[]) => any) {
  mockIpcHandlers[channel] = handler
}

/**
 * 清除所有 IPC handlers
 */
export function clearMockIpcHandlers() {
  Object.keys(mockIpcHandlers).forEach(key => {
    delete mockIpcHandlers[key]
  })
  mockIpcInvoke.mockClear()
  mockIpcOn.mockClear()
  mockIpcSend.mockClear()
}

export const mockIpc = {
  invoke: mockIpcInvoke,
  on: mockIpcOn,
  send: mockIpcSend
}

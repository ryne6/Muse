import { vi } from 'vitest'

/**
 * 等待指定时间
 */
export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 等待条件满足
 */
export const waitFor = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now()

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition')
    }
    await wait(interval)
  }
}

/**
 * Mock 定时器
 */
export const mockTimers = () => {
  vi.useFakeTimers()
  return {
    advance: (ms: number) => vi.advanceTimersByTime(ms),
    restore: () => vi.useRealTimers()
  }
}

/**
 * 创建 mock 函数并追踪调用
 */
export const createMockFn = <T extends (...args: any[]) => any>() => {
  return vi.fn<T>()
}

/**
 * 生成随机字符串
 */
export const randomString = (length = 10): string => {
  return Math.random().toString(36).substring(2, 2 + length)
}

/**
 * 生成随机 ID
 */
export const randomId = (): string => {
  return `test_${Date.now()}_${randomString(8)}`
}

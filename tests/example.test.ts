import { describe, it, expect } from 'vitest'

/**
 * 示例测试文件
 * 用于验证 Vitest 配置是否正确工作
 */

describe('Example Test Suite', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle string operations', () => {
    const str = 'Hello, Vitest!'
    expect(str).toContain('Vitest')
    expect(str.length).toBeGreaterThan(0)
  })

  it('should handle array operations', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(arr).toHaveLength(5)
    expect(arr).toContain(3)
  })

  it('should handle async operations', async () => {
    const promise = Promise.resolve('success')
    await expect(promise).resolves.toBe('success')
  })
})

describe('Test Helpers', () => {
  it('should import test helpers', async () => {
    const { randomString, randomId } = await import('./utils/test-helpers')

    const str = randomString(10)
    expect(str).toBeDefined()
    expect(str.length).toBe(10)

    const id = randomId()
    expect(id).toBeDefined()
    expect(id).toContain('test_')
  })
})

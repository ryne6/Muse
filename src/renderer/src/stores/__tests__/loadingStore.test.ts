import { describe, it, expect, beforeEach } from 'vitest'
import { useLoadingStore } from '../loadingStore'

/**
 * loadingStore 单元测试
 *
 * 测试目标：
 * - 全局加载状态管理
 * - 局部加载状态管理
 */

describe('loadingStore', () => {
  beforeEach(() => {
    // Reset store state
    useLoadingStore.setState({
      global: false,
      local: {},
    })
  })

  describe('初始状态', () => {
    it('should have correct initial state', () => {
      const state = useLoadingStore.getState()

      expect(state.global).toBe(false)
      expect(state.local).toEqual({})
    })
  })

  describe('全局加载状态', () => {
    it('should set global loading to true', () => {
      useLoadingStore.getState().setGlobal(true)

      expect(useLoadingStore.getState().global).toBe(true)
    })

    it('should set global loading to false', () => {
      useLoadingStore.setState({ global: true })
      useLoadingStore.getState().setGlobal(false)

      expect(useLoadingStore.getState().global).toBe(false)
    })
  })

  describe('局部加载状态', () => {
    it('should set local loading for a key', () => {
      useLoadingStore.getState().setLocal('button1', true)

      expect(useLoadingStore.getState().local['button1']).toBe(true)
    })

    it('should set multiple local loading states', () => {
      useLoadingStore.getState().setLocal('button1', true)
      useLoadingStore.getState().setLocal('button2', true)

      const state = useLoadingStore.getState()
      expect(state.local['button1']).toBe(true)
      expect(state.local['button2']).toBe(true)
    })

    it('should update existing local loading state', () => {
      useLoadingStore.getState().setLocal('button1', true)
      useLoadingStore.getState().setLocal('button1', false)

      expect(useLoadingStore.getState().local['button1']).toBe(false)
    })

    it('should clear local loading state', () => {
      useLoadingStore.getState().setLocal('button1', true)
      useLoadingStore.getState().setLocal('button2', true)
      useLoadingStore.getState().clearLocal('button1')

      const state = useLoadingStore.getState()
      expect(state.local['button1']).toBeUndefined()
      expect(state.local['button2']).toBe(true)
    })

    it('should handle clearing non-existent key', () => {
      useLoadingStore.getState().clearLocal('nonexistent')

      expect(useLoadingStore.getState().local).toEqual({})
    })
  })
})

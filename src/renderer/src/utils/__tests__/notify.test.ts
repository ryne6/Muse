import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * notify 单元测试
 *
 * 测试目标：
 * - 基础通知方法
 * - API 错误处理
 * - Promise 通知
 */

// Use vi.hoisted for mock setup
const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  loading: vi.fn().mockReturnValue('toast-id'),
  dismiss: vi.fn(),
  promise: vi.fn(),
}))

vi.mock('@lobehub/ui', () => ({
  toast: mockToast,
}))

import { notify } from '../notify'
import { ErrorCode } from '~shared/types/error'

describe('notify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('基础通知方法', () => {
    it('should show success notification', () => {
      notify.success('Operation successful')

      expect(mockToast.success).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Operation successful',
      })
    })

    it('should show error notification', () => {
      notify.error('Something went wrong')

      expect(mockToast.error).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Something went wrong',
        duration: 5000,
      })
    })

    it('should show error notification with custom duration', () => {
      notify.error('Error message', { duration: 10000 })

      expect(mockToast.error).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Error message',
        duration: 10000,
      })
    })

    it('should show warning notification', () => {
      notify.warning('Warning message')

      expect(mockToast.warning).toHaveBeenCalledWith({
        title: 'Warning',
        description: 'Warning message',
      })
    })

    it('should show info notification', () => {
      notify.info('Info message')

      expect(mockToast.info).toHaveBeenCalledWith({
        title: 'Info',
        description: 'Info message',
      })
    })

    it('should show loading notification and return id', () => {
      const id = notify.loading('Loading...')

      expect(mockToast.loading).toHaveBeenCalledWith({
        title: 'Loading',
        description: 'Loading...',
      })
      expect(id).toBe('toast-id')
    })

    it('should dismiss notification', () => {
      notify.dismiss('toast-123')

      expect(mockToast.dismiss).toHaveBeenCalledWith('toast-123')
    })

    it('should dismiss all notifications when no id provided', () => {
      notify.dismiss()

      expect(mockToast.dismiss).toHaveBeenCalledWith(undefined)
    })
  })

  describe('API 错误处理', () => {
    it('should show API error with message', () => {
      const apiError = {
        code: ErrorCode.UNKNOWN,
        message: 'API error occurred',
        retryable: false,
      }

      notify.apiError(apiError)

      expect(mockToast.error).toHaveBeenCalledWith({
        title: 'Error',
        description: 'API error occurred',
        duration: 5000,
      })
    })

    it('should show rate limited error with retry info', () => {
      const apiError = {
        code: ErrorCode.RATE_LIMITED,
        message: 'Rate limited',
        retryable: true,
        retryAfter: 30,
      }

      notify.apiError(apiError)

      expect(mockToast.error).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Rate limited (retry in 30s)',
        duration: 32000,
      })
    })

    it('should show retryable error with action', () => {
      const apiError = {
        code: ErrorCode.UNKNOWN,
        message: 'Retryable error',
        retryable: true,
      }
      const action = { label: 'Retry', onClick: vi.fn() }

      notify.apiError(apiError, { action })

      expect(mockToast.error).toHaveBeenCalled()
    })
  })

  describe('errorWithRetry', () => {
    it('should show error with retry duration', () => {
      const onRetry = vi.fn()
      notify.errorWithRetry('Retry error', onRetry)

      expect(mockToast.error).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Retry error',
        duration: 10000,
      })
    })
  })

  describe('promise', () => {
    it('should handle promise notifications', () => {
      const promise = Promise.resolve('result')

      notify.promise(promise, {
        loading: 'Loading...',
        success: 'Done!',
        error: 'Failed!',
      })

      expect(mockToast.promise).toHaveBeenCalledWith(promise, {
        loading: 'Loading...',
        success: 'Done!',
        error: 'Failed!',
      })
    })
  })
})

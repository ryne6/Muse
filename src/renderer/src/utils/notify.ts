import { toast } from '@lobehub/ui'
import type { APIError } from '~shared/types/error'
import { ErrorCode, getErrorMessage } from '~shared/types/error'

export interface NotifyAction {
  label: string
  onClick: () => void
}

export interface NotifyErrorOptions {
  action?: NotifyAction
  duration?: number
  retryAfter?: number
}

export const notify = {
  success: (message: string) => {
    toast.success({
      title: 'Success',
      description: message,
    })
  },

  error: (message: string, options?: NotifyErrorOptions) => {
    toast.error({
      title: 'Error',
      description: message,
      duration: options?.duration ?? 5000,
    })
  },

  warning: (message: string) => {
    toast.warning({
      title: 'Warning',
      description: message,
    })
  },

  info: (message: string) => {
    toast.info({
      title: 'Info',
      description: message,
    })
  },

  loading: (message: string) => {
    return toast.loading({
      title: 'Loading',
      description: message,
    })
  },

  dismiss: (toastId?: string | number) => {
    toast.dismiss(
      toastId === undefined ? undefined : typeof toastId === 'number' ? String(toastId) : toastId
    )
  },

  /**
   * Show error notification from APIError with appropriate messaging
   */
  apiError: (apiError: APIError, options?: NotifyErrorOptions) => {
    const message = apiError.message || getErrorMessage(apiError.code)

    // Add retry info for rate limited errors
    if (apiError.code === ErrorCode.RATE_LIMITED && apiError.retryAfter) {
      const retryMessage = `${message} (retry in ${apiError.retryAfter}s)`
      notify.error(retryMessage, {
        ...options,
        duration: (apiError.retryAfter + 2) * 1000,
      })
      return
    }

    // Show retry button for retryable errors
    if (apiError.retryable && options?.action) {
      notify.error(message, options)
      return
    }

    notify.error(message, options)
  },

  /**
   * Show error with retry action
   */
  errorWithRetry: (message: string, _onRetry: () => void) => {
    notify.error(message, {
      duration: 10000,
    })
  },

  promise: <T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: unknown) => string)
    }
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    })
  },
}

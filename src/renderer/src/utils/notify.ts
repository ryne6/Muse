import { toast } from 'sonner'
import type { APIError } from '@shared/types/error'
import { ErrorCode, getErrorMessage } from '@shared/types/error'

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
    toast.success(message)
  },

  error: (message: string, options?: NotifyErrorOptions) => {
    if (options?.action) {
      toast.error(message, {
        duration: options.duration ?? 5000,
        action: {
          label: options.action.label,
          onClick: options.action.onClick,
        },
      })
    } else {
      toast.error(message, {
        duration: options?.duration ?? 5000,
      })
    }
  },

  warning: (message: string) => {
    toast.warning(message)
  },

  info: (message: string) => {
    toast.info(message)
  },

  loading: (message: string) => {
    return toast.loading(message)
  },

  dismiss: (toastId?: string | number) => {
    toast.dismiss(toastId)
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
  errorWithRetry: (message: string, onRetry: () => void) => {
    notify.error(message, {
      action: {
        label: 'Retry',
        onClick: onRetry,
      },
      duration: 10000,
    })
  },

  promise: <T,>(
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

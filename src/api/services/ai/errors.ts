/**
 * AI-specific error handling utilities
 * Provides custom error class and HTTP status code mapping
 */

import {
  ErrorCode,
  type APIError,
  getErrorCodeFromStatus,
  getErrorMessage,
  isRetryableCode,
  createAPIError,
} from '../../../shared/types/error'

export type HttpStatusCode = 400 | 401 | 403 | 404 | 408 | 429 | 500 | 502 | 503 | 504

/**
 * Custom error class for AI-related errors
 * Extends Error with structured error information
 */
export class AIError extends Error {
  readonly code: ErrorCode
  readonly retryable: boolean
  readonly retryAfter?: number
  readonly details?: Record<string, unknown>
  readonly httpStatus: HttpStatusCode

  constructor(
    code: ErrorCode,
    message?: string,
    options?: {
      retryAfter?: number
      details?: Record<string, unknown>
      httpStatus?: HttpStatusCode
    }
  ) {
    super(message || getErrorMessage(code))
    this.name = 'AIError'
    this.code = code
    this.retryable = isRetryableCode(code)
    this.retryAfter = options?.retryAfter
    this.details = options?.details
    this.httpStatus = options?.httpStatus || errorCodeToHttpStatus(code)

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AIError)
    }
  }

  /**
   * Convert to API error response format
   */
  toAPIError(): APIError {
    return createAPIError(this.code, this.message, this.retryAfter, this.details)
  }

  /**
   * Create AIError from HTTP response
   */
  static fromHttpStatus(
    status: number,
    message?: string,
    retryAfter?: number
  ): AIError {
    const code = getErrorCodeFromStatus(status)
    const httpStatus = errorCodeToHttpStatus(code)
    return new AIError(code, message, { retryAfter, httpStatus })
  }

  /**
   * Create AIError from unknown error
   */
  static fromUnknown(error: unknown): AIError {
    if (error instanceof AIError) {
      return error
    }

    if (error instanceof Error) {
      // Check for network errors
      if (isNetworkError(error)) {
        return new AIError(ErrorCode.NETWORK_ERROR, error.message)
      }

      // Check for timeout errors
      if (isTimeoutError(error)) {
        return new AIError(ErrorCode.TIMEOUT, error.message)
      }

      // Default to internal error
      return new AIError(ErrorCode.INTERNAL_ERROR, error.message)
    }

    // Handle non-Error objects
    return new AIError(
      ErrorCode.INTERNAL_ERROR,
      typeof error === 'string' ? error : 'Unknown error'
    )
  }
}

/**
 * Map ErrorCode to HTTP status code
 */
export function errorCodeToHttpStatus(code: ErrorCode): 400 | 401 | 403 | 404 | 408 | 429 | 500 | 502 | 503 | 504 {
  const mapping: Record<ErrorCode, 400 | 401 | 403 | 404 | 408 | 429 | 500 | 502 | 503 | 504> = {
    [ErrorCode.INVALID_REQUEST]: 400,
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.RATE_LIMITED]: 429,
    [ErrorCode.REQUEST_TIMEOUT]: 408,
    [ErrorCode.PROVIDER_ERROR]: 502,
    [ErrorCode.SERVICE_UNAVAILABLE]: 503,
    [ErrorCode.NETWORK_ERROR]: 503,
    [ErrorCode.TIMEOUT]: 504,
    [ErrorCode.INTERNAL_ERROR]: 500,
    [ErrorCode.VALIDATION_ERROR]: 400,
    [ErrorCode.CONFIGURATION_ERROR]: 400,
  }
  return mapping[code] || 500
}

/**
 * Check if error is a network-related error
 */
export function isNetworkError(error: Error): boolean {
  const networkPatterns = [
    'fetch failed',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ENETUNREACH',
    'ECONNRESET',
    'network',
    'Failed to fetch',
  ]
  const message = error.message.toLowerCase()
  return networkPatterns.some((pattern) =>
    message.includes(pattern.toLowerCase())
  )
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: Error): boolean {
  const timeoutPatterns = ['timeout', 'ETIMEDOUT', 'aborted']
  const message = error.message.toLowerCase()
  return timeoutPatterns.some((pattern) =>
    message.includes(pattern.toLowerCase())
  )
}

/**
 * Parse retry-after header value
 * Returns seconds to wait, or undefined if not present/invalid
 */
export function parseRetryAfter(
  headerValue: string | null | undefined
): number | undefined {
  if (!headerValue) return undefined

  // Try parsing as number (seconds)
  const seconds = parseInt(headerValue, 10)
  if (!isNaN(seconds) && seconds > 0) {
    return seconds
  }

  // Try parsing as HTTP date
  const date = new Date(headerValue)
  if (!isNaN(date.getTime())) {
    const diff = Math.ceil((date.getTime() - Date.now()) / 1000)
    return diff > 0 ? diff : undefined
  }

  return undefined
}

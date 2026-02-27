/**
 * Unified error types for Crow application
 * Provides consistent error handling across API, Main, and Renderer processes
 */

// Error code enumeration covering all error categories
export enum ErrorCode {
  // Client errors (4xx)
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',

  // Server errors (5xx)
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',

  // Internal errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

// Unified API error response format
export interface APIError {
  code: ErrorCode
  message: string
  retryable: boolean
  retryAfter?: number // seconds until retry is allowed
  details?: Record<string, unknown>
}

// HTTP status code to ErrorCode mapping
export const HTTP_STATUS_TO_ERROR_CODE: Record<number, ErrorCode> = {
  400: ErrorCode.INVALID_REQUEST,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  408: ErrorCode.REQUEST_TIMEOUT,
  429: ErrorCode.RATE_LIMITED,
  500: ErrorCode.INTERNAL_ERROR,
  502: ErrorCode.PROVIDER_ERROR,
  503: ErrorCode.SERVICE_UNAVAILABLE,
  504: ErrorCode.TIMEOUT,
}

// Error codes that are safe to retry
export const RETRYABLE_ERROR_CODES: ErrorCode[] = [
  ErrorCode.RATE_LIMITED,
  ErrorCode.SERVICE_UNAVAILABLE,
  ErrorCode.REQUEST_TIMEOUT,
  ErrorCode.TIMEOUT,
  ErrorCode.NETWORK_ERROR,
]

// User-friendly error messages for each error code
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_REQUEST]: 'Invalid request. Please check your input.',
  [ErrorCode.UNAUTHORIZED]:
    'Invalid API key. Please check your provider configuration.',
  [ErrorCode.FORBIDDEN]:
    'Access forbidden. Your API key may not have the required permissions.',
  [ErrorCode.NOT_FOUND]: 'Resource not found.',
  [ErrorCode.RATE_LIMITED]:
    'Rate limit exceeded. Please wait a moment and try again.',
  [ErrorCode.REQUEST_TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorCode.PROVIDER_ERROR]: 'Provider service error. Please try again later.',
  [ErrorCode.SERVICE_UNAVAILABLE]:
    'Service temporarily unavailable. Please try again later.',
  [ErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection.',
  [ErrorCode.TIMEOUT]:
    'Request timed out. Please check your network connection.',
  [ErrorCode.INTERNAL_ERROR]: 'An internal error occurred. Please try again.',
  [ErrorCode.VALIDATION_ERROR]:
    'Validation failed. Please check your configuration.',
  [ErrorCode.CONFIGURATION_ERROR]:
    'Invalid configuration. Please check your settings.',
}

// Helper to check if an error code is retryable
export function isRetryableCode(code: ErrorCode): boolean {
  return RETRYABLE_ERROR_CODES.includes(code)
}

// Helper to get error code from HTTP status
export function getErrorCodeFromStatus(status: number): ErrorCode {
  return HTTP_STATUS_TO_ERROR_CODE[status] || ErrorCode.INTERNAL_ERROR
}

// Helper to get user-friendly message for error code
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.INTERNAL_ERROR]
}

// Create a standardized API error response
export function createAPIError(
  code: ErrorCode,
  message?: string,
  retryAfter?: number,
  details?: Record<string, unknown>
): APIError {
  return {
    code,
    message: message || getErrorMessage(code),
    retryable: isRetryableCode(code),
    retryAfter,
    details,
  }
}

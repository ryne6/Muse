import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { APIClient, apiClient, APIClientError, initApiClient, getApiBaseUrl } from '../apiClient'
import { ErrorCode } from '@shared/types/error'

describe('APIClient', () => {
  let client: APIClient
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    client = new APIClient()
    // Reset fetch mock for each test
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('sendMessage', () => {
    it('should send message and return content', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: 'Hello response' })
      } as Response)

      const result = await client.sendMessage(
        'openai',
        [{ role: 'user', content: 'Hello' }],
        { apiKey: 'key', model: 'gpt-4' }
      )

      expect(result).toBe('Hello response')
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:2323/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      )
    })

    it('should include tool permissions in request body when provided', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: 'Hello response' })
      } as Response)

      await client.sendMessage(
        'openai',
        [{ role: 'user', content: 'Hello' }],
        { apiKey: 'key', model: 'gpt-4' },
        { toolPermissions: { allowAll: true } }
      )

      const body = (vi.mocked(global.fetch).mock.calls[0]?.[1] as RequestInit)?.body as string
      expect(body).toContain('\"toolPermissions\"')
      expect(body).toContain('\"allowAll\":true')
    })

    it('should throw error on non-ok response', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'API error' })
      } as Response)

      await expect(
        client.sendMessage('openai', [], { apiKey: 'key', model: 'gpt-4' })
      ).rejects.toThrow('API error')
    })
  })

  describe('getAvailableProviders', () => {
    it('should return list of providers', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ providers: ['openai', 'claude'] })
      } as Response)

      const result = await client.getAvailableProviders()

      expect(result).toEqual(['openai', 'claude'])
    })

    it('should throw error on failure', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'HTTP error: 500' })
      } as Response)

      await expect(client.getAvailableProviders()).rejects.toThrow('HTTP error')
    })
  })

  describe('getDefaultModel', () => {
    it('should return default model for provider', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ defaultModel: 'gpt-4' })
      } as Response)

      const result = await client.getDefaultModel('openai')

      expect(result).toBe('gpt-4')
    })

    it('should throw error on failure', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'HTTP error: 500' })
      } as Response)

      await expect(client.getDefaultModel('openai')).rejects.toThrow('HTTP error')
    })
  })

  describe('getSupportedModels', () => {
    it('should return list of models', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: ['gpt-4', 'gpt-3.5'] })
      } as Response)

      const result = await client.getSupportedModels('openai')

      expect(result).toEqual(['gpt-4', 'gpt-3.5'])
    })
  })

  describe('healthCheck', () => {
    it('should return true when server is healthy', async () => {
      vi.mocked(global.fetch).mockResolvedValue({ ok: true } as Response)

      const result = await client.healthCheck()

      expect(result).toBe(true)
    })

    it('should return false when server is down', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      const result = await client.healthCheck()

      expect(result).toBe(false)
    })
  })

  describe('validateProvider', () => {
    it('should return valid result', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: true })
      } as Response)

      const result = await client.validateProvider('openai', {
        apiKey: 'key',
        model: 'gpt-4'
      })

      expect(result.valid).toBe(true)
    })

    it('should return error on failure', async () => {
      vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 500 } as Response)

      const result = await client.validateProvider('openai', {
        apiKey: 'key',
        model: 'gpt-4'
      })

      expect(result.valid).toBe(false)
      expect(result.error).toContain('HTTP error')
    })
  })

  describe('exported instance', () => {
    it('should export apiClient instance', () => {
      expect(apiClient).toBeInstanceOf(APIClient)
    })
  })

  describe('APIClientError', () => {
    it('should create error with message only', () => {
      const error = new APIClientError('Test error')
      expect(error.message).toBe('Test error')
      expect(error.name).toBe('APIClientError')
      expect(error.apiError).toBeUndefined()
      expect(error.status).toBeUndefined()
    })

    it('should create error with apiError and status', () => {
      const apiError = {
        code: ErrorCode.RATE_LIMITED,
        message: 'Rate limited',
        retryable: true,
        retryAfter: 30
      }
      const error = new APIClientError('Rate limited', apiError, 429)

      expect(error.message).toBe('Rate limited')
      expect(error.apiError).toEqual(apiError)
      expect(error.status).toBe(429)
    })

    it('should return retryable from apiError', () => {
      const apiError = { code: ErrorCode.RATE_LIMITED, message: 'Rate limited', retryable: true }
      const error = new APIClientError('Error', apiError)
      expect(error.retryable).toBe(true)
    })

    it('should return false for retryable when no apiError', () => {
      const error = new APIClientError('Error')
      expect(error.retryable).toBe(false)
    })

    it('should return retryAfter from apiError', () => {
      const apiError = { code: ErrorCode.RATE_LIMITED, message: 'Rate limited', retryable: true, retryAfter: 60 }
      const error = new APIClientError('Error', apiError)
      expect(error.retryAfter).toBe(60)
    })

    it('should return undefined for retryAfter when not set', () => {
      const error = new APIClientError('Error')
      expect(error.retryAfter).toBeUndefined()
    })

    it('should return code from apiError', () => {
      const apiError = { code: ErrorCode.UNAUTHORIZED, message: 'Unauthorized', retryable: false }
      const error = new APIClientError('Error', apiError)
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED)
    })

    it('should return undefined for code when no apiError', () => {
      const error = new APIClientError('Error')
      expect(error.code).toBeUndefined()
    })
  })

  describe('initApiClient', () => {
    it('should initialize with port from window.api', async () => {
      global.window = {
        api: {
          api: {
            getPort: vi.fn().mockResolvedValue(3000)
          }
        }
      } as any

      await initApiClient()

      expect(getApiBaseUrl()).toBe('http://localhost:3000/api')
    })

    it('should handle missing port gracefully', async () => {
      global.window = {
        api: {
          api: {
            getPort: vi.fn().mockResolvedValue(null)
          }
        }
      } as any

      await initApiClient()
      // Should not throw
    })

    it('should handle error when getting port', async () => {
      global.window = {
        api: {
          api: {
            getPort: vi.fn().mockRejectedValue(new Error('Failed'))
          }
        }
      } as any

      // Should not throw
      await expect(initApiClient()).resolves.not.toThrow()
    })
  })

  describe('getApiBaseUrl', () => {
    it('should return current API base URL', () => {
      const url = getApiBaseUrl()
      expect(url).toContain('http://localhost:')
      expect(url).toContain('/api')
    })
  })

  describe('sendMessageStream', () => {
    it('should stream chunks to callback', async () => {
      const chunks: any[] = []
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('{"content":"Hello"}\n')
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn()
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader }
      } as any)

      await client.sendMessageStream(
        'openai',
        [{ role: 'user', content: 'Hi' }],
        { apiKey: 'key', model: 'gpt-4' },
        (chunk) => chunks.push(chunk)
      )

      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toEqual({ content: 'Hello' })
      expect(mockReader.releaseLock).toHaveBeenCalled()
    })

    it('should throw error when response is not ok', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' })
      } as any)

      await expect(
        client.sendMessageStream(
          'openai',
          [],
          { apiKey: 'key', model: 'gpt-4' },
          () => {}
        )
      ).rejects.toThrow()
    })

    it('should throw error when no reader available', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        body: null
      } as any)

      await expect(
        client.sendMessageStream(
          'openai',
          [],
          { apiKey: 'key', model: 'gpt-4' },
          () => {}
        )
      ).rejects.toThrow('Failed to get response reader')
    })

    it('should handle error in stream', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('{"error":"Stream error"}\n')
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        releaseLock: vi.fn()
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader }
      } as any)

      await expect(
        client.sendMessageStream(
          'openai',
          [],
          { apiKey: 'key', model: 'gpt-4' },
          () => {}
        )
      ).rejects.toThrow('Stream error')
    })
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { APIClient, apiClient } from '../apiClient'

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
        'http://localhost:3000/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      )
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
})

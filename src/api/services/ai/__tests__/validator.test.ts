import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProviderValidator } from '../validator'
import { AIProviderFactory } from '../factory'
import type { AIConfig } from '../../../../shared/types/ai'

// Mock the factory
vi.mock('../factory')

describe('ProviderValidator', () => {
  let mockProvider: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock provider
    mockProvider = {
      name: 'test-provider',
      supportedModels: ['model-1', 'model-2'],
      sendMessage: vi.fn(),
      validateConfig: vi.fn(),
      getDefaultModel: vi.fn(() => 'model-1')
    }

    vi.mocked(AIProviderFactory.getProvider).mockReturnValue(mockProvider)
  })

  describe('validateProvider', () => {
    const mockConfig: AIConfig = {
      apiKey: 'test-key',
      model: 'model-1'
    }

    it('should return valid true for successful validation', async () => {
      mockProvider.validateConfig.mockReturnValue(true)
      mockProvider.sendMessage.mockResolvedValue('Test response')

      const result = await ProviderValidator.validateProvider('openai', mockConfig)

      expect(result).toEqual({ valid: true })
      expect(mockProvider.validateConfig).toHaveBeenCalledWith(mockConfig)
      expect(mockProvider.sendMessage).toHaveBeenCalled()
    })

    it('should return valid false for invalid config format', async () => {
      mockProvider.validateConfig.mockReturnValue(false)

      const result = await ProviderValidator.validateProvider('openai', mockConfig)

      expect(result).toEqual({
        valid: false,
        error: 'Invalid configuration. Please check API key and other settings.'
      })
      expect(mockProvider.sendMessage).not.toHaveBeenCalled()
    })

    it('should return valid false for empty response', async () => {
      mockProvider.validateConfig.mockReturnValue(true)
      mockProvider.sendMessage.mockResolvedValue('')

      const result = await ProviderValidator.validateProvider('openai', mockConfig)

      expect(result).toEqual({
        valid: false,
        error: 'Received empty response from provider'
      })
    })

    it('should handle 401 unauthorized error', async () => {
      mockProvider.validateConfig.mockReturnValue(true)
      mockProvider.sendMessage.mockRejectedValue(new Error('401 Unauthorized'))

      const result = await ProviderValidator.validateProvider('openai', mockConfig)

      expect(result).toEqual({
        valid: false,
        error: 'Invalid API key'
      })
    })

    it('should handle 403 forbidden error', async () => {
      mockProvider.validateConfig.mockReturnValue(true)
      mockProvider.sendMessage.mockRejectedValue(new Error('403 Forbidden'))

      const result = await ProviderValidator.validateProvider('openai', mockConfig)

      expect(result).toEqual({
        valid: false,
        error: 'API key does not have required permissions'
      })
    })

    it('should handle 429 rate limit error', async () => {
      mockProvider.validateConfig.mockReturnValue(true)
      mockProvider.sendMessage.mockRejectedValue(new Error('429 Too Many Requests'))

      const result = await ProviderValidator.validateProvider('openai', mockConfig)

      expect(result).toEqual({
        valid: false,
        error: 'Rate limit exceeded. Please try again later.'
      })
    })

    it('should handle timeout error', async () => {
      mockProvider.validateConfig.mockReturnValue(true)
      mockProvider.sendMessage.mockRejectedValue(new Error('Request timeout'))

      const result = await ProviderValidator.validateProvider('openai', mockConfig)

      expect(result).toEqual({
        valid: false,
        error: 'Request timeout. Please check your network connection.'
      })
    })

    it('should handle network error', async () => {
      mockProvider.validateConfig.mockReturnValue(true)
      mockProvider.sendMessage.mockRejectedValue(new Error('fetch failed'))

      const result = await ProviderValidator.validateProvider('openai', mockConfig)

      expect(result).toEqual({
        valid: false,
        error: 'Network error. Please check your internet connection.'
      })
    })

    it('should handle unknown error', async () => {
      mockProvider.validateConfig.mockReturnValue(true)
      mockProvider.sendMessage.mockRejectedValue(new Error('Something went wrong'))

      const result = await ProviderValidator.validateProvider('openai', mockConfig)

      expect(result).toEqual({
        valid: false,
        error: 'Something went wrong'
      })
    })
  })

  describe('getAvailableModels', () => {
    it('should return supported models for provider', async () => {
      const result = await ProviderValidator.getAvailableModels('openai')

      expect(AIProviderFactory.getProvider).toHaveBeenCalledWith('openai')
      expect(result).toEqual(['model-1', 'model-2'])
    })

    it('should return empty array for generic provider', async () => {
      mockProvider.supportedModels = []

      const result = await ProviderValidator.getAvailableModels('custom')

      expect(result).toEqual([])
    })

    it('should return empty array on error', async () => {
      vi.mocked(AIProviderFactory.getProvider).mockImplementation(() => {
        throw new Error('Provider not found')
      })

      const result = await ProviderValidator.getAvailableModels('invalid')

      expect(result).toEqual([])
    })
  })
})

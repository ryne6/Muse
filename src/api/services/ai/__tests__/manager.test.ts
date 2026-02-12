import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AIManager } from '../manager'
import { AIProviderFactory } from '../factory'
import type {
  AIMessage,
  AIConfig,
  AIStreamChunk,
} from '../../../../shared/types/ai'

// Mock the factory
vi.mock('../factory')

describe('AIManager', () => {
  let manager: AIManager
  let mockProvider: any

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new AIManager()

    // Create mock provider
    mockProvider = {
      name: 'test-provider',
      supportedModels: ['model-1', 'model-2', 'model-3'],
      sendMessage: vi.fn(),
      validateConfig: vi.fn(),
      getDefaultModel: vi.fn(() => 'model-1'),
    }

    // Mock factory to return our mock provider
    vi.mocked(AIProviderFactory.getProvider).mockReturnValue(mockProvider)
    vi.mocked(AIProviderFactory.getAvailableProviders).mockReturnValue([
      'claude',
      'openai',
      'gemini',
      'deepseek',
    ])
  })

  describe('sendMessage', () => {
    const mockMessages: AIMessage[] = [{ role: 'user', content: 'Hello' }]
    const mockConfig: AIConfig = {
      apiKey: 'test-key',
      model: 'model-1',
    }

    it('should send message through correct provider', async () => {
      mockProvider.validateConfig.mockReturnValue(true)
      mockProvider.sendMessage.mockResolvedValue('Response')

      const result = await manager.sendMessage(
        'openai',
        mockMessages,
        mockConfig
      )

      expect(AIProviderFactory.getProvider).toHaveBeenCalledWith('openai')
      expect(mockProvider.validateConfig).toHaveBeenCalledWith(mockConfig)
      expect(mockProvider.sendMessage).toHaveBeenCalledWith(
        mockMessages,
        mockConfig,
        undefined,
        undefined
      )
      expect(result).toBe('Response')
    })

    it('should handle streaming responses with onChunk callback', async () => {
      mockProvider.validateConfig.mockReturnValue(true)
      mockProvider.sendMessage.mockImplementation(
        async (msgs, cfg, onChunk) => {
          if (onChunk) {
            await onChunk({ content: 'Hello ', done: false })
            await onChunk({ content: 'World', done: true })
          }
          return 'Hello World'
        }
      )

      const chunks: AIStreamChunk[] = []
      const onChunk = (chunk: AIStreamChunk) => {
        chunks.push(chunk)
      }

      const result = await manager.sendMessage(
        'openai',
        mockMessages,
        mockConfig,
        onChunk
      )

      expect(mockProvider.sendMessage).toHaveBeenCalledWith(
        mockMessages,
        mockConfig,
        expect.any(Function),
        undefined
      )
      expect(chunks).toHaveLength(2)
      expect(chunks[0].content).toBe('Hello ')
      expect(chunks[1].content).toBe('World')
      expect(result).toBe('Hello World')
    })

    it('should throw error if config validation fails', async () => {
      mockProvider.validateConfig.mockReturnValue(false)

      await expect(
        manager.sendMessage('openai', mockMessages, mockConfig)
      ).rejects.toThrow('Invalid AI configuration')

      expect(mockProvider.sendMessage).not.toHaveBeenCalled()
    })

    it('should propagate provider errors', async () => {
      mockProvider.validateConfig.mockReturnValue(true)
      mockProvider.sendMessage.mockRejectedValue(new Error('API Error'))

      await expect(
        manager.sendMessage('openai', mockMessages, mockConfig)
      ).rejects.toThrow('API Error')
    })

    it('should handle unknown provider type', async () => {
      vi.mocked(AIProviderFactory.getProvider).mockImplementation(() => {
        throw new Error('Unknown provider type: invalid')
      })

      await expect(
        manager.sendMessage('invalid', mockMessages, mockConfig)
      ).rejects.toThrow('Unknown provider type: invalid')
    })
  })

  describe('getDefaultModel', () => {
    it('should return default model from provider', () => {
      const result = manager.getDefaultModel('openai')

      expect(AIProviderFactory.getProvider).toHaveBeenCalledWith('openai')
      expect(mockProvider.getDefaultModel).toHaveBeenCalled()
      expect(result).toBe('model-1')
    })

    it('should handle different providers', () => {
      manager.getDefaultModel('claude')
      expect(AIProviderFactory.getProvider).toHaveBeenCalledWith('claude')

      manager.getDefaultModel('gemini')
      expect(AIProviderFactory.getProvider).toHaveBeenCalledWith('gemini')
    })

    it('should throw error for unknown provider', () => {
      vi.mocked(AIProviderFactory.getProvider).mockImplementation(() => {
        throw new Error('Unknown provider type: invalid')
      })

      expect(() => manager.getDefaultModel('invalid')).toThrow(
        'Unknown provider type: invalid'
      )
    })
  })

  describe('getSupportedModels', () => {
    it('should return supported models from provider', () => {
      const result = manager.getSupportedModels('openai')

      expect(AIProviderFactory.getProvider).toHaveBeenCalledWith('openai')
      expect(result).toEqual(['model-1', 'model-2', 'model-3'])
    })

    it('should handle different providers', () => {
      manager.getSupportedModels('claude')
      expect(AIProviderFactory.getProvider).toHaveBeenCalledWith('claude')

      manager.getSupportedModels('deepseek')
      expect(AIProviderFactory.getProvider).toHaveBeenCalledWith('deepseek')
    })

    it('should throw error for unknown provider', () => {
      vi.mocked(AIProviderFactory.getProvider).mockImplementation(() => {
        throw new Error('Unknown provider type: invalid')
      })

      expect(() => manager.getSupportedModels('invalid')).toThrow(
        'Unknown provider type: invalid'
      )
    })
  })

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      const result = manager.getAvailableProviders()

      expect(AIProviderFactory.getAvailableProviders).toHaveBeenCalled()
      expect(result).toEqual(['claude', 'openai', 'gemini', 'deepseek'])
    })

    it('should return array of strings', () => {
      const result = manager.getAvailableProviders()
      expect(Array.isArray(result)).toBe(true)
      result.forEach(provider => {
        expect(typeof provider).toBe('string')
      })
    })
  })
})

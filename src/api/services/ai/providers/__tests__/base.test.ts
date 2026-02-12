import { describe, it, expect, vi } from 'vitest'
import { BaseAIProvider } from '../base'
import type {
  AIMessage,
  AIConfig,
  AIStreamChunk,
} from '../../../../../shared/types/ai'

// Create a concrete implementation for testing
class TestProvider extends BaseAIProvider {
  readonly name = 'test'
  readonly supportedModels = ['model-1', 'model-2', 'model-3']

  async sendMessage(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<string> {
    return 'test response'
  }

  getDefaultModel(): string {
    return 'model-1'
  }
}

describe('BaseAIProvider', () => {
  let provider: TestProvider

  beforeEach(() => {
    provider = new TestProvider()
  })

  describe('validateConfig', () => {
    it('should return true for valid config', () => {
      const config: AIConfig = {
        apiKey: 'valid-key',
        model: 'model-1',
      }
      expect(provider.validateConfig(config)).toBe(true)
    })

    it('should return false for empty apiKey', () => {
      const config: AIConfig = {
        apiKey: '',
        model: 'model-1',
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false for whitespace-only apiKey', () => {
      const config: AIConfig = {
        apiKey: '   ',
        model: 'model-1',
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false for missing apiKey', () => {
      const config = {
        model: 'model-1',
      } as AIConfig
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false for unsupported model', () => {
      const config: AIConfig = {
        apiKey: 'valid-key',
        model: 'unsupported-model',
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false for empty model', () => {
      const config: AIConfig = {
        apiKey: 'valid-key',
        model: '',
      }
      expect(provider.validateConfig(config)).toBe(false)
    })
  })

  describe('logError', () => {
    it('should log error with provider name', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Test error')

      // Access protected method via any
      ;(provider as any).logError(error)

      expect(consoleSpy).toHaveBeenCalledWith('[test] Error:', error)
      consoleSpy.mockRestore()
    })
  })

  describe('abstract methods', () => {
    it('should have name property', () => {
      expect(provider.name).toBe('test')
    })

    it('should have supportedModels property', () => {
      expect(provider.supportedModels).toEqual([
        'model-1',
        'model-2',
        'model-3',
      ])
    })

    it('should implement getDefaultModel', () => {
      expect(provider.getDefaultModel()).toBe('model-1')
    })

    it('should implement sendMessage', async () => {
      const result = await provider.sendMessage(
        [{ role: 'user', content: 'Hello' }],
        { apiKey: 'key', model: 'model-1' }
      )
      expect(result).toBe('test response')
    })
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { DeepSeekProvider } from '../deepseek'
import type { AIConfig } from '../../../../../shared/types/ai'

// Note: Testing only the public interface without mocking fetch
// Full integration tests would be done in e2e tests

describe('DeepSeekProvider', () => {
  let provider: DeepSeekProvider

  beforeEach(() => {
    provider = new DeepSeekProvider()
  })

  describe('provider properties', () => {
    it('should have correct name', () => {
      expect(provider.name).toBe('deepseek')
    })

    it('should have supported models', () => {
      expect(provider.supportedModels).toContain('deepseek-chat')
      expect(provider.supportedModels).toContain('deepseek-coder')
      expect(provider.supportedModels).toContain('deepseek-reasoner')
      expect(provider.supportedModels.length).toBe(3)
    })

    it('should return correct default model', () => {
      expect(provider.getDefaultModel()).toBe('deepseek-chat')
    })
  })

  describe('validateConfig', () => {
    it('should return true for valid config', () => {
      const config: AIConfig = {
        apiKey: 'valid-key',
        model: 'deepseek-chat',
      }
      expect(provider.validateConfig(config)).toBe(true)
    })

    it('should return true for all supported models', () => {
      provider.supportedModels.forEach(model => {
        const config: AIConfig = {
          apiKey: 'valid-key',
          model,
        }
        expect(provider.validateConfig(config)).toBe(true)
      })
    })

    it('should return false for empty apiKey', () => {
      const config: AIConfig = {
        apiKey: '',
        model: 'deepseek-chat',
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false for whitespace-only apiKey', () => {
      const config: AIConfig = {
        apiKey: '   ',
        model: 'deepseek-chat',
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false for unsupported model', () => {
      const config: AIConfig = {
        apiKey: 'valid-key',
        model: 'invalid-model',
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

  describe('sendMessage validation', () => {
    it('should throw error for invalid config before calling API', async () => {
      const invalidConfig: AIConfig = {
        apiKey: '',
        model: 'deepseek-chat',
      }

      await expect(
        provider.sendMessage(
          [{ role: 'user', content: 'Hello' }],
          invalidConfig
        )
      ).rejects.toThrow('Invalid configuration')
    })

    it('should throw error for unsupported model', async () => {
      const invalidConfig: AIConfig = {
        apiKey: 'test-key',
        model: 'unsupported-model',
      }

      await expect(
        provider.sendMessage(
          [{ role: 'user', content: 'Hello' }],
          invalidConfig
        )
      ).rejects.toThrow('Invalid configuration')
    })
  })

  describe('model list integrity', () => {
    it('should have non-empty model names', () => {
      provider.supportedModels.forEach(model => {
        expect(model.length).toBeGreaterThan(0)
        expect(model.trim()).toBe(model)
      })
    })

    it('should have default model in supported models', () => {
      expect(provider.supportedModels).toContain(provider.getDefaultModel())
    })

    it('should have chat model', () => {
      expect(provider.supportedModels.some(m => m.includes('chat'))).toBe(true)
    })

    it('should have coder model', () => {
      expect(provider.supportedModels.some(m => m.includes('coder'))).toBe(true)
    })

    it('should have reasoner model', () => {
      expect(provider.supportedModels.some(m => m.includes('reasoner'))).toBe(
        true
      )
    })
  })
})

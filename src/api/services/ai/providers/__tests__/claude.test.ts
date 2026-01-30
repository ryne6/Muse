import { describe, it, expect, beforeEach } from 'vitest'
import { ClaudeProvider } from '../claude'
import type { AIConfig } from '../../../../../shared/types/ai'

// Note: Testing only the public interface without mocking the SDK constructor
// Full integration tests would be done in e2e tests

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider

  beforeEach(() => {
    provider = new ClaudeProvider()
  })

  describe('provider properties', () => {
    it('should have correct name', () => {
      expect(provider.name).toBe('claude')
    })

    it('should have supported models', () => {
      expect(provider.supportedModels).toContain('claude-3-5-sonnet-20241022')
      expect(provider.supportedModels).toContain('claude-3-opus-20240229')
      expect(provider.supportedModels).toContain('claude-3-sonnet-20240229')
      expect(provider.supportedModels).toContain('claude-3-haiku-20240307')
      expect(provider.supportedModels.length).toBe(7)
    })

    it('should return correct default model', () => {
      expect(provider.getDefaultModel()).toBe('claude-3-5-sonnet-20241022')
    })
  })

  describe('validateConfig', () => {
    it('should return true for valid config', () => {
      const config: AIConfig = {
        apiKey: 'sk-ant-valid-key',
        model: 'claude-3-5-sonnet-20241022'
      }
      expect(provider.validateConfig(config)).toBe(true)
    })

    it('should return true for all supported models', () => {
      provider.supportedModels.forEach(model => {
        const config: AIConfig = {
          apiKey: 'sk-ant-valid-key',
          model
        }
        expect(provider.validateConfig(config)).toBe(true)
      })
    })

    it('should return false for empty apiKey', () => {
      const config: AIConfig = {
        apiKey: '',
        model: 'claude-3-5-sonnet-20241022'
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false for whitespace-only apiKey', () => {
      const config: AIConfig = {
        apiKey: '   ',
        model: 'claude-3-5-sonnet-20241022'
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false for unsupported model', () => {
      const config: AIConfig = {
        apiKey: 'sk-ant-valid-key',
        model: 'claude-2'
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false for empty model', () => {
      const config: AIConfig = {
        apiKey: 'sk-ant-valid-key',
        model: ''
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false for missing model', () => {
      const config = {
        apiKey: 'sk-ant-valid-key'
      } as AIConfig
      expect(provider.validateConfig(config)).toBe(false)
    })
  })

  describe('sendMessage validation', () => {
    it('should throw error for invalid config before calling API', async () => {
      const invalidConfig: AIConfig = {
        apiKey: '',
        model: 'claude-3-5-sonnet-20241022'
      }

      await expect(provider.sendMessage(
        [{ role: 'user', content: 'Hello' }],
        invalidConfig
      )).rejects.toThrow('Invalid configuration')
    })

    it('should throw error for unsupported model', async () => {
      const invalidConfig: AIConfig = {
        apiKey: 'sk-ant-test',
        model: 'unsupported-model'
      }

      await expect(provider.sendMessage(
        [{ role: 'user', content: 'Hello' }],
        invalidConfig
      )).rejects.toThrow('Invalid configuration')
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

    it('should have Claude 3 variants', () => {
      const claude3Models = provider.supportedModels.filter(m => m.includes('claude-3'))
      expect(claude3Models.length).toBeGreaterThan(0)
    })

    it('should have different capability tiers', () => {
      expect(provider.supportedModels.some(m => m.includes('opus'))).toBe(true)
      expect(provider.supportedModels.some(m => m.includes('sonnet'))).toBe(true)
      expect(provider.supportedModels.some(m => m.includes('haiku'))).toBe(true)
    })
  })

  describe('Vision support', () => {
    it('should have supportsVision true', () => {
      expect(provider.supportsVision).toBe(true)
    })

    it('should detect Claude 3 models as vision capable', () => {
      expect(provider.isVisionModel('claude-3-5-sonnet-20241022')).toBe(true)
      expect(provider.isVisionModel('claude-3-opus-20240229')).toBe(true)
      expect(provider.isVisionModel('claude-3-sonnet-20240229')).toBe(true)
      expect(provider.isVisionModel('claude-3-haiku-20240307')).toBe(true)
    })

    it('should detect non-Claude 3 models as not vision capable', () => {
      expect(provider.isVisionModel('claude-2')).toBe(false)
      expect(provider.isVisionModel('claude-instant')).toBe(false)
    })
  })
})

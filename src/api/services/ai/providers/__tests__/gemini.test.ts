import { describe, it, expect, beforeEach } from 'vitest'
import { GeminiProvider } from '../gemini'
import type { AIConfig } from '../../../../../shared/types/ai'

// Note: Testing only the public interface without mocking fetch
// Full integration tests would be done in e2e tests

describe('GeminiProvider', () => {
  let provider: GeminiProvider

  beforeEach(() => {
    provider = new GeminiProvider()
  })

  describe('provider properties', () => {
    it('should have correct name', () => {
      expect(provider.name).toBe('gemini')
    })

    it('should have supported models', () => {
      expect(provider.supportedModels).toContain('gemini-pro')
      expect(provider.supportedModels).toContain('gemini-1.5-pro')
      expect(provider.supportedModels).toContain('gemini-1.5-flash')
      expect(provider.supportedModels.length).toBeGreaterThan(0)
    })

    it('should return correct default model', () => {
      expect(provider.getDefaultModel()).toBe('gemini-pro')
    })
  })

  describe('validateConfig', () => {
    it('should return true for valid config', () => {
      const config: AIConfig = {
        apiKey: 'valid-api-key',
        model: 'gemini-pro',
      }
      expect(provider.validateConfig(config)).toBe(true)
    })

    it('should return false for empty apiKey', () => {
      const config: AIConfig = {
        apiKey: '',
        model: 'gemini-pro',
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false for whitespace-only apiKey', () => {
      const config: AIConfig = {
        apiKey: '   ',
        model: 'gemini-pro',
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should accept any model (Gemini has dynamic models)', () => {
      const config: AIConfig = {
        apiKey: 'valid-key',
        model: 'some-new-gemini-model',
      }
      // Gemini provider doesn't strictly validate model
      expect(provider.validateConfig(config)).toBe(true)
    })
  })

  describe('sendMessage validation', () => {
    it('should throw error for invalid config before calling API', async () => {
      const invalidConfig: AIConfig = {
        apiKey: '',
        model: 'gemini-pro',
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

    it('should have Gemini Pro', () => {
      expect(provider.supportedModels.some(m => m.includes('gemini-pro'))).toBe(
        true
      )
    })

    it('should have Gemini 1.5 variants', () => {
      const gemini15Models = provider.supportedModels.filter(m =>
        m.includes('1.5')
      )
      expect(gemini15Models.length).toBeGreaterThan(0)
    })
  })

  describe('Vision support', () => {
    it('should have supportsVision true', () => {
      expect(provider.supportsVision).toBe(true)
    })

    it('should detect Gemini vision models as vision capable', () => {
      expect(provider.isVisionModel('gemini-pro-vision')).toBe(true)
      expect(provider.isVisionModel('gemini-1.5-pro')).toBe(true)
      expect(provider.isVisionModel('gemini-1.5-flash')).toBe(true)
    })

    it('should detect non-vision models as not vision capable', () => {
      expect(provider.isVisionModel('gemini-pro')).toBe(false)
    })
  })
})

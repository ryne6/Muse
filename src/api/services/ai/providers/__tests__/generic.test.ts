import { describe, it, expect, beforeEach } from 'vitest'
import { GenericProvider } from '../generic'
import type { AIConfig } from '../../../../../shared/types/ai'

// Note: Testing only the public interface without mocking fetch
// Full integration tests would be done in e2e tests

describe('GenericProvider', () => {
  let provider: GenericProvider

  beforeEach(() => {
    provider = new GenericProvider()
  })

  describe('provider properties', () => {
    it('should have correct name', () => {
      expect(provider.name).toBe('generic')
    })

    it('should have empty supported models (dynamic)', () => {
      expect(provider.supportedModels).toEqual([])
    })

    it('should return empty default model', () => {
      expect(provider.getDefaultModel()).toBe('')
    })
  })

  describe('validateConfig', () => {
    it('should return true for valid config with baseURL', () => {
      const config: AIConfig = {
        apiKey: 'valid-key',
        model: 'custom-model',
        baseURL: 'https://custom.api.com',
      }
      expect(provider.validateConfig(config)).toBe(true)
    })

    it('should return false without apiKey', () => {
      const config: AIConfig = {
        apiKey: '',
        model: 'custom-model',
        baseURL: 'https://custom.api.com',
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false without model', () => {
      const config: AIConfig = {
        apiKey: 'valid-key',
        model: '',
        baseURL: 'https://custom.api.com',
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false without baseURL', () => {
      const config: AIConfig = {
        apiKey: 'valid-key',
        model: 'custom-model',
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should accept any model name (dynamic)', () => {
      const config: AIConfig = {
        apiKey: 'valid-key',
        model: 'any-model-name-123',
        baseURL: 'https://custom.api.com',
      }
      expect(provider.validateConfig(config)).toBe(true)
    })
  })

  describe('sendMessage validation', () => {
    it('should throw error when baseURL is missing', async () => {
      const configWithoutBaseURL: AIConfig = {
        apiKey: 'test-key',
        model: 'custom-model',
      }

      await expect(
        provider.sendMessage(
          [{ role: 'user', content: 'Hello' }],
          configWithoutBaseURL
        )
      ).rejects.toThrow('Base URL is required for generic provider')
    })

    it('should throw error when apiKey is missing', async () => {
      const configWithoutKey: AIConfig = {
        apiKey: '',
        model: 'custom-model',
        baseURL: 'https://custom.api.com',
      }

      await expect(
        provider.sendMessage(
          [{ role: 'user', content: 'Hello' }],
          configWithoutKey
        )
      ).rejects.toThrow('API Key and model are required')
    })

    it('should throw error when model is missing', async () => {
      const configWithoutModel: AIConfig = {
        apiKey: 'test-key',
        model: '',
        baseURL: 'https://custom.api.com',
      }

      await expect(
        provider.sendMessage(
          [{ role: 'user', content: 'Hello' }],
          configWithoutModel
        )
      ).rejects.toThrow('API Key and model are required')
    })
  })

  describe('dynamic model support', () => {
    it('should have no predefined models', () => {
      expect(provider.supportedModels.length).toBe(0)
    })

    it('should accept any model string in config', () => {
      const testModels = [
        'llama-2-70b',
        'mistral-7b-instruct',
        'codellama-34b',
        'custom/my-model:latest',
      ]

      testModels.forEach(model => {
        const config: AIConfig = {
          apiKey: 'key',
          model,
          baseURL: 'https://api.example.com',
        }
        expect(provider.validateConfig(config)).toBe(true)
      })
    })
  })

  describe('baseURL requirement', () => {
    it('should require baseURL for all operations', () => {
      const configWithoutBase: AIConfig = {
        apiKey: 'key',
        model: 'model',
      }
      expect(provider.validateConfig(configWithoutBase)).toBe(false)
    })

    it('should validate with any valid baseURL', () => {
      const testURLs = [
        'https://api.openrouter.ai/v1',
        'https://api.moonshot.cn/v1',
        'http://localhost:11434',
      ]

      testURLs.forEach(baseURL => {
        const config: AIConfig = {
          apiKey: 'key',
          model: 'model',
          baseURL,
        }
        expect(provider.validateConfig(config)).toBe(true)
      })
    })
  })
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OpenAIProvider } from '../openai'
import type { AIConfig } from '../../../../../shared/types/ai'

// Mock tool executor
vi.mock('../../tools/executor', () => ({
  ToolExecutor: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue('Tool result'),
  })),
}))

// Mock getAllTools
vi.mock('../../tools/definitions', () => ({
  getAllTools: vi
    .fn()
    .mockReturnValue([
      { name: 'test_tool', description: 'Test', input_schema: {} },
    ]),
}))

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider

  beforeEach(() => {
    provider = new OpenAIProvider()
  })

  describe('provider properties', () => {
    it('should have correct name', () => {
      expect(provider.name).toBe('openai')
    })

    it('should have supported models', () => {
      expect(provider.supportedModels).toContain('gpt-4-turbo-preview')
      expect(provider.supportedModels).toContain('gpt-4-turbo')
      expect(provider.supportedModels).toContain('gpt-4')
      expect(provider.supportedModels).toContain('gpt-3.5-turbo')
      expect(provider.supportedModels.length).toBeGreaterThan(0)
    })

    it('should return correct default model', () => {
      expect(provider.getDefaultModel()).toBe('gpt-4-turbo-preview')
    })
  })

  describe('validateConfig', () => {
    it('should return true for valid config', () => {
      const config: AIConfig = {
        apiKey: 'sk-valid-key',
        model: 'gpt-4',
      }
      expect(provider.validateConfig(config)).toBe(true)
    })

    it('should return true for all supported models', () => {
      provider.supportedModels.forEach(model => {
        const config: AIConfig = {
          apiKey: 'sk-valid-key',
          model,
        }
        expect(provider.validateConfig(config)).toBe(true)
      })
    })

    it('should return false for empty apiKey', () => {
      const config: AIConfig = {
        apiKey: '',
        model: 'gpt-4',
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false for whitespace-only apiKey', () => {
      const config: AIConfig = {
        apiKey: '   ',
        model: 'gpt-4',
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false for unsupported model', () => {
      const config: AIConfig = {
        apiKey: 'sk-valid-key',
        model: 'invalid-model',
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false for empty model', () => {
      const config: AIConfig = {
        apiKey: 'sk-valid-key',
        model: '',
      }
      expect(provider.validateConfig(config)).toBe(false)
    })

    it('should return false for missing model', () => {
      const config = {
        apiKey: 'sk-valid-key',
      } as AIConfig
      expect(provider.validateConfig(config)).toBe(false)
    })
  })

  describe('sendMessage validation', () => {
    it('should throw error for invalid config before calling API', async () => {
      const invalidConfig: AIConfig = {
        apiKey: '',
        model: 'gpt-4',
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
        apiKey: 'sk-test',
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

    it('should have GPT-4 variants', () => {
      const gpt4Models = provider.supportedModels.filter(m =>
        m.includes('gpt-4')
      )
      expect(gpt4Models.length).toBeGreaterThan(0)
    })

    it('should have GPT-3.5 variants', () => {
      const gpt35Models = provider.supportedModels.filter(m =>
        m.includes('gpt-3.5')
      )
      expect(gpt35Models.length).toBeGreaterThan(0)
    })
  })

  describe('Vision support', () => {
    it('should have supportsVision true', () => {
      expect(provider.supportsVision).toBe(true)
    })

    it('should detect GPT-4 vision models as vision capable', () => {
      expect(provider.isVisionModel('gpt-4-vision-preview')).toBe(true)
      expect(provider.isVisionModel('gpt-4o')).toBe(true)
      expect(provider.isVisionModel('gpt-4o-mini')).toBe(true)
      expect(provider.isVisionModel('gpt-4-turbo')).toBe(true)
    })

    it('should detect non-vision models as not vision capable', () => {
      expect(provider.isVisionModel('gpt-3.5-turbo')).toBe(false)
      expect(provider.isVisionModel('gpt-4')).toBe(false)
    })
  })

  describe('thinking support', () => {
    it('should have supportsThinking true', () => {
      expect(provider.supportsThinking).toBe(true)
    })
  })
})

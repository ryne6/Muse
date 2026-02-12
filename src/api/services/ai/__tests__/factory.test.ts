import { describe, it, expect, beforeEach } from 'vitest'
import { AIProviderFactory } from '../factory'
import { ClaudeProvider } from '../providers/claude'
import { OpenAIProvider } from '../providers/openai'
import { GeminiProvider } from '../providers/gemini'
import { DeepSeekProvider } from '../providers/deepseek'
import { GenericProvider } from '../providers/generic'

describe('AIProviderFactory', () => {
  describe('getProvider', () => {
    it('should return Claude provider for "claude" type', () => {
      const provider = AIProviderFactory.getProvider('claude')
      expect(provider).toBeInstanceOf(ClaudeProvider)
      expect(provider.name).toBe('claude')
    })

    it('should return OpenAI provider for "openai" type', () => {
      const provider = AIProviderFactory.getProvider('openai')
      expect(provider).toBeInstanceOf(OpenAIProvider)
      expect(provider.name).toBe('openai')
    })

    it('should return Gemini provider for "gemini" type', () => {
      const provider = AIProviderFactory.getProvider('gemini')
      expect(provider).toBeInstanceOf(GeminiProvider)
      expect(provider.name).toBe('gemini')
    })

    it('should return DeepSeek provider for "deepseek" type', () => {
      const provider = AIProviderFactory.getProvider('deepseek')
      expect(provider).toBeInstanceOf(DeepSeekProvider)
      expect(provider.name).toBe('deepseek')
    })

    it('should return Generic provider for "moonshot" type', () => {
      const provider = AIProviderFactory.getProvider('moonshot')
      expect(provider).toBeInstanceOf(GenericProvider)
    })

    it('should return Generic provider for "openrouter" type', () => {
      const provider = AIProviderFactory.getProvider('openrouter')
      expect(provider).toBeInstanceOf(GenericProvider)
    })

    it('should return Generic provider for "custom" type', () => {
      const provider = AIProviderFactory.getProvider('custom')
      expect(provider).toBeInstanceOf(GenericProvider)
    })

    it('should throw error for unknown provider type', () => {
      expect(() => {
        AIProviderFactory.getProvider('unknown')
      }).toThrow('Unknown provider type: unknown')
    })

    it('should return same instance for multiple calls (singleton pattern)', () => {
      const provider1 = AIProviderFactory.getProvider('claude')
      const provider2 = AIProviderFactory.getProvider('claude')
      expect(provider1).toBe(provider2)
    })
  })

  describe('getAvailableProviders', () => {
    it('should return list of all available provider types', () => {
      const providers = AIProviderFactory.getAvailableProviders()
      expect(providers).toContain('claude')
      expect(providers).toContain('openai')
      expect(providers).toContain('gemini')
      expect(providers).toContain('deepseek')
      expect(providers).toContain('moonshot')
      expect(providers).toContain('openrouter')
      expect(providers).toContain('custom')
      expect(providers.length).toBe(7)
    })

    it('should return array of strings', () => {
      const providers = AIProviderFactory.getAvailableProviders()
      expect(Array.isArray(providers)).toBe(true)
      providers.forEach(provider => {
        expect(typeof provider).toBe('string')
      })
    })
  })

  describe('getProviderInfo', () => {
    it('should return provider info for valid provider', () => {
      const info = AIProviderFactory.getProviderInfo('claude')
      expect(info).toBeDefined()
      expect(info).toHaveProperty('name')
      expect(info).toHaveProperty('models')
      expect(Array.isArray(info?.models)).toBe(true)
    })

    it('should return null for unknown provider', () => {
      const info = AIProviderFactory.getProviderInfo('unknown')
      expect(info).toBeNull()
    })

    it('should return correct model list for each provider', () => {
      const claudeInfo = AIProviderFactory.getProviderInfo('claude')
      expect(claudeInfo?.models.length).toBeGreaterThan(0)

      const openaiInfo = AIProviderFactory.getProviderInfo('openai')
      expect(openaiInfo?.models.length).toBeGreaterThan(0)
    })
  })

  describe('registerProvider', () => {
    it('should allow registering custom provider', () => {
      const mockProvider = {
        name: 'TestProvider',
        supportedModels: ['test-model'],
        sendMessage: async () => 'test',
        validateConfig: () => true,
        getDefaultModel: () => 'test-model',
      }

      AIProviderFactory.registerProvider('test-provider', mockProvider)
      const provider = AIProviderFactory.getProvider('test-provider')
      expect(provider).toBe(mockProvider)
    })

    it('should allow overriding existing provider', () => {
      const mockProvider = {
        name: 'CustomClaude',
        supportedModels: ['custom-model'],
        sendMessage: async () => 'custom',
        validateConfig: () => true,
        getDefaultModel: () => 'custom-model',
      }

      AIProviderFactory.registerProvider('claude', mockProvider)
      const provider = AIProviderFactory.getProvider('claude')
      expect(provider.name).toBe('CustomClaude')
    })
  })
})

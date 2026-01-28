import type { AIProvider } from '../../../shared/types/ai'
import { ClaudeProvider } from './providers/claude'
import { OpenAIProvider } from './providers/openai'
import { GeminiProvider } from './providers/gemini'
import { DeepSeekProvider } from './providers/deepseek'
import { GenericProvider } from './providers/generic'

export class AIProviderFactory {
  private static providers: Map<string, AIProvider> = new Map<string, AIProvider>([
    ['claude', new ClaudeProvider()],
    ['openai', new OpenAIProvider()],
    ['gemini', new GeminiProvider()],
    ['deepseek', new DeepSeekProvider()],
    ['moonshot', new GenericProvider()],
    ['openrouter', new GenericProvider()],
    ['custom', new GenericProvider()],
  ])

  static getProvider(type: string): AIProvider {
    const provider = this.providers.get(type)
    if (!provider) {
      throw new Error(`Unknown provider type: ${type}`)
    }
    return provider
  }

  static registerProvider(type: string, provider: AIProvider): void {
    this.providers.set(type, provider)
  }

  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  static getProviderInfo(type: string): { name: string; models: string[] } | null {
    const provider = this.providers.get(type)
    if (!provider) return null

    return {
      name: provider.name,
      models: provider.supportedModels,
    }
  }
}

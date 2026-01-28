import { AIProviderFactory } from './factory'
import type {
  AIMessage,
  AIConfig,
  AIStreamChunk,
} from '../../../shared/types/ai'

export class AIManager {
  async sendMessage(
    providerType: string,
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<string> {
    const provider = AIProviderFactory.getProvider(providerType)

    if (!provider.validateConfig(config)) {
      throw new Error('Invalid AI configuration')
    }

    return await provider.sendMessage(messages, config, onChunk)
  }

  getDefaultModel(providerType: string): string {
    const provider = AIProviderFactory.getProvider(providerType)
    return provider.getDefaultModel()
  }

  getSupportedModels(providerType: string): string[] {
    const provider = AIProviderFactory.getProvider(providerType)
    return provider.supportedModels
  }

  getAvailableProviders(): string[] {
    return AIProviderFactory.getAvailableProviders()
  }
}

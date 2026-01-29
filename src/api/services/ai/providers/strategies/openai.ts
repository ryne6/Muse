import type { AIConfig, AIMessage } from '../../../../../shared/types/ai'
import type { ProviderStrategy, StrategyOptions } from './index'

function getEndpoint(apiFormat?: string): string {
  if (apiFormat === 'responses') return '/responses'
  return '/chat/completions'
}

export const openAIStrategy: ProviderStrategy = {
  getEndpoint: (config: AIConfig) => getEndpoint(config.apiFormat),
  buildHeaders: (config: AIConfig) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  }),
  buildBody: (messages: AIMessage[], config: AIConfig, options: StrategyOptions) => ({
    model: config.model,
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    temperature: config.temperature ?? 1,
    max_tokens: config.maxTokens ?? 4096,
    stream: options.stream,
  }),
  parseStreamChunk: (parsed: any) => parsed.choices?.[0]?.delta?.content,
  parseResponse: (result: any) => result.choices?.[0]?.message?.content || '',
}

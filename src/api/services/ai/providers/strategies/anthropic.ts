import type { AIConfig, AIMessage } from '../../../../../shared/types/ai'
import type { ProviderStrategy, StrategyOptions } from './index'

export const anthropicStrategy: ProviderStrategy = {
  getEndpoint: () => '/v1/messages',
  buildHeaders: (config: AIConfig) => ({
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey,
    'anthropic-version': '2023-06-01',
  }),
  buildBody: (messages: AIMessage[], config: AIConfig, options: StrategyOptions) => ({
    model: config.model,
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    max_tokens: config.maxTokens ?? 4096,
    stream: options.stream,
  }),
  parseStreamChunk: (parsed: any) => {
    if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
      return parsed.delta.text
    }
    return undefined
  },
  parseResponse: (result: any) => {
    const textBlock = result.content?.find((block: any) => block.type === 'text')
    return textBlock?.text || ''
  },
}

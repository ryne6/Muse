import type { AIConfig, AIMessage } from '../../../../../shared/types/ai'
import type { ProviderStrategy, StrategyOptions, StreamChunkResult } from './index'

export const anthropicStrategy: ProviderStrategy = {
  getEndpoint: () => '/v1/messages',
  buildHeaders: (config: AIConfig) => ({
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey,
    'anthropic-version': '2023-06-01',
  }),
  buildBody: (messages: AIMessage[], config: AIConfig, options: StrategyOptions) => {
    const body: Record<string, unknown> = {
      model: config.model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      max_tokens: config.maxTokens ?? 16000,
      stream: options.stream,
    }

    if (config.thinkingEnabled) {
      body.thinking = {
        type: 'enabled',
        budget_tokens: config.thinkingBudget ?? 10000,
      }
      body.temperature = 1
      console.log('[anthropic-strategy] Thinking enabled, budget:', config.thinkingBudget ?? 10000)
    }

    console.log('[anthropic-strategy] buildBody:', JSON.stringify(body, null, 2))
    return body
  },
  parseStreamChunk: (parsed: any): StreamChunkResult | undefined => {
    if (parsed.type === 'content_block_delta') {
      if (parsed.delta?.type === 'thinking_delta') {
        console.log('[anthropic-strategy] Got thinking_delta:', parsed.delta.thinking?.slice(0, 50))
        return { thinking: parsed.delta.thinking }
      }
      if (parsed.delta?.type === 'text_delta') {
        return { content: parsed.delta.text }
      }
    }
    return undefined
  },
  parseResponse: (result: any) => {
    const textBlock = result.content?.find((block: any) => block.type === 'text')
    return textBlock?.text || ''
  },
}

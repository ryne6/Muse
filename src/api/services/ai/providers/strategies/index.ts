import type { AIConfig, AIMessage } from '../../../../../shared/types/ai'
import { openAIStrategy } from './openai'
import { anthropicStrategy } from './anthropic'

export interface StrategyOptions {
  stream: boolean
}

export interface StreamToolCallDelta {
  index?: number
  id?: string
  function?: {
    name?: string
    arguments?: string
  }
}

export interface StreamChunkResult {
  content?: string
  thinking?: string
  toolCalls?: StreamToolCallDelta[]
}

export interface ProviderStrategy {
  getEndpoint: (config: AIConfig) => string
  buildHeaders: (config: AIConfig) => Record<string, string>
  buildBody: (
    messages: AIMessage[],
    config: AIConfig,
    options: StrategyOptions
  ) => Record<string, unknown>
  parseStreamChunk: (parsed: unknown) => StreamChunkResult | undefined
  parseResponse: (result: unknown) => string
}

export function getStrategy(apiFormat?: string): ProviderStrategy {
  if (apiFormat === 'anthropic-messages') {
    return anthropicStrategy
  }
  return openAIStrategy
}

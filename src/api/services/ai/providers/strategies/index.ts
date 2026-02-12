import type { AIConfig, AIMessage } from '../../../../../shared/types/ai'
import { openAIStrategy } from './openai'
import { anthropicStrategy } from './anthropic'

export interface StrategyOptions {
  stream: boolean
}

export interface StreamChunkResult {
  content?: string
  thinking?: string
  toolCalls?: any[]
}

export interface ProviderStrategy {
  getEndpoint: (config: AIConfig) => string
  buildHeaders: (config: AIConfig) => Record<string, string>
  buildBody: (
    messages: AIMessage[],
    config: AIConfig,
    options: StrategyOptions
  ) => any
  parseStreamChunk: (parsed: any) => StreamChunkResult | undefined
  parseResponse: (result: any) => string
}

export function getStrategy(apiFormat?: string): ProviderStrategy {
  if (apiFormat === 'anthropic-messages') {
    return anthropicStrategy
  }
  return openAIStrategy
}

import type { AIConfig, AIMessage, MessageContent } from '../../../../../shared/types/ai'
import type { ProviderStrategy, StrategyOptions, StreamChunkResult } from './index'
import { getAllTools } from '../../tools/definitions'

function convertContent(content: string | MessageContent[]): string | any[] {
  if (typeof content === 'string') return content
  return content.map((block) => {
    if (block.type === 'text') {
      return { type: 'text', text: block.text }
    }
    if (block.type === 'image') {
      return {
        type: 'image_url',
        image_url: {
          url: `data:${block.mimeType};base64,${block.data}`,
          detail: 'auto',
        },
      }
    }
    return block
  })
}

function convertTools(tools: any[]): any[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }))
}

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
      content: convertContent(msg.content),
    })),
    tools: convertTools(getAllTools()),
    temperature: config.temperature ?? 1,
    max_tokens: config.maxTokens ?? 10000000,
    stream: options.stream,
  }),
  parseStreamChunk: (parsed: any): StreamChunkResult | undefined => {
    const content = parsed.choices?.[0]?.delta?.content
    const toolCalls = parsed.choices?.[0]?.delta?.tool_calls
    if (content) {
      return { content }
    }
    if (toolCalls) {
      return { toolCalls }
    }
    return undefined
  },
  parseResponse: (result: any) => result.choices?.[0]?.message?.content || '',
}

import type {
  AIConfig,
  AIMessage,
  MessageContent,
} from '../../../../../shared/types/ai'
import type {
  ProviderStrategy,
  StrategyOptions,
  StreamChunkResult,
} from './index'
import { getAllTools } from '../../tools/definitions'

function convertContent(content: string | MessageContent[]): string | any[] {
  if (typeof content === 'string') return content
  return content.map(block => {
    if (block.type === 'text') {
      return { type: 'text', text: block.text }
    }
    if (block.type === 'image') {
      return {
        type: 'image',
        source: {
          type: 'base64',
          media_type: block.mimeType,
          data: block.data,
        },
      }
    }
    return block
  })
}

export const anthropicStrategy: ProviderStrategy = {
  getEndpoint: () => '/v1/messages',
  buildHeaders: (config: AIConfig) => ({
    'Content-Type': 'application/json',
    'x-api-key': config.apiKey,
    'anthropic-version': '2023-06-01',
  }),
  buildBody: (
    messages: AIMessage[],
    config: AIConfig,
    options: StrategyOptions
  ) => {
    // Extract system message
    const systemMessage = messages.find(m => m.role === 'system')
    const conversationMessages = messages.filter(m => m.role !== 'system')

    const body: Record<string, unknown> = {
      model: config.model,
      messages: conversationMessages.map(msg => ({
        role: msg.role,
        content: convertContent(msg.content),
      })),
      tools: getAllTools(),
      max_tokens: config.maxTokens ?? 10000000,
      stream: options.stream,
    }

    // Add system prompt if present
    if (systemMessage) {
      body.system =
        typeof systemMessage.content === 'string'
          ? systemMessage.content
          : (systemMessage.content as any[])
              .map((b: any) => b.text || '')
              .join('\n')
    }

    if (config.thinkingEnabled) {
      body.thinking = {
        type: 'enabled',
        budget_tokens: config.thinkingBudget ?? 10000,
      }
      body.temperature = 1
      console.log(
        '[anthropic-strategy] Thinking enabled, budget:',
        config.thinkingBudget ?? 10000
      )
    }

    console.log(
      '[anthropic-strategy] buildBody:',
      JSON.stringify(body, null, 2)
    )
    return body
  },
  parseStreamChunk: (parsed: any): StreamChunkResult | undefined => {
    // Handle tool_use block start
    if (parsed.type === 'content_block_start') {
      if (parsed.content_block?.type === 'tool_use') {
        return {
          toolCalls: [
            {
              index: parsed.index,
              id: parsed.content_block.id,
              function: { name: parsed.content_block.name, arguments: '' },
            },
          ],
        }
      }
    }
    if (parsed.type === 'content_block_delta') {
      // Handle tool input JSON delta
      if (parsed.delta?.type === 'input_json_delta') {
        return {
          toolCalls: [
            {
              index: parsed.index,
              function: { arguments: parsed.delta.partial_json },
            },
          ],
        }
      }
      if (parsed.delta?.type === 'thinking_delta') {
        console.log(
          '[anthropic-strategy] Got thinking_delta:',
          parsed.delta.thinking?.slice(0, 50)
        )
        return { thinking: parsed.delta.thinking }
      }
      if (parsed.delta?.type === 'text_delta') {
        return { content: parsed.delta.text }
      }
    }
    return undefined
  },
  parseResponse: (result: any) => {
    const textBlock = result.content?.find(
      (block: any) => block.type === 'text'
    )
    return textBlock?.text || ''
  },
}

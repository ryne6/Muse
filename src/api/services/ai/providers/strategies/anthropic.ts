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

function extractSystemText(systemMessage?: AIMessage): string {
  if (!systemMessage) return ''
  if (typeof systemMessage.content === 'string') return systemMessage.content
  return (systemMessage.content as any[]).map((b: any) => b.text || '').join('\n')
}

function shouldInjectSystemFallback(config: AIConfig): boolean {
  if (!config.baseURL) return false
  try {
    const host = new URL(config.baseURL).hostname.toLowerCase()
    return !host.endsWith('anthropic.com')
  } catch {
    // Invalid or non-standard URL for custom gateways: prefer fallback for compatibility
    return true
  }
}

function withSystemFallback(
  messages: AIMessage[],
  systemText: string
): AIMessage[] {
  if (!systemText) return messages

  const fallbackHeader = '[System Instructions - Compatibility Fallback]'
  const fallbackText = `${fallbackHeader}\n${systemText}`

  const firstUserIndex = messages.findIndex(m => m.role === 'user')
  if (firstUserIndex === -1) {
    return [{ role: 'user', content: fallbackText }, ...messages]
  }

  return messages.map((msg, index) => {
    if (index !== firstUserIndex) return msg

    if (typeof msg.content === 'string') {
      return { ...msg, content: `${fallbackText}\n\n${msg.content}` }
    }

    return {
      ...msg,
      content: [{ type: 'text', text: fallbackText }, ...msg.content],
    }
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
    const systemText = extractSystemText(systemMessage)
    let conversationMessages = messages.filter(m => m.role !== 'system')

    if (systemText && shouldInjectSystemFallback(config)) {
      conversationMessages = withSystemFallback(conversationMessages, systemText)
    }

    const thinkingBudget = config.thinkingBudget ?? 10000
    const responseTokens = config.maxTokens ?? 8192
    // thinking 开启时 max_tokens 是总预算（thinking + 回复），必须 > budget_tokens
    const maxTokens = config.thinkingEnabled
      ? thinkingBudget + responseTokens
      : responseTokens

    const body: Record<string, unknown> = {
      model: config.model,
      messages: conversationMessages.map(msg => ({
        role: msg.role,
        content: convertContent(msg.content),
      })),
      tools: getAllTools(),
      max_tokens: maxTokens,
      stream: options.stream,
    }

    // Add system prompt if present
    if (systemMessage) {
      body.system = systemText
    }

    if (config.thinkingEnabled) {
      body.thinking = {
        type: 'enabled',
        budget_tokens: thinkingBudget,
      }
      body.temperature = 1
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

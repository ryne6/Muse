import type {
  AIConfig,
  AIMessage,
  MessageContent,
} from '../../../../../shared/types/ai'
import type {
  ProviderStrategy,
  StrategyOptions,
  StreamChunkResult,
  StreamToolCallDelta,
} from './index'
import { getAllTools } from '../../tools/definitions'

type ToolDefinition = ReturnType<typeof getAllTools>[number]

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined
}

function convertContent(
  content: string | MessageContent[]
): string | Array<Record<string, unknown>> {
  if (typeof content === 'string') return content
  return content.map(block => {
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

function convertTools(
  tools: ToolDefinition[]
): Array<Record<string, unknown>> {
  return tools.map(tool => ({
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
  buildBody: (
    messages: AIMessage[],
    config: AIConfig,
    options: StrategyOptions
  ) => ({
    model: config.model,
    messages: messages.map(msg => ({
      role: msg.role,
      content: convertContent(msg.content),
    })),
    tools: convertTools(getAllTools()),
    temperature: config.temperature ?? 1,
    max_tokens: config.maxTokens ?? 10000000,
    stream: options.stream,
  }),
  parseStreamChunk: (parsed: unknown): StreamChunkResult | undefined => {
    const parsedRecord = asRecord(parsed)
    const choices = Array.isArray(parsedRecord?.choices)
      ? parsedRecord.choices
      : []
    const firstChoice = asRecord(choices[0])
    const delta = asRecord(firstChoice?.delta)

    const content =
      typeof delta?.content === 'string' ? delta.content : undefined
    const rawToolCalls = Array.isArray(delta?.tool_calls)
      ? delta.tool_calls
      : undefined
    const toolCalls: StreamToolCallDelta[] | undefined = rawToolCalls?.map(
      call => {
        const callRecord = asRecord(call)
        const fnRecord = asRecord(callRecord?.function)
        return {
          index:
            typeof callRecord?.index === 'number'
              ? callRecord.index
              : undefined,
          id: typeof callRecord?.id === 'string' ? callRecord.id : undefined,
          function: {
            name: typeof fnRecord?.name === 'string' ? fnRecord.name : undefined,
            arguments:
              typeof fnRecord?.arguments === 'string'
                ? fnRecord.arguments
                : undefined,
          },
        }
      }
    )

    if (content) {
      return { content }
    }
    if (toolCalls) {
      return { toolCalls }
    }
    return undefined
  },
  parseResponse: (result: unknown) => {
    const resultRecord = asRecord(result)
    const choices = Array.isArray(resultRecord?.choices)
      ? resultRecord.choices
      : []
    const firstChoice = asRecord(choices[0])
    const message = asRecord(firstChoice?.message)
    return typeof message?.content === 'string' ? message.content : ''
  },
}

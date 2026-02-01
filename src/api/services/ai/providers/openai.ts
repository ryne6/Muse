import OpenAI from 'openai'
import { BaseAIProvider } from './base'
import type {
  AIMessage,
  AIConfig,
  AIStreamChunk,
  MessageContent,
  AIRequestOptions,
} from '../../../../shared/types/ai'
import { getAllTools } from '../tools/definitions'
import { ToolExecutor } from '../tools/executor'

export class OpenAIProvider extends BaseAIProvider {
  readonly name = 'openai'
  readonly supportsVision = true
  readonly supportsThinking = true
  readonly supportedModels = [
    'gpt-4-turbo-preview',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-4-32k',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
    'gpt-4o',
    'gpt-4o-mini',
    'o1',
    'o1-mini',
    'o1-preview',
    'o3',
    'o3-mini',
  ]

  /**
   * Check if model is a reasoning model (o1/o3 series)
   */
  private isReasoningModel(model: string): boolean {
    return /^o[13]/.test(model)
  }

  /**
   * Convert AIMessage content to OpenAI API format
   */
  private convertContent(content: string | MessageContent[]): any {
    if (typeof content === 'string') {
      return content
    }

    return content.map((block) => {
      if (block.type === 'text') {
        return { type: 'text', text: block.text }
      } else if (block.type === 'image') {
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

  async sendMessage(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void,
    options?: AIRequestOptions
  ): Promise<string> {
    if (!this.validateConfig(config)) {
      throw new Error('Invalid configuration')
    }

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    })

    try {
      if (onChunk) {
        return await this.streamResponseWithTools(client, messages, config, onChunk, options)
      } else {
        return await this.simpleResponseWithTools(client, messages, config, options)
      }
    } catch (error) {
      this.logError(error)
      throw error
    }
  }

  private async streamResponseWithTools(
    client: OpenAI,
    messages: AIMessage[],
    config: AIConfig,
    onChunk: (chunk: AIStreamChunk) => void,
    options?: AIRequestOptions
  ): Promise<string> {
    let fullContent = ''
    const toolExecutor = new ToolExecutor()
    const conversationMessages: OpenAI.ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role === 'system' ? 'system' : m.role,
      content: this.convertContent(m.content),
    } as OpenAI.ChatCompletionMessageParam))

    while (true) {
      const isReasoning = this.isReasoningModel(config.model)

      // Build request parameters
      const requestParams: any = {
        model: config.model,
        messages: conversationMessages,
        stream: true,
      }

      if (isReasoning && config.thinkingEnabled) {
        // o1/o3 models use reasoning_effort
        requestParams.reasoning_effort = 'medium'
        // o1/o3 don't support tools currently
      } else {
        requestParams.max_tokens = config.maxTokens || 10000000
        requestParams.temperature = config.temperature || 1
        requestParams.tools = this.convertTools(getAllTools())
      }

      const stream = await client.chat.completions.create(requestParams)

      let currentContent = ''
      const toolCalls: OpenAI.ChatCompletionMessageToolCall[] = []

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta

        if (delta?.content) {
          currentContent += delta.content
          fullContent += delta.content
          onChunk({ content: delta.content, done: false })
        }

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index
            if (index === undefined) continue

            if (!toolCalls[index]) {
              toolCalls[index] = {
                id: toolCall.id || '',
                type: 'function',
                function: {
                  name: toolCall.function?.name || '',
                  arguments: '',
                },
              }
            }

            if (toolCall.function?.arguments) {
              const existingToolCall = toolCalls[index]
              if (existingToolCall && existingToolCall.type === 'function') {
                existingToolCall.function.arguments += toolCall.function.arguments
              }
            }
          }
        }
      }

      // If no tools were called, we're done
      if (toolCalls.length === 0) {
        break
      }

      // Execute tools
      conversationMessages.push({
        role: 'assistant',
        content: currentContent || null,
        tool_calls: toolCalls,
      })

      for (const toolCall of toolCalls) {
        if (toolCall.type !== 'function') continue

        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)

        onChunk({
          content: `\n\n[Using tool: ${functionName}]\n`,
          done: false,
        })

        const result = await toolExecutor.execute(functionName, functionArgs, {
          toolCallId: toolCall.id,
          toolPermissions: options?.toolPermissions,
          allowOnceTools: options?.allowOnceTools,
        })

        conversationMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        })

        onChunk({
          content: `[Tool result: ${result.slice(0, 100)}...]\n\n`,
          done: false,
        })
      }
    }

    onChunk({ content: '', done: true })
    return fullContent
  }

  private async simpleResponseWithTools(
    client: OpenAI,
    messages: AIMessage[],
    config: AIConfig,
    options?: AIRequestOptions
  ): Promise<string> {
    const toolExecutor = new ToolExecutor()
    const conversationMessages: OpenAI.ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role === 'system' ? 'system' : m.role,
      content: this.convertContent(m.content),
    } as OpenAI.ChatCompletionMessageParam))

    let finalText = ''

    while (true) {
      const isReasoning = this.isReasoningModel(config.model)

      // Build request parameters
      const requestParams: any = {
        model: config.model,
        messages: conversationMessages,
      }

      if (isReasoning && config.thinkingEnabled) {
        requestParams.reasoning_effort = 'medium'
      } else {
        requestParams.max_tokens = config.maxTokens || 10000000
        requestParams.temperature = config.temperature || 1
        requestParams.tools = this.convertTools(getAllTools())
      }

      const response = await client.chat.completions.create(requestParams)

      const message = response.choices[0]?.message

      if (message?.content) {
        finalText += message.content
      }

      if (!message?.tool_calls || message.tool_calls.length === 0) {
        break
      }

      // Execute tools
      conversationMessages.push(message as any)

      for (const toolCall of message.tool_calls) {
        if (toolCall.type !== 'function') continue

        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)

        const result = await toolExecutor.execute(functionName, functionArgs, {
          toolCallId: toolCall.id,
          toolPermissions: options?.toolPermissions,
          allowOnceTools: options?.allowOnceTools,
        })

        conversationMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        })
      }
    }

    return finalText
  }

  private convertTools(tools: any[]): OpenAI.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }))
  }

  getDefaultModel(): string {
    return 'gpt-4-turbo-preview'
  }
}

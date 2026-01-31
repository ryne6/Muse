import Anthropic from '@anthropic-ai/sdk'
import { BaseAIProvider } from './base'
import type {
  AIMessage,
  AIConfig,
  AIStreamChunk,
  MessageContent,
  isMultimodalContent,
  AIRequestOptions,
} from '../../../../shared/types/ai'
import { fileSystemTools } from '../tools/definitions'
import { ToolExecutor } from '../tools/executor'

export class ClaudeProvider extends BaseAIProvider {
  readonly name = 'claude'
  readonly supportsVision = true
  readonly supportsThinking = true
  readonly supportedModels = [
    'claude-sonnet-4-20250514',
    'claude-opus-4-5-20251101',
    'claude-3-7-sonnet-20250219',
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ]

  /**
   * Convert AIMessage content to Claude API format
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

  async sendMessage(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void,
    options?: AIRequestOptions
  ): Promise<string> {
    if (!this.validateConfig(config)) {
      throw new Error('Invalid configuration')
    }

    const client = new Anthropic({
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
    client: Anthropic,
    messages: AIMessage[],
    config: AIConfig,
    onChunk: (chunk: AIStreamChunk) => void,
    options?: AIRequestOptions
  ): Promise<string> {
    let fullContent = ''
    const toolExecutor = new ToolExecutor()
    const conversationMessages: any[] = messages.map((m) => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: this.convertContent(m.content),
    }))

    while (true) {
      // Build request parameters
      const requestParams: any = {
        model: config.model,
        max_tokens: config.maxTokens || 10000000,
        messages: conversationMessages,
        tools: fileSystemTools,
        stream: true,
      }

      // Add thinking configuration if enabled
      if (config.thinkingEnabled) {
        requestParams.thinking = {
          type: 'enabled',
          budget_tokens: 10000,
        }
        // Temperature MUST be 1 when thinking is enabled
        requestParams.temperature = 1
      } else {
        requestParams.temperature = config.temperature || 1
      }

      const stream = await client.messages.create(requestParams)
      console.log('[Claude] Request with thinking:', config.thinkingEnabled, 'params:', JSON.stringify(requestParams.thinking))

      let currentContent = ''
      const toolUses: any[] = []

      for await (const chunk of stream) {
        console.log('[Claude] Chunk:', chunk.type, (chunk as any).delta?.type)
        if (chunk.type === 'content_block_start') {
          console.log('[Claude] Block start:', (chunk as any).content_block?.type)
          if (chunk.content_block.type === 'tool_use') {
            toolUses.push({
              id: chunk.content_block.id,
              name: chunk.content_block.name,
              input: {},
            })
          }
        } else if (chunk.type === 'content_block_delta') {
          if (chunk.delta.type === 'thinking_delta') {
            // Stream thinking content
            onChunk({ content: '', done: false, thinking: chunk.delta.thinking })
          } else if (chunk.delta.type === 'text_delta') {
            currentContent += chunk.delta.text
            fullContent += chunk.delta.text
            onChunk({ content: chunk.delta.text, done: false })
          } else if (chunk.delta.type === 'input_json_delta') {
            // Accumulate tool input
            const lastTool = toolUses[toolUses.length - 1]
            if (lastTool) {
              lastTool.inputJson = (lastTool.inputJson || '') + chunk.delta.partial_json
            }
          }
        } else if (chunk.type === 'message_stop') {
          // Parse tool inputs
          for (const tool of toolUses) {
            if (tool.inputJson) {
              try {
                tool.input = JSON.parse(tool.inputJson)
              } catch (e) {
                console.error('Failed to parse tool input:', e)
              }
            }
          }
        }
      }

      // If no tools were called, we're done
      if (toolUses.length === 0) {
        break
      }

      // Execute tools and continue conversation
      const toolResults: any[] = []
      for (const toolUse of toolUses) {
        // Send tool call info
        onChunk({
          content: '',
          done: false,
          toolCall: {
            id: toolUse.id,
            name: toolUse.name,
            input: toolUse.input,
          },
        })

        const result = await toolExecutor.execute(toolUse.name, toolUse.input, {
          toolCallId: toolUse.id,
          toolPermissions: options?.toolPermissions,
          allowOnceToolCallIds: options?.allowOnceToolCallIds,
        })
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        })

        // Send tool result info
        onChunk({
          content: '',
          done: false,
          toolResult: {
            toolCallId: toolUse.id,
            output: result,
            isError: false,
          },
        })
      }

      // Add assistant message with tool uses and user message with tool results
      conversationMessages.push({
        role: 'assistant',
        content: toolUses.map((t) => ({
          type: 'tool_use',
          id: t.id,
          name: t.name,
          input: t.input,
        })),
      })

      conversationMessages.push({
        role: 'user',
        content: toolResults,
      })
    }

    onChunk({ content: '', done: true })
    return fullContent
  }

  private async simpleResponseWithTools(
    client: Anthropic,
    messages: AIMessage[],
    config: AIConfig,
    options?: AIRequestOptions
  ): Promise<string> {
    const toolExecutor = new ToolExecutor()
    const conversationMessages: any[] = messages.map((m) => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: this.convertContent(m.content),
    }))

    let finalText = ''

    while (true) {
      // Build request parameters
      const requestParams: any = {
        model: config.model,
        max_tokens: config.maxTokens || 10000000,
        messages: conversationMessages,
        tools: fileSystemTools,
      }

      // Add thinking configuration if enabled
      if (config.thinkingEnabled) {
        requestParams.thinking = {
          type: 'enabled',
          budget_tokens: 10000,
        }
        requestParams.temperature = 1
      } else {
        requestParams.temperature = config.temperature || 1
      }

      const response = await client.messages.create(requestParams)

      // Extract text content
      const textContent = response.content.filter((block) => block.type === 'text')
      for (const block of textContent) {
        if (block.type === 'text') {
          finalText += block.text
        }
      }

      // Check for tool uses
      const toolUses = response.content.filter((block) => block.type === 'tool_use')

      if (toolUses.length === 0) {
        break
      }

      // Execute tools
      const toolResults: any[] = []
      for (const toolUse of toolUses) {
        if (toolUse.type === 'tool_use') {
          const result = await toolExecutor.execute(toolUse.name, toolUse.input, {
            toolCallId: toolUse.id,
            toolPermissions: options?.toolPermissions,
            allowOnceToolCallIds: options?.allowOnceToolCallIds,
          })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          })
        }
      }

      // Continue conversation
      conversationMessages.push({
        role: 'assistant',
        content: response.content,
      })

      conversationMessages.push({
        role: 'user',
        content: toolResults,
      })
    }

    return finalText
  }

  getDefaultModel(): string {
    return 'claude-3-5-sonnet-20241022'
  }
}

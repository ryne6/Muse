import { BaseAIProvider } from './base'
import type { AIMessage, AIConfig, AIStreamChunk } from '../../../../shared/types/ai'

// Helper function to get API endpoint based on format
function getEndpoint(apiFormat?: string): string {
  switch (apiFormat) {
    case 'responses':
      return '/responses'
    case 'anthropic-messages':
      return '/v1/messages'
    case 'chat-completions':
    default:
      return '/chat/completions'
  }
}

// Check if API format is Anthropic-style
function isAnthropicFormat(apiFormat?: string): boolean {
  return apiFormat === 'anthropic-messages'
}

// Generic OpenAI-compatible provider for Moonshot, OpenRouter, and custom APIs
export class GenericProvider extends BaseAIProvider {
  readonly name = 'generic'
  readonly supportedModels: string[] = []  // Dynamic models

  getDefaultModel(): string {
    return ''  // Must be specified in config
  }

  async sendMessage(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<string> {
    if (!config.baseURL) {
      throw new Error('Base URL is required for generic provider')
    }

    if (!config.apiKey || !config.model) {
      throw new Error('API Key and model are required')
    }

    try {
      if (onChunk) {
        return await this.streamResponse(messages, config, onChunk)
      } else {
        return await this.simpleResponse(messages, config)
      }
    } catch (error) {
      this.logError(error)
      throw error
    }
  }

  private async streamResponse(
    messages: AIMessage[],
    config: AIConfig,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<string> {
    const isAnthropic = isAnthropicFormat(config.apiFormat)

    // Build request body based on API format
    const requestBody = isAnthropic
      ? {
          model: config.model,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          max_tokens: config.maxTokens ?? 4096,
          stream: true,
        }
      : {
          model: config.model,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: config.temperature ?? 1,
          max_tokens: config.maxTokens ?? 4096,
          stream: true,
        }

    // Build headers based on API format
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (isAnthropic) {
      // Anthropic uses x-api-key header
      headers['x-api-key'] = config.apiKey
      headers['anthropic-version'] = '2023-06-01'
    } else {
      // OpenAI-compatible uses Bearer token
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    const response = await fetch(`${config.baseURL}${getEndpoint(config.apiFormat)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error: ${response.status} - ${error}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (!data || data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              let content: string | undefined

              if (isAnthropic) {
                // Anthropic format: {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "..."}}
                if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                  content = parsed.delta.text
                }
              } else {
                // OpenAI format: {"choices": [{"delta": {"content": "..."}}]}
                content = parsed.choices?.[0]?.delta?.content
              }

              if (content) {
                fullContent += content
                onChunk({
                  content,
                  done: false,
                })
              }
            } catch (e) {
              console.error('Failed to parse chunk:', e)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    onChunk({
      content: '',
      done: true,
    })

    return fullContent
  }

  private async simpleResponse(messages: AIMessage[], config: AIConfig): Promise<string> {
    const isAnthropic = isAnthropicFormat(config.apiFormat)

    // Build request body based on API format
    const requestBody = isAnthropic
      ? {
          model: config.model,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          max_tokens: config.maxTokens ?? 4096,
        }
      : {
          model: config.model,
          messages: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: config.temperature ?? 1,
          max_tokens: config.maxTokens ?? 4096,
        }

    // Build headers based on API format
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (isAnthropic) {
      headers['x-api-key'] = config.apiKey
      headers['anthropic-version'] = '2023-06-01'
    } else {
      headers['Authorization'] = `Bearer ${config.apiKey}`
    }

    const response = await fetch(`${config.baseURL}${getEndpoint(config.apiFormat)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error: ${response.status} - ${error}`)
    }

    const result = await response.json()

    // Parse response based on API format
    if (isAnthropic) {
      // Anthropic format: {"content": [{"type": "text", "text": "..."}]}
      const textBlock = result.content?.find((block: any) => block.type === 'text')
      return textBlock?.text || ''
    } else {
      // OpenAI format: {"choices": [{"message": {"content": "..."}}]}
      return result.choices[0]?.message?.content || ''
    }
  }

  validateConfig(config: AIConfig): boolean {
    return !!(config.apiKey && config.model && config.baseURL)
  }
}

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
    const requestBody = {
      model: config.model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: config.temperature ?? 1,
      max_tokens: config.maxTokens ?? 4096,
      stream: true,
    }

    const response = await fetch(`${config.baseURL}${getEndpoint(config.apiFormat)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
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
              const delta = parsed.choices?.[0]?.delta
              const content = delta?.content

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
    const requestBody = {
      model: config.model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: config.temperature ?? 1,
      max_tokens: config.maxTokens ?? 4096,
    }

    const response = await fetch(`${config.baseURL}${getEndpoint(config.apiFormat)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    return result.choices[0]?.message?.content || ''
  }

  validateConfig(config: AIConfig): boolean {
    return !!(config.apiKey && config.model && config.baseURL)
  }
}

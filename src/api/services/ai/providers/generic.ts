import { BaseAIProvider } from './base'
import type { AIMessage, AIConfig, AIStreamChunk } from '../../../../shared/types/ai'
import { getStrategy } from './strategies'

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
    // Warn if thinking is enabled but apiFormat doesn't support it
    if (config.thinkingEnabled && config.apiFormat !== 'anthropic-messages') {
      console.warn(
        '[generic-provider] Thinking is enabled but apiFormat is not "anthropic-messages". ' +
          'Thinking only works with Anthropic Messages API format. ' +
          `Current apiFormat: "${config.apiFormat || 'chat-completions'}"`
      )
    }

    const strategy = getStrategy(config.apiFormat)
    const requestBody = strategy.buildBody(messages, config, { stream: true })
    const headers = strategy.buildHeaders(config)

    const response = await fetch(`${config.baseURL}${strategy.getEndpoint(config)}`, {
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
              const result = strategy.parseStreamChunk(parsed)

              if (result?.content) {
                fullContent += result.content
                onChunk({
                  content: result.content,
                  done: false,
                })
              }
              if (result?.thinking) {
                console.log('[generic-provider] Sending thinking chunk:', result.thinking.slice(0, 50))
                onChunk({
                  content: '',
                  done: false,
                  thinking: result.thinking,
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
    const strategy = getStrategy(config.apiFormat)
    const requestBody = strategy.buildBody(messages, config, { stream: false })
    const headers = strategy.buildHeaders(config)

    const response = await fetch(`${config.baseURL}${strategy.getEndpoint(config)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API error: ${response.status} - ${error}`)
    }

    const result = await response.json()

    return strategy.parseResponse(result)
  }

  validateConfig(config: AIConfig): boolean {
    return !!(config.apiKey && config.model && config.baseURL)
  }
}

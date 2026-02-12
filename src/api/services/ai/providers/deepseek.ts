import { BaseAIProvider } from './base'
import type {
  AIMessage,
  AIConfig,
  AIStreamChunk,
} from '../../../../shared/types/ai'

export class DeepSeekProvider extends BaseAIProvider {
  readonly name = 'deepseek'
  readonly supportsThinking = true
  readonly supportedModels = [
    'deepseek-chat',
    'deepseek-coder',
    'deepseek-reasoner',
  ]

  /**
   * Check if model is a reasoning model
   */
  private isReasonerModel(model: string): boolean {
    return model === 'deepseek-reasoner'
  }

  getDefaultModel(): string {
    return 'deepseek-chat'
  }

  async sendMessage(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<string> {
    if (!this.validateConfig(config)) {
      throw new Error('Invalid configuration')
    }

    const baseURL = config.baseURL || 'https://api.deepseek.com/v1'

    try {
      if (onChunk) {
        return await this.streamResponse(messages, config, baseURL, onChunk)
      } else {
        return await this.simpleResponse(messages, config, baseURL)
      }
    } catch (error) {
      this.logError(error)
      throw error
    }
  }

  private async streamResponse(
    messages: AIMessage[],
    config: AIConfig,
    baseURL: string,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<string> {
    const requestBody = {
      model: config.model || this.getDefaultModel(),
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: config.temperature ?? 1,
      max_tokens: config.maxTokens ?? 10000000,
      stream: true,
    }

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`)
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
              const reasoningContent = delta?.reasoning_content

              // Handle reasoning content (deepseek-reasoner)
              if (reasoningContent) {
                onChunk({
                  content: '',
                  done: false,
                  thinking: reasoningContent,
                })
              }

              if (content) {
                fullContent += content
                onChunk({
                  content,
                  done: false,
                })
              }
            } catch (e) {
              console.error('Failed to parse DeepSeek chunk:', e)
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

  private async simpleResponse(
    messages: AIMessage[],
    config: AIConfig,
    baseURL: string
  ): Promise<string> {
    const requestBody = {
      model: config.model || this.getDefaultModel(),
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: config.temperature ?? 1,
      max_tokens: config.maxTokens ?? 10000000,
    }

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`DeepSeek API error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    return result.choices[0]?.message?.content || ''
  }
}

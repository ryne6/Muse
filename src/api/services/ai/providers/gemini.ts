import { BaseAIProvider } from './base'
import type {
  AIMessage,
  AIConfig,
  AIStreamChunk,
  MessageContent,
} from '../../../../shared/types/ai'

interface GeminiPart {
  text?: string
  inline_data?: {
    mime_type: string
    data: string
  }
}

interface GeminiMessage {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

interface GeminiStreamChunk {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>
      role: string
    }
    finishReason?: string
  }>
}

export class GeminiProvider extends BaseAIProvider {
  readonly name = 'gemini'
  readonly supportsVision = true
  readonly supportsThinking = true
  readonly supportedModels = [
    'gemini-pro',
    'gemini-pro-vision',
    'gemini-ultra',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-2.0-flash-thinking-exp',
  ]

  getDefaultModel(): string {
    return 'gemini-pro'
  }

  /**
   * Convert AIMessage content to Gemini API format
   */
  private convertContent(content: string | MessageContent[]): GeminiPart[] {
    if (typeof content === 'string') {
      return [{ text: content }]
    }

    return content.map(block => {
      if (block.type === 'text') {
        return { text: block.text }
      } else if (block.type === 'image') {
        return {
          inline_data: {
            mime_type: block.mimeType,
            data: block.data,
          },
        }
      }
      return { text: '' }
    })
  }

  async sendMessage(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<string> {
    if (!this.validateConfig(config)) {
      throw new Error('Invalid configuration')
    }

    const apiKey = config.apiKey
    const model = config.model || this.getDefaultModel()
    const baseURL =
      config.baseURL || 'https://generativelanguage.googleapis.com/v1beta'

    try {
      if (onChunk) {
        return await this.streamResponse(
          messages,
          config,
          baseURL,
          apiKey,
          model,
          onChunk
        )
      } else {
        return await this.simpleResponse(
          messages,
          config,
          baseURL,
          apiKey,
          model
        )
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
    apiKey: string,
    model: string,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<string> {
    const geminiMessages: GeminiMessage[] = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: this.convertContent(msg.content),
    }))

    const history = geminiMessages.slice(0, -1)
    const lastMessage = geminiMessages[geminiMessages.length - 1]

    const requestBody = {
      contents: [
        ...history.map(msg => ({
          role: msg.role,
          parts: msg.parts,
        })),
        {
          role: lastMessage.role,
          parts: lastMessage.parts,
        },
      ],
      generationConfig: {
        temperature: config.temperature ?? 1,
        maxOutputTokens: config.maxTokens ?? 10000000,
      },
    }

    const url = `${baseURL}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${error}`)
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
              const parsed: GeminiStreamChunk = JSON.parse(data)

              if (parsed.candidates && parsed.candidates[0]) {
                const candidate = parsed.candidates[0]
                const parts = candidate.content.parts || []

                for (const part of parts) {
                  // Handle thought content (thinking models)
                  if ((part as any).thought) {
                    onChunk({
                      content: '',
                      done: false,
                      thinking: (part as any).thought,
                    })
                  }

                  // Handle regular text content
                  if (part.text) {
                    fullContent += part.text
                    onChunk({
                      content: part.text,
                      done: false,
                    })
                  }
                }
              }
            } catch (e) {
              console.error('Failed to parse Gemini chunk:', e)
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
    baseURL: string,
    apiKey: string,
    model: string
  ): Promise<string> {
    const geminiMessages: GeminiMessage[] = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: this.convertContent(msg.content),
    }))

    const requestBody = {
      contents: geminiMessages.map(msg => ({
        role: msg.role,
        parts: msg.parts,
      })),
      generationConfig: {
        temperature: config.temperature ?? 1,
        maxOutputTokens: config.maxTokens ?? 10000000,
      },
    }

    const url = `${baseURL}/models/${model}:generateContent?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gemini API error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    return result.candidates[0]?.content?.parts[0]?.text || ''
  }

  validateConfig(config: AIConfig): boolean {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return false
    }
    // Gemini doesn't strictly require model validation as it has dynamic models
    return true
  }
}

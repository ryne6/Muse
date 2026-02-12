import { AIManager } from '../ai/manager'
import type { AIMessage, AIConfig } from '../../../shared/types/ai'
import { getTextContent } from '../../../shared/types/ai'

export interface ExtractedMemory {
  category: 'preference' | 'knowledge' | 'decision' | 'pattern'
  content: string
  tags: string[]
}

const EXTRACTION_SYSTEM_PROMPT = `分析以下对话，提取值得记住的信息。只提取明确的事实，不要推测。

分类：
- preference: 用户明确表达的偏好（如"我喜欢用 pnpm"）
- knowledge: 项目相关的事实（如"项目使用 Electron + React"）
- decision: 技术决策（如"选择 Zustand 而非 Redux"）
- pattern: 重复出现的模式（如"每次都要求写测试"）

输出 JSON 数组，每项包含 category、content、tags。
如果没有值得记住的信息，返回空数组 []。`

const MAX_CONVERSATION_CHARS = 8000

export class MemoryExtractor {
  private static aiManager = new AIManager()

  /**
   * 分析对话消息，提取值得记住的信息
   * @param messages 最近的对话消息（取最近 10 条）
   * @param providerType 当前 AI provider 类型
   * @param config AI 配置（apiKey, model 等）
   * @returns 提取的记忆数组，空数组表示无值得记住的信息
   */
  static async extract(
    messages: AIMessage[],
    providerType: string,
    config: AIConfig
  ): Promise<ExtractedMemory[]> {
    // Take last 10 messages (user + assistant only)
    const recentMessages = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)

    if (recentMessages.length === 0) {
      return []
    }

    // Format messages into conversation text
    let conversationText = recentMessages
      .map((m) => {
        const role = m.role === 'user' ? 'User' : 'Assistant'
        const text = getTextContent(m.content)
        return `${role}: ${text}`
      })
      .join('\n\n')

    // Truncate to limit token usage — keep most recent content
    if (conversationText.length > MAX_CONVERSATION_CHARS) {
      conversationText = conversationText.slice(-MAX_CONVERSATION_CHARS)
    }

    // Build extraction request
    const extractionMessages: AIMessage[] = [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: conversationText },
    ]

    // Use low temperature to reduce hallucination
    const extractionConfig: AIConfig = {
      ...config,
      temperature: 0.1,
    }

    try {
      // Non-streaming call (no onChunk callback)
      const response = await this.aiManager.sendMessage(
        providerType,
        extractionMessages,
        extractionConfig
      )

      return this.parseResponse(response)
    } catch (error) {
      console.error('MemoryExtractor: Failed to extract memories:', error)
      return []
    }
  }

  /**
   * Parse AI response into ExtractedMemory array.
   * Returns empty array if response is not valid JSON.
   */
  private static parseResponse(response: string): ExtractedMemory[] {
    try {
      // Try to extract JSON array from response (may be wrapped in markdown code block)
      let jsonStr = response.trim()

      // Strip markdown code fences if present
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim()
      }

      const parsed = JSON.parse(jsonStr)

      if (!Array.isArray(parsed)) {
        return []
      }

      // Validate and filter each item
      return parsed.filter(
        (item): item is ExtractedMemory =>
          item &&
          typeof item.content === 'string' &&
          typeof item.category === 'string' &&
          ['preference', 'knowledge', 'decision', 'pattern'].includes(item.category) &&
          Array.isArray(item.tags) &&
          item.tags.every((t: unknown) => typeof t === 'string')
      )
    } catch {
      console.warn('MemoryExtractor: Failed to parse AI response as JSON')
      return []
    }
  }
}

import type {
  AIProvider,
  AIMessage,
  AIConfig,
  AIStreamChunk,
} from '../../../../shared/types/ai'

/**
 * Vision model patterns for different providers
 */
const VISION_MODEL_PATTERNS: Record<string, RegExp[]> = {
  claude: [/claude-3/i],
  openai: [/gpt-4.*vision/i, /gpt-4o/i, /gpt-4-turbo/i],
  gemini: [/gemini.*vision/i, /gemini-1\.5/i, /gemini-pro-vision/i],
}

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string
  abstract readonly supportedModels: string[]

  /**
   * Whether this provider supports vision/multimodal
   */
  readonly supportsVision: boolean = false

  /**
   * Whether this provider supports extended thinking/reasoning
   */
  readonly supportsThinking: boolean = false

  abstract sendMessage(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<string>

  abstract getDefaultModel(): string

  validateConfig(config: AIConfig): boolean {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return false
    }
    if (!config.model || !this.supportedModels.includes(config.model)) {
      return false
    }
    return true
  }

  /**
   * Check if a specific model supports vision
   */
  isVisionModel(model: string): boolean {
    const patterns = VISION_MODEL_PATTERNS[this.name] || []
    return patterns.some(pattern => pattern.test(model))
  }

  protected logError(error: unknown): void {
    console.error(`[${this.name}] Error:`, error)
  }
}

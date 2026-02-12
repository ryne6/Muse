import { AIProviderFactory } from './factory'
import type { AIConfig } from '../../../shared/types/ai'

export class ProviderValidator {
  /**
   * 验证 Provider 配置是否有效
   * 发送一个简单的测试消息来验证 API Key 和配置
   */
  static async validateProvider(
    providerType: string,
    config: AIConfig
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const provider = AIProviderFactory.getProvider(providerType)

      // 首先验证配置格式
      if (!provider.validateConfig(config)) {
        return {
          valid: false,
          error:
            'Invalid configuration. Please check API key and other settings.',
        }
      }

      // 发送测试消息
      const testMessages = [
        {
          role: 'user' as const,
          content: 'Hi',
        },
      ]

      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      })

      const responsePromise = provider.sendMessage(testMessages, config)

      const response = await Promise.race([responsePromise, timeoutPromise])

      // 如果收到响应且不为空，则验证成功
      if (response && response.length > 0) {
        return { valid: true }
      } else {
        return {
          valid: false,
          error: 'Received empty response from provider',
        }
      }
    } catch (error) {
      // 解析错误类型
      let errorMessage = 'Unknown error'

      if (error instanceof Error) {
        errorMessage = error.message

        // 常见错误类型
        if (
          errorMessage.includes('401') ||
          errorMessage.includes('Unauthorized')
        ) {
          errorMessage = 'Invalid API key'
        } else if (
          errorMessage.includes('403') ||
          errorMessage.includes('Forbidden')
        ) {
          errorMessage = 'API key does not have required permissions'
        } else if (errorMessage.includes('429')) {
          errorMessage = 'Rate limit exceeded. Please try again later.'
        } else if (errorMessage.includes('timeout')) {
          errorMessage =
            'Request timeout. Please check your network connection.'
        } else if (
          errorMessage.includes('fetch failed') ||
          errorMessage.includes('ENOTFOUND')
        ) {
          errorMessage = 'Network error. Please check your internet connection.'
        }
      }

      return {
        valid: false,
        error: errorMessage,
      }
    }
  }

  /**
   * 获取 Provider 支持的模型列表（如果Provider支持动态获取）
   */
  static async getAvailableModels(providerType: string): Promise<string[]> {
    try {
      const provider = AIProviderFactory.getProvider(providerType)

      // 对于有预定义模型的Provider，直接返回
      if (provider.supportedModels.length > 0) {
        return provider.supportedModels
      }

      // 对于Generic Provider，返回空数组（需要用户手动配置）
      return []
    } catch (error) {
      console.error('Failed to get available models:', error)
      return []
    }
  }
}

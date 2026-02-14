import { vi } from 'vitest'
import type { AIMessage, AIConfig, AIStreamChunk } from '~shared/types/ai'

/**
 * Mock AI Provider 响应
 */

export const mockAIResponse = {
  content: 'This is a mocked AI response for testing.',
  role: 'assistant' as const,
  model: 'test-model'
}

export const mockAIStreamChunks: AIStreamChunk[] = [
  { type: 'content', content: 'This ' },
  { type: 'content', content: 'is ' },
  { type: 'content', content: 'a ' },
  { type: 'content', content: 'test.' },
  { type: 'done', done: true }
]

export const mockToolUseChunk: AIStreamChunk = {
  type: 'tool_use',
  toolUse: {
    id: 'tool_test_123',
    name: 'read_file',
    input: { path: '~main/test/file.txt' }
  }
}

/**
 * Mock AI Provider 类
 */
export class MockAIProvider {
  async sendMessage(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<string> {
    if (onChunk) {
      // 模拟流式响应
      for (const chunk of mockAIStreamChunks) {
        onChunk(chunk)
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      return mockAIResponse.content
    } else {
      // 非流式响应
      return mockAIResponse.content
    }
  }

  getDefaultModel(): string {
    return 'test-model'
  }

  getSupportedModels(): string[] {
    return ['test-model-1', 'test-model-2', 'test-model-3']
  }
}

/**
 * Mock AI Provider Factory
 */
export const mockAIProviderFactory = {
  getProvider: vi.fn(() => new MockAIProvider()),
  getAvailableProviders: vi.fn(() => ['claude', 'openai', 'gemini', 'deepseek'])
}

/**
 * Mock AI Manager
 */
export const mockAIManager = {
  sendMessage: vi.fn(async (
    providerType: string,
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void
  ) => {
    const provider = new MockAIProvider()
    return provider.sendMessage(messages, config, onChunk)
  }),
  getDefaultModel: vi.fn((providerType: string) => 'test-model'),
  getSupportedModels: vi.fn((providerType: string) => ['test-model-1', 'test-model-2']),
  getAvailableProviders: vi.fn(() => ['claude', 'openai', 'gemini', 'deepseek'])
}

import type { NewProvider } from '@main/db/schema'

/**
 * Provider 测试数据 fixtures
 */

export const mockClaudeProvider: Omit<NewProvider, 'id' | 'createdAt'> = {
  name: 'Test Claude',
  type: 'claude',
  apiKey: 'sk-ant-test-key-123456',
  baseURL: null,
  apiFormat: 'chat-completions',
  enabled: true
}

export const mockOpenAIProvider: Omit<NewProvider, 'id' | 'createdAt'> = {
  name: 'Test OpenAI',
  type: 'openai',
  apiKey: 'sk-test-key-123456',
  baseURL: null,
  apiFormat: 'chat-completions',
  enabled: true
}

export const mockGeminiProvider: Omit<NewProvider, 'id' | 'createdAt'> = {
  name: 'Test Gemini',
  type: 'gemini',
  apiKey: 'test-gemini-key-123456',
  baseURL: null,
  apiFormat: 'chat-completions',
  enabled: true
}

export const mockDeepSeekProvider: Omit<NewProvider, 'id' | 'createdAt'> = {
  name: 'Test DeepSeek',
  type: 'deepseek',
  apiKey: 'sk-test-deepseek-key-123456',
  baseURL: null,
  apiFormat: 'chat-completions',
  enabled: true
}

export const mockDisabledProvider: Omit<NewProvider, 'id' | 'createdAt'> = {
  name: 'Test Disabled Provider',
  type: 'openai',
  apiKey: 'sk-test-disabled-key',
  baseURL: null,
  apiFormat: 'chat-completions',
  enabled: false
}

export const mockCustomProvider: Omit<NewProvider, 'id' | 'createdAt'> = {
  name: 'Test Custom Provider',
  type: 'custom',
  apiKey: 'custom-api-key-123',
  baseURL: 'https://custom-api.example.com',
  apiFormat: 'chat-completions',
  enabled: true
}

export const mockProviders = [
  mockClaudeProvider,
  mockOpenAIProvider,
  mockGeminiProvider,
  mockDeepSeekProvider
]

import type { NewModel } from '@main/db/schema'

/**
 * Model 测试数据 fixtures
 */

export const mockClaudeModel: Omit<NewModel, 'id'> = {
  providerId: 'provider-claude',
  name: 'claude-3-5-sonnet-20241022',
  displayName: 'Claude 3.5 Sonnet',
  contextLength: 200000,
  enabled: true,
  isCustom: false
}

export const mockOpenAIModel: Omit<NewModel, 'id'> = {
  providerId: 'provider-openai',
  name: 'gpt-4-turbo',
  displayName: 'GPT-4 Turbo',
  contextLength: 128000,
  enabled: true,
  isCustom: false
}

export const mockGeminiModel: Omit<NewModel, 'id'> = {
  providerId: 'provider-gemini',
  name: 'gemini-pro',
  displayName: 'Gemini Pro',
  contextLength: 32000,
  enabled: true,
  isCustom: false
}

export const mockDisabledModel: Omit<NewModel, 'id'> = {
  providerId: 'provider-openai',
  name: 'gpt-3.5-turbo',
  displayName: 'GPT-3.5 Turbo',
  contextLength: 16000,
  enabled: false,
  isCustom: false
}

export const mockCustomModel: Omit<NewModel, 'id'> = {
  providerId: 'provider-custom',
  name: 'custom-model-v1',
  displayName: 'Custom Model v1',
  contextLength: 8000,
  enabled: true,
  isCustom: true
}

export const mockModels = [
  mockClaudeModel,
  mockOpenAIModel,
  mockGeminiModel
]

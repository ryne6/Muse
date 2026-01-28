export type ProviderType = 'claude' | 'openai' | 'custom'

export interface ModelConfig {
  id: string
  name: string
  contextLength?: number
  isCustom?: boolean
}

export interface ProviderConfig {
  type: ProviderType
  apiKey: string
  model: string
  models?: ModelConfig[]
  baseURL?: string
  temperature?: number
  maxTokens?: number
}

export interface AppConfig {
  currentProvider: string
  providers: Record<string, ProviderConfig>
}

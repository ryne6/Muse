// Database types - shared between main and renderer processes
// These types are inferred from the Drizzle schema in src/main/db/schema.ts

export interface Provider {
  id: string
  name: string
  type: string
  apiKey: string // Decrypted when retrieved from DB
  baseURL: string | null
  apiFormat?: string
  enabled: boolean
  createdAt: Date
}

export interface Model {
  id: string
  providerId: string
  modelId: string
  name: string
  description: string | null
  enabled: boolean
  createdAt: Date
  contextLength?: number
}

export interface Conversation {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  model: string | null
  provider: string | null
}

export interface ToolCall {
  id: string
  messageId: string
  name: string
  arguments: string // JSON string
  timestamp: number
}

export interface ToolResult {
  id: string
  toolCallId: string
  result: string // JSON string
  timestamp: number
}

export interface Setting {
  key: string
  value: string // JSON string
  updatedAt: Date
}

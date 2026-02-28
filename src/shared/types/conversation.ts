import type { AttachmentPreview } from './attachment'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  attachments?: AttachmentPreview[]
  thinking?: string
  inputTokens?: number
  outputTokens?: number
  durationMs?: number
  compressed?: boolean
  summaryOf?: string[] // 被压缩的消息 ID 列表（DB 存 JSON string，前端解析后为数组）
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, any>
}

export interface ToolResult {
  toolCallId: string
  output: string
  isError?: boolean
}

export interface Conversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: Message[]
  provider?: string
  model?: string
  contextFiles?: string[]
  workspace?: string | null
  systemPrompt?: string | null
}

export interface ConversationGroup {
  label: string
  conversations: Conversation[]
}

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

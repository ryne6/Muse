import type { NewMessage, NewToolCall, NewToolResult } from '~main/db/schema'

/**
 * Message 测试数据 fixtures
 */

export const mockUserMessage: Omit<NewMessage, 'id' | 'createdAt'> = {
  conversationId: 'conversation-1',
  role: 'user',
  content: 'Hello, this is a test message.'
}

export const mockAssistantMessage: Omit<NewMessage, 'id' | 'createdAt'> = {
  conversationId: 'conversation-1',
  role: 'assistant',
  content: 'Hello! I am an AI assistant. How can I help you today?'
}

export const mockSystemMessage: Omit<NewMessage, 'id' | 'createdAt'> = {
  conversationId: 'conversation-1',
  role: 'system',
  content: 'You are a helpful AI assistant.'
}

export const mockMessages = [
  mockUserMessage,
  mockAssistantMessage
]

/**
 * Tool Call 测试数据 fixtures
 */

export const mockToolCall: Omit<NewToolCall, 'id' | 'createdAt'> = {
  messageId: 'message-1',
  toolName: 'read_file',
  toolInput: JSON.stringify({ path: '~main/test/file.txt' })
}

export const mockToolResult: Omit<NewToolResult, 'id' | 'createdAt'> = {
  toolCallId: 'tool-call-1',
  content: 'File content here',
  isError: false
}

export const mockToolResultError: Omit<NewToolResult, 'id' | 'createdAt'> = {
  toolCallId: 'tool-call-2',
  content: 'Error: File not found',
  isError: true
}

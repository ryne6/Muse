import { eq, and } from 'drizzle-orm'
import { getDatabase, schema } from '../index'
import type { NewMessage, NewToolCall, NewToolResult } from '../schema'
import { generateId } from '../utils/idGenerator'

const { messages, toolCalls, toolResults } = schema

export class MessageService {
  // Get messages by conversation ID
  static async getByConversationId(conversationId: string) {
    const db = getDatabase()
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp)
  }

  // Get message with tool calls and results
  static async getWithTools(messageId: string) {
    const db = getDatabase()

    const message = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1)

    if (!message[0]) return null

    const calls = await db.select().from(toolCalls).where(eq(toolCalls.messageId, messageId))

    const results = await db
      .select()
      .from(toolResults)
      .where(
        eq(
          toolResults.toolCallId,
          calls.map((c) => c.id)[0] || ''
        )
      )

    return {
      ...message[0],
      toolCalls: calls,
      toolResults: results,
    }
  }

  // Create message
  static async create(data: Omit<NewMessage, 'id'> & { id?: string }) {
    const db = getDatabase()

    const newMessage: NewMessage = {
      id: data.id || generateId(),
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      thinking: data.thinking,
      timestamp: data.timestamp,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      durationMs: data.durationMs,
    }

    await db.insert(messages).values(newMessage)
    return newMessage
  }

  // Update message content
  static async updateContent(id: string, content: string) {
    const db = getDatabase()
    await db.update(messages).set({ content }).where(eq(messages.id, id))
  }

  // Add tool call to message
  static async addToolCall(messageId: string, data: Omit<NewToolCall, 'id' | 'messageId'>) {
    const db = getDatabase()

    const newToolCall: NewToolCall = {
      id: generateId(),
      messageId,
      name: data.name,
      input: data.input,
    }

    await db.insert(toolCalls).values(newToolCall)
    return newToolCall
  }

  // Add tool result
  static async addToolResult(toolCallId: string, data: Omit<NewToolResult, 'id' | 'toolCallId'>) {
    const db = getDatabase()

    const newToolResult: NewToolResult = {
      id: generateId(),
      toolCallId,
      output: data.output,
      isError: data.isError || false,
    }

    await db.insert(toolResults).values(newToolResult)
    return newToolResult
  }

  // Delete message (cascade deletes tool calls and results)
  static async delete(id: string) {
    const db = getDatabase()
    await db.delete(messages).where(eq(messages.id, id))
  }

  // Get all messages with their tool calls and results
  static async getAllWithTools(conversationId: string) {
    const db = getDatabase()

    const conversationMessages = await this.getByConversationId(conversationId)

    const messagesWithTools = await Promise.all(
      conversationMessages.map(async (message) => {
        const calls = await db
          .select()
          .from(toolCalls)
          .where(eq(toolCalls.messageId, message.id))

        const callIds = calls.map((c) => c.id)
        const results =
          callIds.length > 0
            ? await db
                .select()
                .from(toolResults)
                .where(
                  and(
                    ...callIds.map((id) => eq(toolResults.toolCallId, id))
                  )
                )
            : []

        return {
          ...message,
          toolCalls: calls,
          toolResults: results,
        }
      })
    )

    return messagesWithTools
  }
}

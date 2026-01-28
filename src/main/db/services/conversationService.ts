import { eq, desc } from 'drizzle-orm'
import { getDatabase, schema } from '../index'
import type { NewConversation } from '../schema'
import { generateId } from '../utils/idGenerator'

const { conversations, messages } = schema

export class ConversationService {
  // Get all conversations
  static async getAll() {
    const db = getDatabase()
    return db.select().from(conversations).orderBy(desc(conversations.updatedAt))
  }

  // Get conversation by ID
  static async getById(id: string) {
    const db = getDatabase()
    const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1)
    return result[0] || null
  }

  // Get conversation with messages
  static async getWithMessages(id: string) {
    const db = getDatabase()

    const conversation = await this.getById(id)
    if (!conversation) return null

    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.timestamp)

    return {
      ...conversation,
      messages: conversationMessages,
    }
  }

  // Create new conversation
  static async create(data: Partial<NewConversation> & { id?: string }) {
    const db = getDatabase()

    const newConversation: NewConversation = {
      id: data.id || generateId(),
      title: data.title || 'New Conversation',
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
      provider: data.provider || null,
      model: data.model || null,
    }

    await db.insert(conversations).values(newConversation)
    return newConversation
  }

  // Update conversation
  static async update(id: string, data: Partial<NewConversation>) {
    const db = getDatabase()

    await db
      .update(conversations)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, id))

    return this.getById(id)
  }

  // Delete conversation (cascade deletes messages)
  static async delete(id: string) {
    const db = getDatabase()
    await db.delete(conversations).where(eq(conversations.id, id))
  }

  // Update conversation title
  static async updateTitle(id: string, title: string) {
    return this.update(id, { title })
  }

  // Update last used provider/model
  static async updateProviderModel(id: string, provider: string, model: string) {
    return this.update(id, { provider, model })
  }
}

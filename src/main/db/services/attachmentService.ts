import { eq } from 'drizzle-orm'
import { getDatabase, schema } from '../index'
import type { NewAttachment } from '../schema'
import { generateId } from '../utils/idGenerator'

const { attachments, messages } = schema

export class AttachmentService {
  /**
   * Create a new attachment
   */
  static async create(data: Omit<NewAttachment, 'id' | 'createdAt'> & { id?: string }) {
    const db = getDatabase()

    const newAttachment: NewAttachment = {
      id: data.id || generateId(),
      messageId: data.messageId,
      filename: data.filename,
      mimeType: data.mimeType,
      data: data.data,
      note: data.note || null,
      size: data.size,
      width: data.width || null,
      height: data.height || null,
    }

    await db.insert(attachments).values(newAttachment)
    return newAttachment
  }

  /**
   * Get all attachments for a message (with BLOB data)
   */
  static async getByMessageId(messageId: string) {
    const db = getDatabase()
    return db
      .select()
      .from(attachments)
      .where(eq(attachments.messageId, messageId))
      .orderBy(attachments.createdAt)
  }

  /**
   * Get a single attachment by ID (with BLOB data)
   */
  static async getById(id: string) {
    const db = getDatabase()
    const result = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, id))
      .limit(1)
    return result[0] || null
  }

  /**
   * Get attachment previews for a message (without BLOB data)
   */
  static async getPreviewsByMessageId(messageId: string) {
    const db = getDatabase()
    return db
      .select({
        id: attachments.id,
        messageId: attachments.messageId,
        filename: attachments.filename,
        mimeType: attachments.mimeType,
        note: attachments.note,
        size: attachments.size,
        width: attachments.width,
        height: attachments.height,
        createdAt: attachments.createdAt,
      })
      .from(attachments)
      .where(eq(attachments.messageId, messageId))
      .orderBy(attachments.createdAt)
  }

  /**
   * Update attachment note
   */
  static async updateNote(id: string, note: string | null) {
    const db = getDatabase()
    await db
      .update(attachments)
      .set({ note })
      .where(eq(attachments.id, id))
  }

  /**
   * Delete an attachment
   */
  static async delete(id: string) {
    const db = getDatabase()
    await db.delete(attachments).where(eq(attachments.id, id))
  }

  /**
   * Delete all attachments for a message
   */
  static async deleteByMessageId(messageId: string) {
    const db = getDatabase()
    await db.delete(attachments).where(eq(attachments.messageId, messageId))
  }

  /**
   * Get attachment data as base64
   */
  static async getBase64(id: string): Promise<string | null> {
    const attachment = await this.getById(id)
    if (!attachment || !attachment.data) return null
    return Buffer.from(attachment.data).toString('base64')
  }
}

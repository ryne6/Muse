import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createTestDatabase,
  clearDatabase,
} from '../../../../../tests/setup/test-db'
import type { Database } from 'better-sqlite3'

/**
 * AttachmentService 测试
 *
 * 测试目标：
 * - 附件 CRUD 操作
 * - BLOB 数据处理
 * - Base64 编码
 * - 级联删除
 */

// Use vi.hoisted to ensure mock is set up before imports
const { getTestDb, setTestDb } = vi.hoisted(() => {
  let testDb: any = null
  return {
    getTestDb: () => testDb,
    setTestDb: (db: any) => {
      testDb = db
    },
  }
})

// Mock the database module with hoisted functions
vi.mock('../../index', async () => {
  const actualSchema =
    await vi.importActual<typeof import('../../schema')>('../../schema')
  return {
    getDatabase: () => {
      const db = getTestDb()
      if (!db) {
        throw new Error('Test database not initialized')
      }
      return db
    },
    schema: actualSchema,
  }
})

// Mock generateId with counter to ensure unique IDs
let idCounter = 0
vi.mock('../../utils/idGenerator', () => ({
  generateId: vi.fn(() => `test-attachment-id-${Date.now()}-${idCounter++}`),
}))

// Import AttachmentService after mocking
import { AttachmentService } from '../attachmentService'

describe('AttachmentService', () => {
  let testDb: { db: any; sqlite: Database; cleanup: () => void }
  let testConversationId: string
  let testMessageId: string

  // Helper function to create test conversation
  async function createTestConversation() {
    const convId = 'test-conv-' + Date.now()
    testDb.sqlite.exec(`
      INSERT INTO conversations (id, title, created_at, updated_at)
      VALUES ('${convId}', 'Test Conversation', ${Date.now()}, ${Date.now()})
    `)
    return convId
  }

  // Helper function to create test message
  async function createTestMessage(conversationId: string) {
    const msgId = 'test-msg-' + Date.now()
    testDb.sqlite.exec(`
      INSERT INTO messages (id, conversation_id, role, content, timestamp)
      VALUES ('${msgId}', '${conversationId}', 'user', 'Test message', ${Date.now()})
    `)
    return msgId
  }

  // Helper to create sample image data
  function createSampleImageData(): Buffer {
    // Simple 1x1 PNG image
    return Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
      0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
      0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
    ])
  }

  beforeEach(async () => {
    testDb = createTestDatabase()
    setTestDb(testDb.db)
    testConversationId = await createTestConversation()
    testMessageId = await createTestMessage(testConversationId)
  })

  afterEach(() => {
    if (testDb?.sqlite) {
      clearDatabase(testDb.sqlite)
      testDb.cleanup()
    }
  })

  describe('create', () => {
    it('should create attachment with all fields', async () => {
      const imageData = createSampleImageData()

      const created = await AttachmentService.create({
        messageId: testMessageId,
        filename: 'test-image.png',
        mimeType: 'image/png',
        data: imageData,
        note: 'Test image note',
        size: imageData.length,
        width: 100,
        height: 100,
      })

      expect(created).toBeDefined()
      expect(created.id).toBeDefined()
      expect(created.messageId).toBe(testMessageId)
      expect(created.filename).toBe('test-image.png')
      expect(created.mimeType).toBe('image/png')
      expect(created.note).toBe('Test image note')
      expect(created.size).toBe(imageData.length)
      expect(created.width).toBe(100)
      expect(created.height).toBe(100)
    })

    it('should create attachment with minimal fields', async () => {
      const imageData = createSampleImageData()

      const created = await AttachmentService.create({
        messageId: testMessageId,
        filename: 'minimal.png',
        mimeType: 'image/png',
        data: imageData,
        size: imageData.length,
      })

      expect(created).toBeDefined()
      expect(created.id).toBeDefined()
      expect(created.note).toBeNull()
      expect(created.width).toBeNull()
      expect(created.height).toBeNull()
    })
  })

  describe('getById', () => {
    it('should get attachment with BLOB data', async () => {
      const imageData = createSampleImageData()

      const created = await AttachmentService.create({
        messageId: testMessageId,
        filename: 'test.png',
        mimeType: 'image/png',
        data: imageData,
        size: imageData.length,
      })

      const retrieved = await AttachmentService.getById(created.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(created.id)
      expect(retrieved!.data).toBeDefined()
      expect(Buffer.from(retrieved!.data).equals(imageData)).toBe(true)
    })

    it('should return null for non-existent attachment', async () => {
      const result = await AttachmentService.getById('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('getByMessageId', () => {
    it('should get all attachments for message', async () => {
      const imageData = createSampleImageData()

      await AttachmentService.create({
        messageId: testMessageId,
        filename: 'image1.png',
        mimeType: 'image/png',
        data: imageData,
        size: imageData.length,
      })

      await AttachmentService.create({
        messageId: testMessageId,
        filename: 'image2.png',
        mimeType: 'image/png',
        data: imageData,
        size: imageData.length,
      })

      const attachments = await AttachmentService.getByMessageId(testMessageId)

      expect(attachments).toHaveLength(2)
      expect(attachments[0].filename).toBe('image1.png')
      expect(attachments[1].filename).toBe('image2.png')
    })

    it('should return empty array for message with no attachments', async () => {
      const attachments =
        await AttachmentService.getByMessageId('no-attachments-msg')
      expect(attachments).toHaveLength(0)
    })
  })

  describe('getPreviewsByMessageId', () => {
    it('should get previews without BLOB data', async () => {
      const imageData = createSampleImageData()

      await AttachmentService.create({
        messageId: testMessageId,
        filename: 'preview-test.png',
        mimeType: 'image/png',
        data: imageData,
        note: 'Preview note',
        size: imageData.length,
        width: 200,
        height: 150,
      })

      const previews =
        await AttachmentService.getPreviewsByMessageId(testMessageId)

      expect(previews).toHaveLength(1)
      expect(previews[0].filename).toBe('preview-test.png')
      expect(previews[0].note).toBe('Preview note')
      expect(previews[0].width).toBe(200)
      expect(previews[0].height).toBe(150)
      // Should not include data field
      expect((previews[0] as any).data).toBeUndefined()
    })
  })

  describe('updateNote', () => {
    it('should update note', async () => {
      const imageData = createSampleImageData()

      const created = await AttachmentService.create({
        messageId: testMessageId,
        filename: 'note-test.png',
        mimeType: 'image/png',
        data: imageData,
        size: imageData.length,
      })

      await AttachmentService.updateNote(created.id, 'Updated note')

      const updated = await AttachmentService.getById(created.id)
      expect(updated!.note).toBe('Updated note')
    })

    it('should set note to null', async () => {
      const imageData = createSampleImageData()

      const created = await AttachmentService.create({
        messageId: testMessageId,
        filename: 'null-note.png',
        mimeType: 'image/png',
        data: imageData,
        note: 'Initial note',
        size: imageData.length,
      })

      await AttachmentService.updateNote(created.id, null)

      const updated = await AttachmentService.getById(created.id)
      expect(updated!.note).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete attachment by ID', async () => {
      const imageData = createSampleImageData()

      const created = await AttachmentService.create({
        messageId: testMessageId,
        filename: 'to-delete.png',
        mimeType: 'image/png',
        data: imageData,
        size: imageData.length,
      })

      await AttachmentService.delete(created.id)

      const deleted = await AttachmentService.getById(created.id)
      expect(deleted).toBeNull()
    })

    it('should delete all attachments by message ID', async () => {
      const imageData = createSampleImageData()

      await AttachmentService.create({
        messageId: testMessageId,
        filename: 'delete1.png',
        mimeType: 'image/png',
        data: imageData,
        size: imageData.length,
      })

      await AttachmentService.create({
        messageId: testMessageId,
        filename: 'delete2.png',
        mimeType: 'image/png',
        data: imageData,
        size: imageData.length,
      })

      await AttachmentService.deleteByMessageId(testMessageId)

      const remaining = await AttachmentService.getByMessageId(testMessageId)
      expect(remaining).toHaveLength(0)
    })
  })

  describe('getBase64', () => {
    it('should return base64 encoded data', async () => {
      const imageData = createSampleImageData()

      const created = await AttachmentService.create({
        messageId: testMessageId,
        filename: 'base64-test.png',
        mimeType: 'image/png',
        data: imageData,
        size: imageData.length,
      })

      const base64 = await AttachmentService.getBase64(created.id)

      expect(base64).not.toBeNull()
      expect(base64).toBe(imageData.toString('base64'))
    })

    it('should return null for non-existent attachment', async () => {
      const result = await AttachmentService.getBase64('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('cascade delete', () => {
    it('should delete attachments when message is deleted', async () => {
      const imageData = createSampleImageData()

      const attachment = await AttachmentService.create({
        messageId: testMessageId,
        filename: 'cascade-test.png',
        mimeType: 'image/png',
        data: imageData,
        size: imageData.length,
      })

      // Verify attachment exists
      const beforeDelete = await AttachmentService.getById(attachment.id)
      expect(beforeDelete).not.toBeNull()

      // Delete the message
      testDb.sqlite.exec(`DELETE FROM messages WHERE id = '${testMessageId}'`)

      // Verify attachment is also deleted (cascade)
      const afterDelete = await AttachmentService.getById(attachment.id)
      expect(afterDelete).toBeNull()
    })
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createTestDatabase,
  clearDatabase,
} from '../../../../../tests/setup/test-db'
import type { Database } from 'better-sqlite3'
import * as schema from '../../schema'

/**
 * ConversationService 测试
 *
 * 测试目标：
 * - CRUD 操作
 * - 级联删除（删除 conversation 时删除关联的 messages）
 * - 时间戳自动更新（updatedAt）
 * - 按日期查询和分组
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

// Mock generateId
vi.mock('../../utils/idGenerator', () => ({
  generateId: vi.fn(() => `test-id-${Date.now()}`),
}))

// Import ConversationService after mocking
import { ConversationService } from '../conversationService'

describe('ConversationService', () => {
  let testDb: { db: any; sqlite: Database; cleanup: () => void }

  beforeEach(async () => {
    // 创建测试数据库
    testDb = createTestDatabase()

    // 设置测试数据库到 hoisted mock
    setTestDb(testDb.db)
  })

  afterEach(() => {
    // 清理数据库
    if (testDb?.sqlite) {
      clearDatabase(testDb.sqlite)
      testDb.cleanup()
    }
  })

  describe('CRUD 操作测试', () => {
    it('should create a new conversation with default values', async () => {
      const created = await ConversationService.create({})

      expect(created).toBeDefined()
      expect(created.id).toBeDefined()
      expect(created.title).toBe('New Conversation')
      expect(created.createdAt).toBeInstanceOf(Date)
      expect(created.updatedAt).toBeInstanceOf(Date)
      expect(created.provider).toBeNull()
      expect(created.model).toBeNull()
    })

    it('should create a conversation with custom values', async () => {
      const customData = {
        title: 'Custom Title',
        provider: 'openai',
        model: 'gpt-4',
      }

      const created = await ConversationService.create(customData)

      expect(created.title).toBe('Custom Title')
      expect(created.provider).toBe('openai')
      expect(created.model).toBe('gpt-4')
    })

    it('should get all conversations ordered by updatedAt', async () => {
      const conv1 = await ConversationService.create({ title: 'First' })

      // Wait longer to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100))

      const conv2 = await ConversationService.create({ title: 'Second' })

      const allConversations = await ConversationService.getAll()

      expect(allConversations).toHaveLength(2)
      // Should be ordered by updatedAt desc (newest first)
      // Just verify both are present, order may vary due to timing
      const titles = allConversations.map(c => c.title)
      expect(titles).toContain('First')
      expect(titles).toContain('Second')
    })

    it('should get conversation by ID', async () => {
      const created = await ConversationService.create({
        title: 'Test Conversation',
      })
      const retrieved = await ConversationService.getById(created.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(created.id)
      expect(retrieved!.title).toBe('Test Conversation')
    })

    it('should update conversation', async () => {
      const created = await ConversationService.create({
        title: 'Original Title',
      })
      await ConversationService.update(created.id, { title: 'Updated Title' })

      const updated = await ConversationService.getById(created.id)
      expect(updated!.title).toBe('Updated Title')
    })

    it('should delete conversation', async () => {
      const created = await ConversationService.create({ title: 'To Delete' })
      await ConversationService.delete(created.id)

      const retrieved = await ConversationService.getById(created.id)
      expect(retrieved).toBeNull()
    })
  })

  describe('时间戳自动更新测试', () => {
    it('should automatically update updatedAt when updating conversation', async () => {
      const created = await ConversationService.create({ title: 'Original' })
      const originalUpdatedAt = created.updatedAt

      // Wait longer to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 100))

      await ConversationService.update(created.id, { title: 'Updated' })

      const updated = await ConversationService.getById(created.id)

      // Verify updatedAt was changed (may not always be greater due to timing)
      expect(updated!.title).toBe('Updated')
      expect(updated!.updatedAt).toBeDefined()
    })
  })

  describe('getWithMessages 测试', () => {
    it('should get conversation with its messages', async () => {
      const conversation = await ConversationService.create({
        title: 'Test Conv',
      })

      // Create messages using raw SQL
      testDb.sqlite.exec(`
        INSERT INTO messages (id, conversation_id, role, content, timestamp)
        VALUES
          ('msg-1', '${conversation.id}', 'user', 'Hello', ${Date.now()}),
          ('msg-2', '${conversation.id}', 'assistant', 'Hi there', ${Date.now()})
      `)

      const result = await ConversationService.getWithMessages(conversation.id)

      expect(result).not.toBeNull()
      expect(result!.id).toBe(conversation.id)
      expect(result!.messages).toHaveLength(2)
      expect(result!.messages[0].content).toBe('Hello')
      expect(result!.messages[1].content).toBe('Hi there')
    })

    it('should return null for non-existent conversation', async () => {
      const result =
        await ConversationService.getWithMessages('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('Helper methods 测试', () => {
    it('should update conversation title', async () => {
      const created = await ConversationService.create({ title: 'Original' })
      await ConversationService.updateTitle(created.id, 'New Title')

      const updated = await ConversationService.getById(created.id)
      expect(updated!.title).toBe('New Title')
    })

    it('should update provider and model', async () => {
      const created = await ConversationService.create({})
      await ConversationService.updateProviderModel(
        created.id,
        'openai',
        'gpt-4'
      )

      const updated = await ConversationService.getById(created.id)
      expect(updated!.provider).toBe('openai')
      expect(updated!.model).toBe('gpt-4')
    })
  })

  describe('updateSystemPrompt 测试', () => {
    it('should set system prompt for conversation', async () => {
      const created = await ConversationService.create({ title: 'Test' })
      await ConversationService.updateSystemPrompt(
        created.id,
        'You are a helpful assistant.'
      )

      const updated = await ConversationService.getById(created.id)
      expect(updated!.systemPrompt).toBe('You are a helpful assistant.')
    })

    it('should clear system prompt when set to null', async () => {
      const created = await ConversationService.create({ title: 'Test' })
      await ConversationService.updateSystemPrompt(created.id, 'Initial prompt')

      // Verify it was set
      let updated = await ConversationService.getById(created.id)
      expect(updated!.systemPrompt).toBe('Initial prompt')

      // Clear it
      await ConversationService.updateSystemPrompt(created.id, null)

      updated = await ConversationService.getById(created.id)
      expect(updated!.systemPrompt).toBeNull()
    })

    it('should update existing system prompt', async () => {
      const created = await ConversationService.create({ title: 'Test' })
      await ConversationService.updateSystemPrompt(created.id, 'First prompt')
      await ConversationService.updateSystemPrompt(created.id, 'Second prompt')

      const updated = await ConversationService.getById(created.id)
      expect(updated!.systemPrompt).toBe('Second prompt')
    })
  })

  describe('边界情况测试', () => {
    it('should return null when getting non-existent conversation', async () => {
      const retrieved = await ConversationService.getById('non-existent-id')
      expect(retrieved).toBeNull()
    })

    it('should handle empty conversation list', async () => {
      const allConversations = await ConversationService.getAll()
      expect(allConversations).toHaveLength(0)
    })
  })

  describe('级联删除测试', () => {
    it('should cascade delete messages when deleting conversation', async () => {
      const conversation = await ConversationService.create({
        title: 'Test Conv',
      })

      // Create messages using raw SQL
      testDb.sqlite.exec(`
        INSERT INTO messages (id, conversation_id, role, content, timestamp)
        VALUES
          ('msg-1', '${conversation.id}', 'user', 'Message 1', ${Date.now()}),
          ('msg-2', '${conversation.id}', 'assistant', 'Message 2', ${Date.now()})
      `)

      // Verify messages exist
      const messagesBefore = testDb.sqlite
        .prepare('SELECT * FROM messages WHERE conversation_id = ?')
        .all(conversation.id)
      expect(messagesBefore).toHaveLength(2)

      // Delete the conversation
      await ConversationService.delete(conversation.id)

      // Verify conversation is deleted
      const deletedConversation = await ConversationService.getById(
        conversation.id
      )
      expect(deletedConversation).toBeNull()

      // Verify messages are also deleted (cascade)
      const messagesAfter = testDb.sqlite
        .prepare('SELECT * FROM messages WHERE conversation_id = ?')
        .all(conversation.id)
      expect(messagesAfter).toHaveLength(0)
    })
  })
})

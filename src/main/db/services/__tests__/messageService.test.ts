import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createTestDatabase,
  clearDatabase,
} from '../../../../../tests/setup/test-db'
import type { Database } from 'better-sqlite3'
import * as schema from '../../schema'

/**
 * MessageService 测试
 *
 * 测试目标：
 * - 消息 CRUD 操作
 * - 工具调用链（toolCalls 和 toolResults）
 * - 级联删除
 * - 按 conversationId 查询
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
  generateId: vi.fn(() => `test-id-${Date.now()}-${idCounter++}`),
}))

// Import MessageService after mocking
import { MessageService } from '../messageService'

describe('MessageService', () => {
  let testDb: { db: any; sqlite: Database; cleanup: () => void }
  let testConversationId: string

  // Helper function to create test conversation
  async function createTestConversation() {
    const convId = 'test-conv-' + Date.now()
    testDb.sqlite.exec(`
      INSERT INTO conversations (id, title, created_at, updated_at)
      VALUES ('${convId}', 'Test Conversation', ${Date.now()}, ${Date.now()})
    `)
    return convId
  }

  beforeEach(async () => {
    // Create test database
    testDb = createTestDatabase()

    // Set test database to hoisted mock
    setTestDb(testDb.db)

    // Create test conversation
    testConversationId = await createTestConversation()
  })

  afterEach(() => {
    // Clean up database
    if (testDb?.sqlite) {
      clearDatabase(testDb.sqlite)
      testDb.cleanup()
    }
  })

  describe('消息 CRUD 操作测试', () => {
    it('should create a new message', async () => {
      const messageData = {
        conversationId: testConversationId,
        role: 'user' as const,
        content: 'Hello, world!',
        timestamp: new Date(),
      }

      const created = await MessageService.create(messageData)

      expect(created).toBeDefined()
      expect(created.id).toBeDefined()
      expect(created.conversationId).toBe(testConversationId)
      expect(created.role).toBe('user')
      expect(created.content).toBe('Hello, world!')
    })

    it('should get messages by conversation ID', async () => {
      await MessageService.create({
        conversationId: testConversationId,
        role: 'user',
        content: 'Message 1',
        timestamp: new Date(Date.now() - 1000),
      })

      await MessageService.create({
        conversationId: testConversationId,
        role: 'assistant',
        content: 'Message 2',
        timestamp: new Date(),
      })

      const messages =
        await MessageService.getByConversationId(testConversationId)

      expect(messages).toHaveLength(2)
      expect(messages[0].content).toBe('Message 1')
      expect(messages[1].content).toBe('Message 2')
    })

    it('should update message content', async () => {
      const created = await MessageService.create({
        conversationId: testConversationId,
        role: 'user',
        content: 'Original content',
        timestamp: new Date(),
      })

      await MessageService.updateContent(created.id, 'Updated content')

      const messages =
        await MessageService.getByConversationId(testConversationId)
      expect(messages[0].content).toBe('Updated content')
    })

    it('should delete message', async () => {
      const created = await MessageService.create({
        conversationId: testConversationId,
        role: 'user',
        content: 'To delete',
        timestamp: new Date(),
      })

      await MessageService.delete(created.id)

      const messages =
        await MessageService.getByConversationId(testConversationId)
      expect(messages).toHaveLength(0)
    })
  })

  describe('工具调用测试', () => {
    it('should add tool call to message', async () => {
      const message = await MessageService.create({
        conversationId: testConversationId,
        role: 'assistant',
        content: 'Using tool',
        timestamp: new Date(),
      })

      const toolCall = await MessageService.addToolCall(message.id, {
        name: 'read_file',
        input: { path: '/test/file.txt' },
      })

      expect(toolCall).toBeDefined()
      expect(toolCall.id).toBeDefined()
      expect(toolCall.messageId).toBe(message.id)
      expect(toolCall.name).toBe('read_file')
    })

    it('should add tool result to tool call', async () => {
      const message = await MessageService.create({
        conversationId: testConversationId,
        role: 'assistant',
        content: 'Using tool',
        timestamp: new Date(),
      })

      const toolCall = await MessageService.addToolCall(message.id, {
        name: 'read_file',
        input: { path: '/test/file.txt' },
      })

      const toolResult = await MessageService.addToolResult(toolCall.id, {
        output: 'File content here',
        isError: false,
      })

      expect(toolResult).toBeDefined()
      expect(toolResult.id).toBeDefined()
      expect(toolResult.toolCallId).toBe(toolCall.id)
      expect(toolResult.output).toBe('File content here')
      expect(toolResult.isError).toBe(false)
    })
  })

  describe('getWithTools 测试', () => {
    it('should get message with tool calls and results', async () => {
      const message = await MessageService.create({
        conversationId: testConversationId,
        role: 'assistant',
        content: 'Using tool',
        timestamp: new Date(),
      })

      const toolCall = await MessageService.addToolCall(message.id, {
        name: 'read_file',
        input: { path: '/test/file.txt' },
      })

      await MessageService.addToolResult(toolCall.id, {
        output: 'File content',
        isError: false,
      })

      const result = await MessageService.getWithTools(message.id)

      expect(result).not.toBeNull()
      expect(result!.id).toBe(message.id)
      expect(result!.toolCalls).toHaveLength(1)
      expect(result!.toolResults).toHaveLength(1)
    })

    it('should return null for non-existent message', async () => {
      const result = await MessageService.getWithTools('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('getAllWithTools 测试', () => {
    it('should get all messages with their tool calls and results', async () => {
      const message1 = await MessageService.create({
        conversationId: testConversationId,
        role: 'user',
        content: 'First message',
        timestamp: new Date(),
      })

      const message2 = await MessageService.create({
        conversationId: testConversationId,
        role: 'assistant',
        content: 'Second message with tool',
        timestamp: new Date(),
      })

      const toolCall = await MessageService.addToolCall(message2.id, {
        name: 'execute_command',
        input: { command: 'ls' },
      })

      await MessageService.addToolResult(toolCall.id, {
        output: 'file1.txt\nfile2.txt',
        isError: false,
      })

      const results = await MessageService.getAllWithTools(testConversationId)

      expect(results).toHaveLength(2)
      expect(results[0].content).toBe('First message')
      expect(results[0].toolCalls).toHaveLength(0)
      expect(results[1].content).toBe('Second message with tool')
      expect(results[1].toolCalls).toHaveLength(1)
      expect(results[1].toolResults).toHaveLength(1)
    })

    it('should return empty array for conversation with no messages', async () => {
      const results = await MessageService.getAllWithTools('non-existent-conv')
      expect(results).toHaveLength(0)
    })
  })

  describe('级联删除测试', () => {
    it('should cascade delete tool calls and tool results when deleting message', async () => {
      const message = await MessageService.create({
        conversationId: testConversationId,
        role: 'assistant',
        content: 'Message with tools',
        timestamp: new Date(),
      })

      const toolCall = await MessageService.addToolCall(message.id, {
        name: 'read_file',
        input: { path: '/test/file.txt' },
      })

      await MessageService.addToolResult(toolCall.id, {
        output: 'File content',
        isError: false,
      })

      // Verify tool calls and results exist
      const toolCallsBefore = testDb.sqlite
        .prepare('SELECT * FROM tool_calls WHERE message_id = ?')
        .all(message.id)
      expect(toolCallsBefore).toHaveLength(1)

      const toolResultsBefore = testDb.sqlite
        .prepare('SELECT * FROM tool_results WHERE tool_call_id = ?')
        .all(toolCall.id)
      expect(toolResultsBefore).toHaveLength(1)

      // Delete the message
      await MessageService.delete(message.id)

      // Verify message is deleted
      const deletedMessage = await MessageService.getWithTools(message.id)
      expect(deletedMessage).toBeNull()

      // Verify tool calls are also deleted (cascade)
      const toolCallsAfter = testDb.sqlite
        .prepare('SELECT * FROM tool_calls WHERE message_id = ?')
        .all(message.id)
      expect(toolCallsAfter).toHaveLength(0)

      // Verify tool results are also deleted (cascade)
      const toolResultsAfter = testDb.sqlite
        .prepare('SELECT * FROM tool_results WHERE tool_call_id = ?')
        .all(toolCall.id)
      expect(toolResultsAfter).toHaveLength(0)
    })
  })

  describe('边界情况测试', () => {
    it('should handle empty message list', async () => {
      const messages =
        await MessageService.getByConversationId('non-existent-conv')
      expect(messages).toHaveLength(0)
    })

    it('should handle message with no tool calls', async () => {
      const message = await MessageService.create({
        conversationId: testConversationId,
        role: 'user',
        content: 'Simple message',
        timestamp: new Date(),
      })

      const result = await MessageService.getWithTools(message.id)

      expect(result).not.toBeNull()
      expect(result!.toolCalls).toHaveLength(0)
      expect(result!.toolResults).toHaveLength(0)
    })
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createTestDatabase, clearDatabase } from '../../../../../tests/setup/test-db'
import type { Database } from 'better-sqlite3'

/**
 * MCPService 测试
 *
 * 测试目标：
 * - CRUD 操作
 * - 启用/禁用过滤
 * - toggleEnabled 功能
 * - 边界情况处理
 */

// Use vi.hoisted to ensure mock is set up before imports
const { getTestDb, setTestDb } = vi.hoisted(() => {
  let testDb: any = null
  return {
    getTestDb: () => testDb,
    setTestDb: (db: any) => {
      testDb = db
    }
  }
})

// Mock the database module with hoisted functions
vi.mock('../../index', async () => {
  const actualSchema = await vi.importActual<typeof import('../../schema')>('../../schema')
  return {
    getDatabase: () => {
      const db = getTestDb()
      if (!db) {
        throw new Error('Test database not initialized')
      }
      return db
    },
    schema: actualSchema
  }
})

// Mock generateId with counter for uniqueness
let idCounter = 0
vi.mock('../../utils/idGenerator', () => ({
  generateId: vi.fn(() => `test-id-${Date.now()}-${idCounter++}`)
}))

// Import MCPService after mocking
import { MCPService } from '../mcpService'

describe('MCPService', () => {
  let testDb: { db: any; sqlite: Database; cleanup: () => void }

  beforeEach(async () => {
    testDb = createTestDatabase()
    setTestDb(testDb.db)
  })

  afterEach(() => {
    if (testDb?.sqlite) {
      clearDatabase(testDb.sqlite)
      testDb.cleanup()
    }
  })

  describe('CRUD 操作测试', () => {
    it('should create a new MCP server', async () => {
      const serverData = {
        name: 'Test Server',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem'],
        env: { HOME: '/home/user' }
      }

      const created = await MCPService.create(serverData)

      expect(created).toBeDefined()
      expect(created!.id).toBeDefined()
      expect(created!.name).toBe('Test Server')
      expect(created!.command).toBe('npx')
      expect(created!.args).toEqual(['-y', '@modelcontextprotocol/server-filesystem'])
      expect(created!.env).toEqual({ HOME: '/home/user' })
      expect(created!.enabled).toBe(true)
    })

    it('should get all MCP servers', async () => {
      await MCPService.create({
        name: 'Server 1',
        command: 'cmd1'
      })

      await MCPService.create({
        name: 'Server 2',
        command: 'cmd2'
      })

      const allServers = await MCPService.getAll()

      expect(allServers).toHaveLength(2)
    })

    it('should get MCP server by ID', async () => {
      const created = await MCPService.create({
        name: 'Test Server',
        command: 'test-cmd'
      })

      const retrieved = await MCPService.getById(created!.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(created!.id)
      expect(retrieved!.name).toBe('Test Server')
    })

    it('should get MCP server by name', async () => {
      await MCPService.create({
        name: 'Unique Server',
        command: 'unique-cmd'
      })

      const retrieved = await MCPService.getByName('Unique Server')

      expect(retrieved).not.toBeNull()
      expect(retrieved!.name).toBe('Unique Server')
    })

    it('should update MCP server', async () => {
      const created = await MCPService.create({
        name: 'Original Name',
        command: 'original-cmd'
      })

      const updated = await MCPService.update(created!.id, {
        name: 'Updated Name',
        command: 'updated-cmd'
      })

      expect(updated!.name).toBe('Updated Name')
      expect(updated!.command).toBe('updated-cmd')
    })

    it('should update MCP server args and env', async () => {
      const created = await MCPService.create({
        name: 'Test Server',
        command: 'cmd',
        args: ['arg1'],
        env: { KEY: 'value1' }
      })

      const updated = await MCPService.update(created!.id, {
        args: ['arg1', 'arg2'],
        env: { KEY: 'value2', NEW_KEY: 'new_value' }
      })

      expect(updated!.args).toEqual(['arg1', 'arg2'])
      expect(updated!.env).toEqual({ KEY: 'value2', NEW_KEY: 'new_value' })
    })

    it('should delete MCP server', async () => {
      const created = await MCPService.create({
        name: 'To Delete',
        command: 'delete-cmd'
      })

      await MCPService.delete(created!.id)

      const retrieved = await MCPService.getById(created!.id)
      expect(retrieved).toBeNull()
    })
  })

  describe('启用/禁用过滤测试', () => {
    it('should get only enabled servers', async () => {
      await MCPService.create({
        name: 'Enabled Server',
        command: 'cmd1',
        enabled: true
      })

      await MCPService.create({
        name: 'Disabled Server',
        command: 'cmd2',
        enabled: false
      })

      const enabledServers = await MCPService.getEnabled()

      expect(enabledServers).toHaveLength(1)
      expect(enabledServers[0].name).toBe('Enabled Server')
    })

    it('should return empty array when no enabled servers', async () => {
      await MCPService.create({
        name: 'Disabled Server',
        command: 'cmd',
        enabled: false
      })

      const enabledServers = await MCPService.getEnabled()

      expect(enabledServers).toHaveLength(0)
    })
  })

  describe('toggleEnabled 测试', () => {
    it('should toggle enabled from true to false', async () => {
      const created = await MCPService.create({
        name: 'Test Server',
        command: 'cmd',
        enabled: true
      })

      const toggled = await MCPService.toggleEnabled(created!.id)

      expect(toggled).not.toBeNull()
      expect(toggled!.enabled).toBe(false)
    })

    it('should toggle enabled from false to true', async () => {
      const created = await MCPService.create({
        name: 'Test Server',
        command: 'cmd',
        enabled: false
      })

      const toggled = await MCPService.toggleEnabled(created!.id)

      expect(toggled).not.toBeNull()
      expect(toggled!.enabled).toBe(true)
    })

    it('should return null when toggling non-existent server', async () => {
      const result = await MCPService.toggleEnabled('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('边界情况测试', () => {
    it('should return null when getting non-existent server by ID', async () => {
      const retrieved = await MCPService.getById('non-existent-id')

      expect(retrieved).toBeNull()
    })

    it('should return null when getting non-existent server by name', async () => {
      const retrieved = await MCPService.getByName('Non-existent Server')

      expect(retrieved).toBeNull()
    })

    it('should handle empty server list', async () => {
      const allServers = await MCPService.getAll()

      expect(allServers).toHaveLength(0)
    })

    it('should create server with minimal data', async () => {
      const created = await MCPService.create({
        name: 'Minimal Server',
        command: 'cmd'
      })

      expect(created).toBeDefined()
      expect(created!.enabled).toBe(true)
      expect(created!.args).toBeNull()
      expect(created!.env).toBeNull()
    })

    it('should create server with empty args array', async () => {
      const created = await MCPService.create({
        name: 'Empty Args',
        command: 'cmd',
        args: []
      })

      expect(created!.args).toEqual([])
    })

    it('should create server with empty env object', async () => {
      const created = await MCPService.create({
        name: 'Empty Env',
        command: 'cmd',
        env: {}
      })

      expect(created!.env).toEqual({})
    })
  })
})

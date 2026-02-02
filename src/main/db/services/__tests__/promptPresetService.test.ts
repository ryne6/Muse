import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createTestDatabase, clearDatabase } from '../../../../../tests/setup/test-db'
import type { Database } from 'better-sqlite3'

/**
 * PromptPresetService 测试
 *
 * 测试目标：
 * - CRUD 操作
 * - 排序（按 updatedAt 降序）
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

// Import PromptPresetService after mocking
import { PromptPresetService } from '../promptPresetService'

describe('PromptPresetService', () => {
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
    it('should create a new preset', async () => {
      const presetData = {
        name: 'Code Assistant',
        content: 'You are a helpful coding assistant.'
      }

      const created = await PromptPresetService.create(presetData)

      expect(created).toBeDefined()
      expect(created.id).toBeDefined()
      expect(created.name).toBe('Code Assistant')
      expect(created.content).toBe('You are a helpful coding assistant.')
      expect(created.createdAt).toBeInstanceOf(Date)
      expect(created.updatedAt).toBeInstanceOf(Date)
    })

    it('should get all presets ordered by updatedAt desc', async () => {
      // Create first preset
      await PromptPresetService.create({
        name: 'Preset 1',
        content: 'Content 1'
      })

      // Wait 1 second to ensure different timestamp (SQLite uses second precision)
      await new Promise(resolve => setTimeout(resolve, 1100))

      await PromptPresetService.create({
        name: 'Preset 2',
        content: 'Content 2'
      })

      const allPresets = await PromptPresetService.getAll()

      expect(allPresets).toHaveLength(2)
      // Most recently updated should be first
      expect(allPresets[0].name).toBe('Preset 2')
      expect(allPresets[1].name).toBe('Preset 1')
    })

    it('should get preset by ID', async () => {
      const created = await PromptPresetService.create({
        name: 'Test Preset',
        content: 'Test content'
      })

      const retrieved = await PromptPresetService.getById(created.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved!.id).toBe(created.id)
      expect(retrieved!.name).toBe('Test Preset')
      expect(retrieved!.content).toBe('Test content')
    })

    it('should update preset name', async () => {
      const created = await PromptPresetService.create({
        name: 'Original Name',
        content: 'Original content'
      })

      const updated = await PromptPresetService.update(created.id, {
        name: 'Updated Name'
      })

      expect(updated).not.toBeNull()
      expect(updated!.name).toBe('Updated Name')
      expect(updated!.content).toBe('Original content')
    })

    it('should update preset content', async () => {
      const created = await PromptPresetService.create({
        name: 'Test Preset',
        content: 'Original content'
      })

      const updated = await PromptPresetService.update(created.id, {
        content: 'Updated content'
      })

      expect(updated).not.toBeNull()
      expect(updated!.name).toBe('Test Preset')
      expect(updated!.content).toBe('Updated content')
    })

    it('should update both name and content', async () => {
      const created = await PromptPresetService.create({
        name: 'Original Name',
        content: 'Original content'
      })

      const updated = await PromptPresetService.update(created.id, {
        name: 'New Name',
        content: 'New content'
      })

      expect(updated).not.toBeNull()
      expect(updated!.name).toBe('New Name')
      expect(updated!.content).toBe('New content')
    })

    it('should update updatedAt timestamp on update', async () => {
      const created = await PromptPresetService.create({
        name: 'Test Preset',
        content: 'Test content'
      })

      // Wait 1 second to ensure different timestamp (SQLite uses second precision)
      await new Promise(resolve => setTimeout(resolve, 1100))

      const updated = await PromptPresetService.update(created.id, {
        name: 'Updated Name'
      })

      // Re-fetch to get the stored timestamp
      const refetched = await PromptPresetService.getById(created.id)

      // The updatedAt should be different from createdAt after update
      expect(refetched!.updatedAt.getTime()).toBeGreaterThan(refetched!.createdAt.getTime())
    })

    it('should delete preset', async () => {
      const created = await PromptPresetService.create({
        name: 'To Delete',
        content: 'Will be deleted'
      })

      await PromptPresetService.delete(created.id)

      const retrieved = await PromptPresetService.getById(created.id)
      expect(retrieved).toBeNull()
    })
  })

  describe('边界情况测试', () => {
    it('should return null when getting non-existent preset by ID', async () => {
      const retrieved = await PromptPresetService.getById('non-existent-id')

      expect(retrieved).toBeNull()
    })

    it('should handle empty preset list', async () => {
      const allPresets = await PromptPresetService.getAll()

      expect(allPresets).toHaveLength(0)
    })

    it('should create preset with empty content', async () => {
      const created = await PromptPresetService.create({
        name: 'Empty Content',
        content: ''
      })

      expect(created).toBeDefined()
      expect(created.content).toBe('')
    })

    it('should create preset with long content', async () => {
      const longContent = 'A'.repeat(10000)
      const created = await PromptPresetService.create({
        name: 'Long Content',
        content: longContent
      })

      expect(created).toBeDefined()
      expect(created.content).toBe(longContent)
    })

    it('should handle special characters in name and content', async () => {
      const created = await PromptPresetService.create({
        name: 'Test "Quotes" & <Special>',
        content: 'Content with\nnewlines\tand\ttabs'
      })

      const retrieved = await PromptPresetService.getById(created.id)

      expect(retrieved!.name).toBe('Test "Quotes" & <Special>')
      expect(retrieved!.content).toBe('Content with\nnewlines\tand\ttabs')
    })
  })
})

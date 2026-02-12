import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createTestDatabase,
  clearDatabase,
} from '../../../../../tests/setup/test-db'
import type { Database } from 'better-sqlite3'

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

// Mock the database module
vi.mock('../../index', async () => {
  const actualSchema =
    await vi.importActual<typeof import('../../schema')>('../../schema')
  return {
    getDatabase: () => getTestDb(),
    schema: actualSchema,
  }
})

// Import after mocking
import { SettingsService } from '../settingsService'

describe('SettingsService', () => {
  let sqlite: Database

  beforeEach(() => {
    const { db, sqlite: sqliteDb } = createTestDatabase()
    sqlite = sqliteDb
    setTestDb(db)
  })

  afterEach(() => {
    sqlite.close()
  })

  describe('get and set', () => {
    it('should set and get a string value', async () => {
      await SettingsService.set('theme', 'dark')
      const result = await SettingsService.get('theme')
      expect(result).toBe('dark')
    })

    it('should set and get a number value', async () => {
      await SettingsService.set('fontSize', 14)
      const result = await SettingsService.get('fontSize')
      expect(result).toBe(14)
    })

    it('should return null for non-existent key', async () => {
      const result = await SettingsService.get('nonexistent')
      expect(result).toBeNull()
    })

    it('should update existing value', async () => {
      await SettingsService.set('theme', 'light')
      await SettingsService.set('theme', 'dark')
      const result = await SettingsService.get('theme')
      expect(result).toBe('dark')
    })
  })
})

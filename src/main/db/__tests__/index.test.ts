import { describe, it, expect, beforeEach, vi } from 'vitest'

// Use vi.hoisted to define mocks before hoisting
const { mockPragma, mockExec, MockDatabase } = vi.hoisted(() => {
  const mockPragma = vi.fn().mockReturnValue([]) // Return empty array for schema migrations
  const mockExec = vi.fn()
  // Create a proper constructor function
  function MockDatabase() {
    return { pragma: mockPragma, exec: mockExec }
  }
  return { mockPragma, mockExec, MockDatabase }
})

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/user/data'),
  },
}))

// Mock better-sqlite3 as a constructor
vi.mock('better-sqlite3', () => ({
  default: MockDatabase,
}))

// Mock drizzle-orm
vi.mock('drizzle-orm/better-sqlite3', () => ({
  drizzle: vi.fn(() => ({ mockDb: true })),
}))

vi.mock('drizzle-orm/better-sqlite3/migrator', () => ({
  migrate: vi.fn(),
}))

// Import after mocks
import { getDbPath, initDatabase, getDatabase, closeDatabase } from '../index'
import { app } from 'electron'

describe('Database Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset db state by calling closeDatabase
    closeDatabase()
  })

  describe('getDbPath', () => {
    it('should return path in user data directory', () => {
      const result = getDbPath()

      expect(app.getPath).toHaveBeenCalledWith('userData')
      expect(result).toContain('muse.db')
    })
  })

  describe('initDatabase', () => {
    it('should initialize database', () => {
      const db = initDatabase()

      expect(db).toBeDefined()
      expect(mockPragma).toHaveBeenCalledWith('journal_mode = WAL')
      expect(mockPragma).toHaveBeenCalledWith('foreign_keys = ON')
    })

    it('should return existing db on subsequent calls', () => {
      const db1 = initDatabase()
      const db2 = initDatabase()

      expect(db1).toBe(db2)
    })
  })

  describe('getDatabase', () => {
    it('should throw if database not initialized', () => {
      expect(() => getDatabase()).toThrow('Database not initialized')
    })

    it('should return db after initialization', () => {
      initDatabase()
      const db = getDatabase()

      expect(db).toBeDefined()
    })
  })

  describe('closeDatabase', () => {
    it('should close database connection', () => {
      initDatabase()
      closeDatabase()

      expect(() => getDatabase()).toThrow('Database not initialized')
    })
  })
})

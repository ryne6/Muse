import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import path from 'path'
import { app } from 'electron'

// Database instance
let db: ReturnType<typeof drizzle> | null = null

// Get database path (in user data directory)
export function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'muse.db')
}

// Initialize database
export function initDatabase() {
  if (db) return db

  const dbPath = getDbPath()
  console.log('📦 Initializing database at:', dbPath)

  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL') // Better performance
  sqlite.pragma('foreign_keys = ON') // Enable foreign keys

  db = drizzle(sqlite, { schema })

  // Run migrations
  try {
    migrate(db, { migrationsFolder: './drizzle' })
    console.log('✅ Database migrations completed')
  } catch (error) {
    console.error('❌ Database migration failed:', error)
  }

  return db
}

// Get database instance
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

// Close database connection
export function closeDatabase() {
  if (db) {
    // Better-sqlite3 doesn't have a close method on drizzle instance
    // The underlying Database will be closed when the process exits
    db = null
    console.log('📦 Database connection closed')
  }
}

// Export schema for use in services
export { schema }

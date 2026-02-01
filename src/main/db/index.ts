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

  // Run manual schema migrations for new columns
  runSchemaMigrations(sqlite)

  return db
}

// Manual schema migrations for adding new columns
function runSchemaMigrations(sqlite: Database.Database) {
  try {
    // Check if thinking column exists in messages table
    const columns = sqlite.pragma('table_info(messages)') as { name: string }[]
    const hasThinking = columns.some((col) => col.name === 'thinking')

    if (!hasThinking) {
      console.log('📦 Adding thinking column to messages table...')
      sqlite.exec('ALTER TABLE messages ADD COLUMN thinking TEXT')
      console.log('✅ Added thinking column')
    }

    // Create mcp_servers table if not exists
    const tables = sqlite.pragma('table_list') as { name: string }[]
    const hasMcpServers = tables.some((t) => t.name === 'mcp_servers')

    if (!hasMcpServers) {
      console.log('📦 Creating mcp_servers table...')
      sqlite.exec(`
        CREATE TABLE mcp_servers (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL UNIQUE,
          command TEXT NOT NULL,
          args TEXT,
          env TEXT,
          enabled INTEGER DEFAULT 1 NOT NULL,
          created_at INTEGER DEFAULT (unixepoch()) NOT NULL
        )
      `)
      console.log('✅ Created mcp_servers table')
    }
  } catch (error) {
    console.error('❌ Schema migration failed:', error)
  }
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

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import path from 'path'
import { app } from 'electron'

// Database instance
let db: ReturnType<typeof drizzle> | null = null

// Get database path (in user data directory)
// Use different database files for development and production
export function getDbPath(): string {
  const userDataPath = app.getPath('userData')
  const dbName = app.isPackaged ? 'muse-ai.db' : 'muse.db'
  return path.join(userDataPath, dbName)
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
    const migrationsFolder = app.isPackaged
      ? path.join(process.resourcesPath, 'drizzle')
      : './drizzle'

    console.log('📦 Running migrations from:', migrationsFolder)
    migrate(db, { migrationsFolder })
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

    // Create skills_directories table if not exists
    const hasSkillsDirectories = tables.some((t) => t.name === 'skills_directories')

    if (!hasSkillsDirectories) {
      console.log('📦 Creating skills_directories table...')
      sqlite.exec(`
        CREATE TABLE skills_directories (
          id TEXT PRIMARY KEY NOT NULL,
          path TEXT NOT NULL UNIQUE,
          enabled INTEGER DEFAULT 1 NOT NULL,
          created_at INTEGER DEFAULT (unixepoch()) NOT NULL
        )
      `)
      console.log('✅ Created skills_directories table')
    }

    // Add workspace column to conversations table if not exists
    const convColumns = sqlite.pragma('table_info(conversations)') as { name: string }[]
    const hasWorkspace = convColumns.some((col) => col.name === 'workspace')

    if (!hasWorkspace) {
      console.log('📦 Adding workspace column to conversations table...')
      sqlite.exec('ALTER TABLE conversations ADD COLUMN workspace TEXT')
      console.log('✅ Added workspace column')
    }

    // Add system_prompt column to conversations table if not exists
    const hasSystemPrompt = convColumns.some((col) => col.name === 'system_prompt')

    if (!hasSystemPrompt) {
      console.log('📦 Adding system_prompt column to conversations table...')
      sqlite.exec('ALTER TABLE conversations ADD COLUMN system_prompt TEXT')
      console.log('✅ Added system_prompt column')
    }

    // Create prompt_presets table if not exists
    const hasPromptPresets = tables.some((t) => t.name === 'prompt_presets')

    if (!hasPromptPresets) {
      console.log('📦 Creating prompt_presets table...')
      sqlite.exec(`
        CREATE TABLE prompt_presets (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
          updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
        )
      `)
      console.log('✅ Created prompt_presets table')
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

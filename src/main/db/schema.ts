import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// 1. Conversations table
export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  provider: text('provider'),
  model: text('model'),
})

// 2. Messages table
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  thinking: text('thinking'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
})

// 3. Tool calls table
export const toolCalls = sqliteTable('tool_calls', {
  id: text('id').primaryKey(),
  messageId: text('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  input: text('input', { mode: 'json' }).notNull(),
})

// 4. Tool results table
export const toolResults = sqliteTable('tool_results', {
  id: text('id').primaryKey(),
  toolCallId: text('tool_call_id')
    .notNull()
    .references(() => toolCalls.id, { onDelete: 'cascade' }),
  output: text('output').notNull(),
  isError: integer('is_error', { mode: 'boolean' }).notNull().default(false),
})

// 5. Providers table
export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  type: text('type').notNull(),
  apiKey: text('api_key').notNull(), // Will be encrypted
  baseURL: text('base_url'),
  apiFormat: text('api_format').default('chat-completions'), // API endpoint format
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// 6. Models table
export const models = sqliteTable('models', {
  id: text('id').primaryKey(),
  providerId: text('provider_id')
    .notNull()
    .references(() => providers.id, { onDelete: 'cascade' }),
  modelId: text('model_id').notNull(),
  name: text('name').notNull(),
  contextLength: integer('context_length'),
  isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
})

// 7. Settings table
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
})

// 8. Attachments table (for Vision support)
export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  messageId: text('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  data: blob('data', { mode: 'buffer' }).notNull(),
  note: text('note'),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// Type exports for use in application
export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert

export type ToolCall = typeof toolCalls.$inferSelect
export type NewToolCall = typeof toolCalls.$inferInsert

export type ToolResult = typeof toolResults.$inferSelect
export type NewToolResult = typeof toolResults.$inferInsert

export type Provider = typeof providers.$inferSelect
export type NewProvider = typeof providers.$inferInsert

export type Model = typeof models.$inferSelect
export type NewModel = typeof models.$inferInsert

export type Setting = typeof settings.$inferSelect
export type NewSetting = typeof settings.$inferInsert

export type Attachment = typeof attachments.$inferSelect
export type NewAttachment = typeof attachments.$inferInsert

// 9. MCP Servers table
export const mcpServers = sqliteTable('mcp_servers', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  command: text('command').notNull(),
  args: text('args', { mode: 'json' }).$type<string[]>(),
  env: text('env', { mode: 'json' }).$type<Record<string, string>>(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export type MCPServer = typeof mcpServers.$inferSelect
export type NewMCPServer = typeof mcpServers.$inferInsert

// 10. Skills Directories table
export const skillsDirectories = sqliteTable('skills_directories', {
  id: text('id').primaryKey(),
  path: text('path').notNull().unique(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export type SkillsDirectory = typeof skillsDirectories.$inferSelect
export type NewSkillsDirectory = typeof skillsDirectories.$inferInsert

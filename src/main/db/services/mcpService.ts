import { eq } from 'drizzle-orm'
import { getDatabase, schema } from '../index'
import type { NewMCPServer } from '../schema'
import { generateId } from '../utils/idGenerator'

const { mcpServers } = schema

export class MCPService {
  // Get all MCP servers
  static async getAll() {
    const db = getDatabase()
    return await db.select().from(mcpServers)
  }

  // Get enabled MCP servers only
  static async getEnabled() {
    const db = getDatabase()
    return await db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.enabled, true))
  }

  // Get MCP server by ID
  static async getById(id: string) {
    const db = getDatabase()
    const result = await db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.id, id))
      .limit(1)
    return result[0] || null
  }

  // Get MCP server by name
  static async getByName(name: string) {
    const db = getDatabase()
    const result = await db
      .select()
      .from(mcpServers)
      .where(eq(mcpServers.name, name))
      .limit(1)
    return result[0] || null
  }

  // Create a new MCP server
  static async create(data: Omit<NewMCPServer, 'id' | 'createdAt'>) {
    const db = getDatabase()
    const id = generateId()

    await db.insert(mcpServers).values({
      id,
      ...data,
    })

    return await this.getById(id)
  }

  // Update an MCP server
  static async update(
    id: string,
    data: Partial<Omit<NewMCPServer, 'id' | 'createdAt'>>
  ) {
    const db = getDatabase()
    await db.update(mcpServers).set(data).where(eq(mcpServers.id, id))
    return await this.getById(id)
  }

  // Delete an MCP server
  static async delete(id: string) {
    const db = getDatabase()
    await db.delete(mcpServers).where(eq(mcpServers.id, id))
  }

  // Toggle enabled status
  static async toggleEnabled(id: string) {
    const server = await this.getById(id)
    if (!server) return null

    return await this.update(id, { enabled: !server.enabled })
  }
}

import { eq, desc } from 'drizzle-orm'
import { getDatabase, schema } from '../index'
import type { NewPromptPreset } from '../schema'
import { generateId } from '../utils/idGenerator'

const { promptPresets } = schema

export class PromptPresetService {
  // Get all presets
  static async getAll() {
    const db = getDatabase()
    return db
      .select()
      .from(promptPresets)
      .orderBy(desc(promptPresets.updatedAt))
  }

  // Get preset by ID
  static async getById(id: string) {
    const db = getDatabase()
    const result = await db
      .select()
      .from(promptPresets)
      .where(eq(promptPresets.id, id))
      .limit(1)
    return result[0] || null
  }

  // Create new preset
  static async create(data: { name: string; content: string }) {
    const db = getDatabase()
    const now = new Date()

    const newPreset: NewPromptPreset = {
      id: generateId(),
      name: data.name,
      content: data.content,
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(promptPresets).values(newPreset)
    return newPreset
  }

  // Update preset
  static async update(id: string, data: { name?: string; content?: string }) {
    const db = getDatabase()

    await db
      .update(promptPresets)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(promptPresets.id, id))

    return this.getById(id)
  }

  // Delete preset
  static async delete(id: string) {
    const db = getDatabase()
    await db.delete(promptPresets).where(eq(promptPresets.id, id))
  }
}

import { eq, and } from 'drizzle-orm'
import { getDatabase, schema } from '../index'
import type { NewModel } from '../schema'
import { generateId } from '../utils/idGenerator'
import { getDefaultContextLength } from '../../../shared/constants/modelDefaults'

const { models } = schema

export class ModelService {
  // Get all models
  static async getAll() {
    const db = getDatabase()
    return db.select().from(models)
  }

  // Get enabled models only
  static async getEnabled() {
    const db = getDatabase()
    return db.select().from(models).where(eq(models.enabled, true))
  }

  // Get models by provider ID
  static async getByProviderId(providerId: string) {
    const db = getDatabase()
    return db.select().from(models).where(eq(models.providerId, providerId))
  }

  // Get enabled models by provider ID
  static async getEnabledByProviderId(providerId: string) {
    const db = getDatabase()
    return db
      .select()
      .from(models)
      .where(and(eq(models.providerId, providerId), eq(models.enabled, true)))
  }

  // Get model by ID
  static async getById(id: string) {
    const db = getDatabase()
    const result = await db.select().from(models).where(eq(models.id, id)).limit(1)
    return result[0] || null
  }

  // Get custom models
  static async getCustomModels() {
    const db = getDatabase()
    return db.select().from(models).where(eq(models.isCustom, true))
  }

  // Create model
  static async create(data: Omit<NewModel, 'id'>) {
    const db = getDatabase()

    const newModel: NewModel = {
      id: generateId(),
      providerId: data.providerId,
      modelId: data.modelId,
      name: data.name,
      contextLength: data.contextLength ?? getDefaultContextLength(data.modelId),
      isCustom: data.isCustom || false,
      enabled: data.enabled ?? true,
    }

    await db.insert(models).values(newModel)
    return newModel
  }

  // Create multiple models
  static async createMany(modelList: Omit<NewModel, 'id'>[]) {
    const db = getDatabase()

    const newModels: NewModel[] = modelList.map((data) => ({
      id: generateId(),
      providerId: data.providerId,
      modelId: data.modelId,
      name: data.name,
      contextLength: data.contextLength ?? getDefaultContextLength(data.modelId),
      isCustom: data.isCustom || false,
      enabled: data.enabled ?? true,
    }))

    await db.insert(models).values(newModels)
    return newModels
  }

  // Update model
  static async update(id: string, data: Partial<Omit<NewModel, 'id'>>) {
    const db = getDatabase()
    await db.update(models).set(data).where(eq(models.id, id))
    return this.getById(id)
  }

  // Delete model
  static async delete(id: string) {
    const db = getDatabase()
    await db.delete(models).where(eq(models.id, id))
  }

  // Delete models by provider ID
  static async deleteByProviderId(providerId: string) {
    const db = getDatabase()
    await db.delete(models).where(eq(models.providerId, providerId))
  }

  // Toggle model enabled status
  static async toggleEnabled(id: string) {
    const db = getDatabase()
    const model = await this.getById(id)

    if (!model) return null

    const currentEnabled = !!model.enabled
    await db
      .update(models)
      .set({ enabled: !currentEnabled })
      .where(eq(models.id, id))

    return this.getById(id)
  }

  // Batch enable/disable models
  static async setEnabledBatch(ids: string[], enabled: boolean) {
    const db = getDatabase()

    await Promise.all(
      ids.map((id) => db.update(models).set({ enabled }).where(eq(models.id, id)))
    )
  }
}

import { eq } from 'drizzle-orm'
import { getDatabase, schema } from '../index'
import type { NewProvider } from '../schema'
import { generateId } from '../utils/idGenerator'
import crypto from 'crypto'

const { providers } = schema

// Simple encryption for API keys (in production, use proper key management)
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ||
  'muse-default-encryption-key-change-me-in-production'
const ALGORITHM = 'aes-256-cbc'

function encrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const parts = text.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export class ProviderService {
  // Get all providers
  static async getAll() {
    const db = getDatabase()
    const allProviders = await db.select().from(providers)

    // Decrypt API keys
    return allProviders.map(provider => ({
      ...provider,
      apiKey: decrypt(provider.apiKey),
    }))
  }

  // Get enabled providers only
  static async getEnabled() {
    const db = getDatabase()
    const enabledProviders = await db
      .select()
      .from(providers)
      .where(eq(providers.enabled, true))

    return enabledProviders.map(provider => ({
      ...provider,
      apiKey: decrypt(provider.apiKey),
    }))
  }

  // Get provider by ID
  static async getById(id: string) {
    const db = getDatabase()
    const result = await db
      .select()
      .from(providers)
      .where(eq(providers.id, id))
      .limit(1)

    if (!result[0]) return null

    return {
      ...result[0],
      apiKey: decrypt(result[0].apiKey),
    }
  }

  // Get provider by name
  static async getByName(name: string) {
    const db = getDatabase()
    const result = await db
      .select()
      .from(providers)
      .where(eq(providers.name, name))
      .limit(1)

    if (!result[0]) return null

    return {
      ...result[0],
      apiKey: decrypt(result[0].apiKey),
    }
  }

  // Create provider
  static async create(data: Omit<NewProvider, 'id' | 'createdAt'>) {
    const db = getDatabase()

    const newProvider: NewProvider = {
      id: generateId(),
      name: data.name,
      type: data.type,
      apiKey: encrypt(data.apiKey), // Encrypt API key
      baseURL: data.baseURL || null,
      apiFormat: data.apiFormat || 'chat-completions',
      enabled: data.enabled ?? true,
      createdAt: new Date(),
    }

    await db.insert(providers).values(newProvider)

    return {
      ...newProvider,
      apiKey: data.apiKey, // Return unencrypted
      apiFormat: data.apiFormat || 'chat-completions',
    }
  }

  // Update provider
  static async update(
    id: string,
    data: Partial<Omit<NewProvider, 'id' | 'createdAt'>>
  ) {
    const db = getDatabase()

    const updateData: any = { ...data }

    // Encrypt API key if provided
    if (data.apiKey) {
      updateData.apiKey = encrypt(data.apiKey)
    }

    await db.update(providers).set(updateData).where(eq(providers.id, id))

    return this.getById(id)
  }

  // Delete provider (cascade deletes models)
  static async delete(id: string) {
    const db = getDatabase()
    await db.delete(providers).where(eq(providers.id, id))
  }

  // Toggle provider enabled status
  static async toggleEnabled(id: string) {
    const db = getDatabase()
    const provider = await this.getById(id)

    if (!provider) return null

    await db
      .update(providers)
      .set({ enabled: !provider.enabled })
      .where(eq(providers.id, id))

    return this.getById(id)
  }
}

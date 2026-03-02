import { eq } from 'drizzle-orm'
import { getDatabase, schema } from '../index'
import type { NewSetting } from '../schema'

const { settings } = schema
type SettingValue = NewSetting['value']

export class SettingsService {
  // Get all settings
  static async getAll() {
    const db = getDatabase()
    const allSettings = await db.select().from(settings)

    // Convert to key-value object
    const settingsObject: Record<string, SettingValue> = {}
    allSettings.forEach(setting => {
      settingsObject[setting.key] = setting.value
    })

    return settingsObject
  }

  // Get setting by key
  static async get(key: string) {
    const db = getDatabase()
    const result = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1)

    if (!result[0]) return null

    return result[0].value
  }

  // Set setting
  static async set(key: string, value: SettingValue) {
    const db = getDatabase()

    const newSetting: NewSetting = {
      key,
      value,
    }

    // Use INSERT OR REPLACE for upsert
    await db.insert(settings).values(newSetting).onConflictDoUpdate({
      target: settings.key,
      set: { value },
    })

    return this.get(key)
  }

  // Delete setting
  static async delete(key: string) {
    const db = getDatabase()
    await db.delete(settings).where(eq(settings.key, key))
  }

  // Set multiple settings
  static async setMany(settingsObject: Record<string, SettingValue>) {
    const settingsArray: NewSetting[] = Object.entries(settingsObject).map(
      ([key, value]) => ({
        key,
        value,
      })
    )

    for (const setting of settingsArray) {
      await this.set(setting.key, setting.value)
    }
  }

  // Clear all settings
  static async clear() {
    const db = getDatabase()
    await db.delete(settings)
  }
}

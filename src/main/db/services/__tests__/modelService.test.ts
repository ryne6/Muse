import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createTestDatabase, clearDatabase } from '../../../../../tests/setup/test-db'
import type { Database } from 'better-sqlite3'
import * as schema from '../../schema'

// Use vi.hoisted to ensure mock is set up before imports
const { getTestDb, setTestDb } = vi.hoisted(() => {
  let testDb: any = null
  return {
    getTestDb: () => testDb,
    setTestDb: (db: any) => {
      testDb = db
    }
  }
})

// Mock the database module with hoisted functions
// Note: ModelService imports from '../index' which resolves to 'src/main/db/index'
// From this test file, that's '../../index'
vi.mock('../../index', async () => {
  const actualSchema = await vi.importActual<typeof import('../../schema')>('../../schema')
  return {
    getDatabase: () => {
      const db = getTestDb()
      if (!db) {
        throw new Error('Test database not initialized')
      }
      return db
    },
    schema: actualSchema
  }
})

// Import ModelService after mocking
import { ModelService } from '../modelService'

/**
 * ModelService 单元测试
 */

describe('ModelService', () => {
  let testDb: { db: any; sqlite: Database; cleanup: () => void }
  let testProviderId: string
  let testProviderId2: string

  // 辅助函数：创建测试 provider
  async function createTestProvider(name: string) {
    const providerId = 'test-provider-' + Date.now() + '-' + Math.random()
    await testDb.sqlite.exec(`
      INSERT INTO providers (id, name, type, api_key, enabled)
      VALUES ('${providerId}', '${name}', 'openai', 'test-key', 1)
    `)
    return providerId
  }

  beforeEach(async () => {
    // 创建测试数据库
    testDb = createTestDatabase()

    // 设置测试数据库到 hoisted mock
    setTestDb(testDb.db)

    // 创建测试 providers
    testProviderId = await createTestProvider('Test Provider 1')
    testProviderId2 = await createTestProvider('Test Provider 2')
  })

  afterEach(() => {
    // 清理数据库
    if (testDb?.sqlite) {
      clearDatabase(testDb.sqlite)
      testDb.cleanup()
    }
  })

  describe('create', () => {
    it('should create a model with all fields', async () => {
      const modelData = {
        providerId: testProviderId,
        modelId: 'gpt-4',
        name: 'GPT-4',
        contextLength: 8000,
        isCustom: false,
        enabled: true
      }

      const result = await ModelService.create(modelData)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.providerId).toBe(modelData.providerId)
      expect(result.modelId).toBe(modelData.modelId)
      expect(result.name).toBe(modelData.name)
      expect(result.contextLength).toBe(modelData.contextLength)
      expect(result.isCustom).toBe(false)
      expect(result.enabled).toBe(true)
    })

    it('should create a model with default values', async () => {
      const modelData = {
        providerId: testProviderId,
        modelId: 'gpt-3.5',
        name: 'GPT-3.5'
      }

      const result = await ModelService.create(modelData)

      expect(result.id).toBeDefined()
      expect(result.contextLength).toBeNull()
      expect(result.isCustom).toBe(false)
      expect(result.enabled).toBe(true)
    })

    it('should create a custom model', async () => {
      const modelData = {
        providerId: testProviderId,
        modelId: 'custom-model',
        name: 'Custom Model',
        isCustom: true
      }

      const result = await ModelService.create(modelData)

      expect(result.isCustom).toBe(true)
    })
  })

  describe('getAll', () => {
    it('should return empty array when no models exist', async () => {
      const result = await ModelService.getAll()
      expect(result).toEqual([])
    })

    it('should return all models', async () => {
      // 创建测试数据
      await ModelService.create({
        providerId: testProviderId,
        modelId: 'model-1',
        name: 'Model 1'
      })
      await ModelService.create({
        providerId: testProviderId2,
        modelId: 'model-2',
        name: 'Model 2'
      })

      const result = await ModelService.getAll()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Model 1')
      expect(result[1].name).toBe('Model 2')
    })
  })

  describe('getEnabled', () => {
    it('should return only enabled models', async () => {
      await ModelService.create({
        providerId: testProviderId,
        modelId: 'model-1',
        name: 'Enabled Model',
        enabled: true
      })
      await ModelService.create({
        providerId: testProviderId2,
        modelId: 'model-2',
        name: 'Disabled Model',
        enabled: false
      })

      const result = await ModelService.getEnabled()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Enabled Model')
      expect(result[0].enabled).toBe(true)
    })
  })

  describe('getByProviderId', () => {
    it('should return models for specific provider', async () => {
      await ModelService.create({
        providerId: testProviderId,
        modelId: 'model-1',
        name: 'Provider 1 Model'
      })
      await ModelService.create({
        providerId: testProviderId2,
        modelId: 'model-2',
        name: 'Provider 2 Model'
      })

      const result = await ModelService.getByProviderId(testProviderId)

      expect(result).toHaveLength(1)
      expect(result[0].providerId).toBe(testProviderId)
    })

    it('should return empty array for non-existent provider', async () => {
      const result = await ModelService.getByProviderId('non-existent')
      expect(result).toEqual([])
    })
  })

  describe('getById', () => {
    it('should return model by id', async () => {
      const created = await ModelService.create({
        providerId: testProviderId,
        modelId: 'model-1',
        name: 'Test Model'
      })

      const result = await ModelService.getById(created.id)

      expect(result).toBeDefined()
      expect(result?.id).toBe(created.id)
      expect(result?.name).toBe('Test Model')
    })

    it('should return null for non-existent id', async () => {
      const result = await ModelService.getById('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('createMany', () => {
    it('should create multiple models at once', async () => {
      const modelsData = [
        {
          providerId: testProviderId,
          modelId: 'model-1',
          name: 'Model 1'
        },
        {
          providerId: testProviderId,
          modelId: 'model-2',
          name: 'Model 2'
        },
        {
          providerId: testProviderId2,
          modelId: 'model-3',
          name: 'Model 3'
        }
      ]

      const result = await ModelService.createMany(modelsData)

      expect(result).toHaveLength(3)
      expect(result[0].name).toBe('Model 1')
      expect(result[1].name).toBe('Model 2')
      expect(result[2].name).toBe('Model 3')

      // 验证数据库中确实有3个模型
      const allModels = await ModelService.getAll()
      expect(allModels).toHaveLength(3)
    })
  })

  describe('update', () => {
    it('should update model fields', async () => {
      const created = await ModelService.create({
        providerId: testProviderId,
        modelId: 'model-1',
        name: 'Original Name',
        enabled: true
      })

      const updated = await ModelService.update(created.id, {
        name: 'Updated Name',
        enabled: false
      })

      expect(updated?.name).toBe('Updated Name')
      expect(updated?.enabled).toBe(false)
    })
  })

  describe('delete', () => {
    it('should delete a model', async () => {
      const created = await ModelService.create({
        providerId: testProviderId,
        modelId: 'model-1',
        name: 'To Delete'
      })

      await ModelService.delete(created.id)

      const result = await ModelService.getById(created.id)
      expect(result).toBeNull()
    })
  })

  describe('deleteByProviderId', () => {
    it('should delete all models for a provider', async () => {
      await ModelService.create({
        providerId: testProviderId,
        modelId: 'model-1',
        name: 'Provider 1 Model 1'
      })
      await ModelService.create({
        providerId: testProviderId,
        modelId: 'model-2',
        name: 'Provider 1 Model 2'
      })
      await ModelService.create({
        providerId: testProviderId2,
        modelId: 'model-3',
        name: 'Provider 2 Model'
      })

      await ModelService.deleteByProviderId(testProviderId)

      const provider1Models = await ModelService.getByProviderId(testProviderId)
      const provider2Models = await ModelService.getByProviderId(testProviderId2)

      expect(provider1Models).toHaveLength(0)
      expect(provider2Models).toHaveLength(1)
    })
  })

  describe('toggleEnabled', () => {
    it('should toggle model enabled status', async () => {
      const created = await ModelService.create({
        providerId: testProviderId,
        modelId: 'model-1',
        name: 'Test Model',
        enabled: true
      })

      const toggled = await ModelService.toggleEnabled(created.id)
      expect(toggled?.enabled).toBe(false)

      const toggledAgain = await ModelService.toggleEnabled(created.id)
      expect(toggledAgain?.enabled).toBe(true)
    })

    it('should return null for non-existent id', async () => {
      const result = await ModelService.toggleEnabled('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('setEnabledBatch', () => {
    it('should enable multiple models at once', async () => {
      const model1 = await ModelService.create({
        providerId: testProviderId,
        modelId: 'model-1',
        name: 'Model 1',
        enabled: false
      })
      const model2 = await ModelService.create({
        providerId: testProviderId,
        modelId: 'model-2',
        name: 'Model 2',
        enabled: false
      })

      await ModelService.setEnabledBatch([model1.id, model2.id], true)

      const updated1 = await ModelService.getById(model1.id)
      const updated2 = await ModelService.getById(model2.id)

      expect(updated1?.enabled).toBe(true)
      expect(updated2?.enabled).toBe(true)
    })
  })

  describe('getCustomModels', () => {
    it('should return only custom models', async () => {
      await ModelService.create({
        providerId: testProviderId,
        modelId: 'model-1',
        name: 'Standard Model',
        isCustom: false
      })
      await ModelService.create({
        providerId: testProviderId2,
        modelId: 'model-2',
        name: 'Custom Model',
        isCustom: true
      })

      const result = await ModelService.getCustomModels()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Custom Model')
      expect(result[0].isCustom).toBe(true)
    })
  })

  describe('getEnabledByProviderId', () => {
    it('should return only enabled models for specific provider', async () => {
      await ModelService.create({
        providerId: testProviderId,
        modelId: 'model-1',
        name: 'Enabled Model',
        enabled: true
      })
      await ModelService.create({
        providerId: testProviderId,
        modelId: 'model-2',
        name: 'Disabled Model',
        enabled: false
      })
      await ModelService.create({
        providerId: testProviderId2,
        modelId: 'model-3',
        name: 'Other Provider Model',
        enabled: true
      })

      const result = await ModelService.getEnabledByProviderId(testProviderId)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Enabled Model')
      expect(result[0].providerId).toBe(testProviderId)
      expect(result[0].enabled).toBe(true)
    })
  })
})

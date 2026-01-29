import { describe, it, expect, beforeEach, vi } from 'vitest'

// Use vi.hoisted to define mock before vi.mock hoisting
const mockDbClient = vi.hoisted(() => ({
  providers: {
    getAll: vi.fn()
  },
  models: {
    getAll: vi.fn()
  }
}))

vi.mock('../../services/dbClient', () => ({
  dbClient: mockDbClient
}))

import { useSettingsStoreV2 } from '../settingsStoreV2'

describe('SettingsStoreV2', () => {
  const mockProviders = [
    { id: 'p1', name: 'OpenAI', type: 'openai', enabled: true, apiKey: 'key1' },
    { id: 'p2', name: 'Claude', type: 'claude', enabled: false, apiKey: 'key2' }
  ]

  const mockModels = [
    { id: 'm1', name: 'GPT-4', providerId: 'p1', enabled: true },
    { id: 'm2', name: 'GPT-3.5', providerId: 'p1', enabled: true },
    { id: 'm3', name: 'Claude-3', providerId: 'p2', enabled: true }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useSettingsStoreV2.setState({
      currentProviderId: null,
      currentModelId: null,
      temperature: 1,
      providers: [],
      models: []
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useSettingsStoreV2.getState()
      expect(state.currentProviderId).toBeNull()
      expect(state.currentModelId).toBeNull()
      expect(state.temperature).toBe(1)
      expect(state.providers).toEqual([])
      expect(state.models).toEqual([])
    })
  })

  describe('loadData', () => {
    it('should load providers and models from database', async () => {
      mockDbClient.providers.getAll.mockResolvedValue(mockProviders)
      mockDbClient.models.getAll.mockResolvedValue(mockModels)

      await useSettingsStoreV2.getState().loadData()

      const state = useSettingsStoreV2.getState()
      expect(state.providers).toEqual(mockProviders)
      expect(state.models).toEqual(mockModels)
    })

    it('should auto-select first enabled provider and model', async () => {
      mockDbClient.providers.getAll.mockResolvedValue(mockProviders)
      mockDbClient.models.getAll.mockResolvedValue(mockModels)

      await useSettingsStoreV2.getState().loadData()

      const state = useSettingsStoreV2.getState()
      expect(state.currentProviderId).toBe('p1')
      expect(state.currentModelId).toBe('m1')
    })

    it('should not auto-select if provider already selected', async () => {
      useSettingsStoreV2.setState({ currentProviderId: 'existing' })
      mockDbClient.providers.getAll.mockResolvedValue(mockProviders)
      mockDbClient.models.getAll.mockResolvedValue(mockModels)

      await useSettingsStoreV2.getState().loadData()

      expect(useSettingsStoreV2.getState().currentProviderId).toBe('existing')
    })

    it('should handle load error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockDbClient.providers.getAll.mockRejectedValue(new Error('DB error'))

      await useSettingsStoreV2.getState().loadData()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('setCurrentProvider', () => {
    beforeEach(() => {
      useSettingsStoreV2.setState({
        providers: mockProviders,
        models: mockModels
      })
    })

    it('should set current provider and auto-select first model', async () => {
      await useSettingsStoreV2.getState().setCurrentProvider('p1')

      const state = useSettingsStoreV2.getState()
      expect(state.currentProviderId).toBe('p1')
      expect(state.currentModelId).toBe('m1')
    })

    it('should not change state if provider not found', async () => {
      await useSettingsStoreV2.getState().setCurrentProvider('invalid')

      expect(useSettingsStoreV2.getState().currentProviderId).toBeNull()
    })
  })

  describe('setCurrentModel', () => {
    beforeEach(() => {
      useSettingsStoreV2.setState({
        providers: mockProviders,
        models: mockModels
      })
    })

    it('should set current model and update provider', async () => {
      await useSettingsStoreV2.getState().setCurrentModel('m3')

      const state = useSettingsStoreV2.getState()
      expect(state.currentModelId).toBe('m3')
      expect(state.currentProviderId).toBe('p2')
    })

    it('should not change state if model not found', async () => {
      await useSettingsStoreV2.getState().setCurrentModel('invalid')

      expect(useSettingsStoreV2.getState().currentModelId).toBeNull()
    })
  })

  describe('setTemperature', () => {
    it('should set temperature', () => {
      useSettingsStoreV2.getState().setTemperature(0.7)

      expect(useSettingsStoreV2.getState().temperature).toBe(0.7)
    })
  })

  describe('getCurrentProvider', () => {
    it('should return current provider', () => {
      useSettingsStoreV2.setState({
        providers: mockProviders,
        currentProviderId: 'p1'
      })

      const result = useSettingsStoreV2.getState().getCurrentProvider()

      expect(result?.id).toBe('p1')
    })

    it('should return null if no current provider', () => {
      const result = useSettingsStoreV2.getState().getCurrentProvider()

      expect(result).toBeNull()
    })
  })

  describe('getCurrentModel', () => {
    it('should return current model', () => {
      useSettingsStoreV2.setState({
        models: mockModels,
        currentModelId: 'm1'
      })

      const result = useSettingsStoreV2.getState().getCurrentModel()

      expect(result?.id).toBe('m1')
    })

    it('should return null if no current model', () => {
      const result = useSettingsStoreV2.getState().getCurrentModel()

      expect(result).toBeNull()
    })
  })

  describe('getEnabledProviders', () => {
    it('should return only enabled providers', () => {
      useSettingsStoreV2.setState({ providers: mockProviders })

      const result = useSettingsStoreV2.getState().getEnabledProviders()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p1')
    })
  })

  describe('getModelsForProvider', () => {
    it('should return models for specific provider', () => {
      useSettingsStoreV2.setState({ models: mockModels })

      const result = useSettingsStoreV2.getState().getModelsForProvider('p1')

      expect(result).toHaveLength(2)
    })
  })

  describe('getEnabledModels', () => {
    it('should return only enabled models from enabled providers', () => {
      useSettingsStoreV2.setState({
        providers: mockProviders,
        models: mockModels
      })

      const result = useSettingsStoreV2.getState().getEnabledModels()

      // Only models from enabled provider p1
      expect(result).toHaveLength(2)
      expect(result.every(m => m.providerId === 'p1')).toBe(true)
    })
  })

  describe('triggerRefresh', () => {
    it('should bump lastUpdated when triggerRefresh is called', () => {
      const prev = useSettingsStoreV2.getState().lastUpdated
      useSettingsStoreV2.getState().triggerRefresh()
      expect(useSettingsStoreV2.getState().lastUpdated).toBeGreaterThan(prev)
    })
  })
})

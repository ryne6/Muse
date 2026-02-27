import { describe, it, expect, beforeEach, vi } from 'vitest'

// Use vi.hoisted to define mock before vi.mock hoisting
const mockDbClient = vi.hoisted(() => ({
  providers: {
    getAll: vi.fn(),
  },
  models: {
    getAll: vi.fn(),
  },
}))

vi.mock('../../services/dbClient', () => ({
  dbClient: mockDbClient,
}))

import { useSettingsStore } from '../settingsStore'

describe('SettingsStore', () => {
  const mockProviders = [
    { id: 'p1', name: 'OpenAI', type: 'openai', enabled: true, apiKey: 'key1' },
    {
      id: 'p2',
      name: 'Claude',
      type: 'claude',
      enabled: false,
      apiKey: 'key2',
    },
  ]

  const mockModels = [
    { id: 'm1', name: 'GPT-4', providerId: 'p1', enabled: true },
    { id: 'm2', name: 'GPT-3.5', providerId: 'p1', enabled: true },
    { id: 'm3', name: 'Claude-3', providerId: 'p2', enabled: true },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // Reset store state
    useSettingsStore.setState({
      currentProviderId: null,
      currentModelId: null,
      temperature: 1,
      providers: [],
      models: [],
    })
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useSettingsStore.getState()
      expect(state.currentProviderId).toBeNull()
      expect(state.currentModelId).toBeNull()
      expect(state.temperature).toBe(1)
      expect(state.providers).toEqual([])
      expect(state.models).toEqual([])
    })
  })

  describe('persistence migration', () => {
    it('should load legacy muse-settings-v2 data when crow-settings is missing', async () => {
      const legacyState = {
        state: {
          currentProviderId: 'p1',
          currentModelId: 'm1',
          temperature: 0.42,
        },
        version: 0,
      }

      localStorage.setItem('muse-settings-v2', JSON.stringify(legacyState))
      localStorage.removeItem('muse-settings')

      vi.resetModules()
      const { useSettingsStore: migratedStore } =
        await import('../settingsStore')

      expect(migratedStore.getState().currentProviderId).toBe('p1')
      expect(migratedStore.getState().currentModelId).toBe('m1')
      expect(migratedStore.getState().temperature).toBe(0.42)

      localStorage.clear()
    })
  })

  describe('loadData', () => {
    it('should load providers and models from database', async () => {
      mockDbClient.providers.getAll.mockResolvedValue(mockProviders)
      mockDbClient.models.getAll.mockResolvedValue(mockModels)

      await useSettingsStore.getState().loadData()

      const state = useSettingsStore.getState()
      expect(state.providers).toEqual(mockProviders)
      expect(state.models).toEqual(mockModels)
    })

    it('should auto-select first enabled provider and model', async () => {
      mockDbClient.providers.getAll.mockResolvedValue(mockProviders)
      mockDbClient.models.getAll.mockResolvedValue(mockModels)

      await useSettingsStore.getState().loadData()

      const state = useSettingsStore.getState()
      expect(state.currentProviderId).toBe('p1')
      expect(state.currentModelId).toBe('m1')
    })

    it('should not auto-select if provider already selected', async () => {
      useSettingsStore.setState({ currentProviderId: 'existing' })
      mockDbClient.providers.getAll.mockResolvedValue(mockProviders)
      mockDbClient.models.getAll.mockResolvedValue(mockModels)

      await useSettingsStore.getState().loadData()

      expect(useSettingsStore.getState().currentProviderId).toBe('existing')
    })

    it('should handle load error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockDbClient.providers.getAll.mockRejectedValue(new Error('DB error'))

      await useSettingsStore.getState().loadData()

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('setCurrentProvider', () => {
    beforeEach(() => {
      useSettingsStore.setState({
        providers: mockProviders,
        models: mockModels,
      })
    })

    it('should set current provider and auto-select first model', async () => {
      await useSettingsStore.getState().setCurrentProvider('p1')

      const state = useSettingsStore.getState()
      expect(state.currentProviderId).toBe('p1')
      expect(state.currentModelId).toBe('m1')
    })

    it('should not change state if provider not found', async () => {
      await useSettingsStore.getState().setCurrentProvider('invalid')

      expect(useSettingsStore.getState().currentProviderId).toBeNull()
    })
  })

  describe('setCurrentModel', () => {
    beforeEach(() => {
      useSettingsStore.setState({
        providers: mockProviders,
        models: mockModels,
      })
    })

    it('should set current model and update provider', async () => {
      await useSettingsStore.getState().setCurrentModel('m3')

      const state = useSettingsStore.getState()
      expect(state.currentModelId).toBe('m3')
      expect(state.currentProviderId).toBe('p2')
    })

    it('should not change state if model not found', async () => {
      await useSettingsStore.getState().setCurrentModel('invalid')

      expect(useSettingsStore.getState().currentModelId).toBeNull()
    })
  })

  describe('setTemperature', () => {
    it('should set temperature', () => {
      useSettingsStore.getState().setTemperature(0.7)

      expect(useSettingsStore.getState().temperature).toBe(0.7)
    })
  })

  describe('tool permissions', () => {
    it('should set and read allowAll per workspace', () => {
      useSettingsStore.setState({ toolPermissionsByWorkspace: {} as any })

      useSettingsStore.getState().setToolAllowAll('/repo', true)

      const permissions = useSettingsStore
        .getState()
        .getToolPermissions('/repo')
      expect(permissions.allowAll).toBe(true)
    })
  })

  describe('getCurrentProvider', () => {
    it('should return current provider', () => {
      useSettingsStore.setState({
        providers: mockProviders,
        currentProviderId: 'p1',
      })

      const result = useSettingsStore.getState().getCurrentProvider()

      expect(result?.id).toBe('p1')
    })

    it('should return null if no current provider', () => {
      const result = useSettingsStore.getState().getCurrentProvider()

      expect(result).toBeNull()
    })
  })

  describe('getCurrentModel', () => {
    it('should return current model', () => {
      useSettingsStore.setState({
        models: mockModels,
        currentModelId: 'm1',
      })

      const result = useSettingsStore.getState().getCurrentModel()

      expect(result?.id).toBe('m1')
    })

    it('should return null if no current model', () => {
      const result = useSettingsStore.getState().getCurrentModel()

      expect(result).toBeNull()
    })
  })

  describe('getEnabledProviders', () => {
    it('should return only enabled providers', () => {
      useSettingsStore.setState({ providers: mockProviders })

      const result = useSettingsStore.getState().getEnabledProviders()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p1')
    })
  })

  describe('getModelsForProvider', () => {
    it('should return models for specific provider', () => {
      useSettingsStore.setState({ models: mockModels })

      const result = useSettingsStore.getState().getModelsForProvider('p1')

      expect(result).toHaveLength(2)
    })
  })

  describe('getEnabledModels', () => {
    it('should return only enabled models from enabled providers', () => {
      useSettingsStore.setState({
        providers: mockProviders,
        models: mockModels,
      })

      const result = useSettingsStore.getState().getEnabledModels()

      // Only models from enabled provider p1
      expect(result).toHaveLength(2)
      expect(result.every(m => m.providerId === 'p1')).toBe(true)
    })
  })

  describe('triggerRefresh', () => {
    it('should bump lastUpdated when triggerRefresh is called', () => {
      const prev = useSettingsStore.getState().lastUpdated
      useSettingsStore.getState().triggerRefresh()
      expect(useSettingsStore.getState().lastUpdated).toBeGreaterThan(prev)
    })
  })

  describe('globalSystemPrompt', () => {
    it('should have empty string as initial value', () => {
      useSettingsStore.setState({ globalSystemPrompt: '' })
      const state = useSettingsStore.getState()
      expect(state.globalSystemPrompt).toBe('')
    })

    it('should set global system prompt', () => {
      useSettingsStore
        .getState()
        .setGlobalSystemPrompt('You are a helpful assistant.')

      expect(useSettingsStore.getState().globalSystemPrompt).toBe(
        'You are a helpful assistant.'
      )
    })

    it('should update existing global system prompt', () => {
      useSettingsStore.getState().setGlobalSystemPrompt('First prompt')
      useSettingsStore.getState().setGlobalSystemPrompt('Second prompt')

      expect(useSettingsStore.getState().globalSystemPrompt).toBe(
        'Second prompt'
      )
    })

    it('should clear global system prompt when set to empty string', () => {
      useSettingsStore.getState().setGlobalSystemPrompt('Some prompt')
      useSettingsStore.getState().setGlobalSystemPrompt('')

      expect(useSettingsStore.getState().globalSystemPrompt).toBe('')
    })
  })
})

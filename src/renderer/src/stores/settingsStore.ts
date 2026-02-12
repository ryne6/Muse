import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { dbClient } from '../services/dbClient'
import { notify } from '../utils/notify'
import type { Provider, Model } from '@shared/types/db'

interface SettingsStore {
  // State
  currentProviderId: string | null
  currentModelId: string | null
  temperature: number
  thinkingEnabled: boolean
  isLoading: boolean
  error: string | null
  lastUpdated: number
  toolPermissionsByWorkspace: Record<string, { allowAll: boolean }>
  selectedSkill: string | null // null = Auto mode
  globalSystemPrompt: string
  memoryEnabled: boolean

  // Cached data
  providers: Provider[]
  models: Model[]

  // Actions
  loadData: () => Promise<void>
  setCurrentProvider: (providerId: string) => Promise<void>
  setCurrentModel: (modelId: string) => Promise<void>
  setTemperature: (temperature: number) => void
  setThinkingEnabled: (enabled: boolean) => void
  setToolAllowAll: (workspacePath: string, allowAll: boolean) => void
  setSelectedSkill: (skillPath: string | null) => void
  setGlobalSystemPrompt: (prompt: string) => void
  setMemoryEnabled: (enabled: boolean) => void
  clearError: () => void
  triggerRefresh: () => void

  // Computed
  getCurrentProvider: () => Provider | null
  getCurrentModel: () => Model | null
  getEnabledProviders: () => Provider[]
  getModelsForProvider: (providerId: string) => Model[]
  getEnabledModels: () => Model[]
  getToolPermissions: (workspacePath: string | null | undefined) => {
    allowAll: boolean
  }
}

const SETTINGS_STORAGE_KEY = 'muse-settings'
const LEGACY_SETTINGS_KEY = 'muse-settings-v2'

const legacyAwareStorage = {
  getItem: (name: string) => {
    if (typeof localStorage === 'undefined') return null
    const legacy = localStorage.getItem(LEGACY_SETTINGS_KEY)
    return legacy ?? localStorage.getItem(name)
  },
  setItem: (name: string, value: string) => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(name, value)
    localStorage.removeItem(LEGACY_SETTINGS_KEY)
  },
  removeItem: (name: string) => {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(name)
    localStorage.removeItem(LEGACY_SETTINGS_KEY)
  },
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // State
      currentProviderId: null,
      currentModelId: null,
      temperature: 1,
      thinkingEnabled: false,
      isLoading: false,
      error: null,
      lastUpdated: Date.now(),
      toolPermissionsByWorkspace: {},
      selectedSkill: null,
      globalSystemPrompt: '',
      memoryEnabled: false,

      // Cached data
      providers: [],
      models: [],

      // Actions
      clearError: () => set({ error: null }),
      loadData: async () => {
        set({ isLoading: true, error: null })
        try {
          const [providers, models] = await Promise.all([
            dbClient.providers.getAll(),
            dbClient.models.getAll(),
          ])

          set({ providers, models, isLoading: false })

          // Auto-select first enabled provider/model if none selected
          const state = get()
          if (!state.currentProviderId) {
            const firstProvider = providers.find((p: Provider) => p.enabled)
            if (firstProvider) {
              const firstModel = models.find(
                (m: Model) => m.providerId === firstProvider.id && m.enabled
              )
              if (firstModel) {
                set({
                  currentProviderId: firstProvider.id,
                  currentModelId: firstModel.id,
                })
              }
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to load settings'
          console.error('Failed to load settings data:', error)
          set({ isLoading: false, error: errorMessage })

          // Show error notification with retry option
          notify.errorWithRetry(
            'Failed to load settings. Please try again.',
            () => get().loadData()
          )
        }
      },

      setCurrentProvider: async (providerId: string) => {
        const state = get()
        const provider = state.providers.find(p => p.id === providerId)
        if (!provider) {
          notify.warning('Provider not found. Please refresh settings.')
          return
        }

        // Find first enabled model for this provider
        const firstModel = state.models.find(
          m => m.providerId === providerId && m.enabled
        )

        set({
          currentProviderId: providerId,
          currentModelId: firstModel?.id || null,
        })
      },

      setCurrentModel: async (modelId: string) => {
        const state = get()
        const model = state.models.find(m => m.id === modelId)
        if (!model) {
          notify.warning('Model not found. Please refresh settings.')
          return
        }

        set({
          currentModelId: modelId,
          currentProviderId: model.providerId,
        })
      },

      setTemperature: (temperature: number) => {
        set({ temperature })
      },
      setThinkingEnabled: (enabled: boolean) => {
        set({ thinkingEnabled: enabled })
      },
      setToolAllowAll: (workspacePath: string, allowAll: boolean) => {
        const key = workspacePath?.trim() || '__no_workspace__'
        set(state => ({
          toolPermissionsByWorkspace: {
            ...state.toolPermissionsByWorkspace,
            [key]: { allowAll },
          },
        }))
      },
      setSelectedSkill: (skillPath: string | null) => {
        set({ selectedSkill: skillPath })
      },
      setGlobalSystemPrompt: (prompt: string) => {
        set({ globalSystemPrompt: prompt })
      },
      setMemoryEnabled: (enabled: boolean) => {
        set({ memoryEnabled: enabled })
      },
      triggerRefresh: () => {
        set({ lastUpdated: Date.now() })
      },

      // Computed
      getCurrentProvider: () => {
        const state = get()
        if (!state.currentProviderId) return null
        return (
          state.providers.find(p => p.id === state.currentProviderId) || null
        )
      },

      getCurrentModel: () => {
        const state = get()
        if (!state.currentModelId) return null
        return state.models.find(m => m.id === state.currentModelId) || null
      },

      getEnabledProviders: () => {
        const state = get()
        return state.providers.filter(p => p.enabled)
      },

      getModelsForProvider: (providerId: string) => {
        const state = get()
        return state.models.filter(m => m.providerId === providerId)
      },

      getEnabledModels: () => {
        const state = get()
        const enabledProviderIds = state.providers
          .filter(p => p.enabled)
          .map(p => p.id)
        return state.models.filter(
          m => m.enabled && enabledProviderIds.includes(m.providerId)
        )
      },
      getToolPermissions: (workspacePath: string | null | undefined) => {
        const state = get()
        const key = workspacePath?.trim() || '__no_workspace__'
        return state.toolPermissionsByWorkspace[key] || { allowAll: false }
      },
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => legacyAwareStorage),
      // Only persist user preferences, not cached data
      partialize: state => ({
        currentProviderId: state.currentProviderId,
        currentModelId: state.currentModelId,
        temperature: state.temperature,
        thinkingEnabled: state.thinkingEnabled,
        toolPermissionsByWorkspace: state.toolPermissionsByWorkspace,
        selectedSkill: state.selectedSkill,
        globalSystemPrompt: state.globalSystemPrompt,
        memoryEnabled: state.memoryEnabled,
      }),
      migrate: persistedState => {
        const state =
          persistedState && typeof persistedState === 'object'
            ? (persistedState as Partial<SettingsStore>)
            : undefined
        return {
          currentProviderId: state?.currentProviderId ?? null,
          currentModelId: state?.currentModelId ?? null,
          temperature:
            typeof state?.temperature === 'number' ? state.temperature : 1,
          thinkingEnabled: state?.thinkingEnabled ?? false,
          toolPermissionsByWorkspace: state?.toolPermissionsByWorkspace ?? {},
          selectedSkill: state?.selectedSkill ?? null,
          globalSystemPrompt: state?.globalSystemPrompt ?? '',
          memoryEnabled: state?.memoryEnabled ?? false,
        }
      },
    }
  )
)

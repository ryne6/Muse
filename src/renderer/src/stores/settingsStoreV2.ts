import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { dbClient } from '../services/dbClient'
import { notify } from '../utils/notify'
import type { Provider, Model } from '@shared/types/db'

interface SettingsStoreV2 {
  // State
  currentProviderId: string | null
  currentModelId: string | null
  temperature: number
  isLoading: boolean
  error: string | null
  lastUpdated: number

  // Cached data
  providers: Provider[]
  models: Model[]

  // Actions
  loadData: () => Promise<void>
  setCurrentProvider: (providerId: string) => Promise<void>
  setCurrentModel: (modelId: string) => Promise<void>
  setTemperature: (temperature: number) => void
  clearError: () => void
  triggerRefresh: () => void

  // Computed
  getCurrentProvider: () => Provider | null
  getCurrentModel: () => Model | null
  getEnabledProviders: () => Provider[]
  getModelsForProvider: (providerId: string) => Model[]
  getEnabledModels: () => Model[]
}

export const useSettingsStoreV2 = create<SettingsStoreV2>()(
  persist(
    (set, get) => ({
      // State
      currentProviderId: null,
      currentModelId: null,
      temperature: 1,
      isLoading: false,
      error: null,
      lastUpdated: Date.now(),

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
          const errorMessage = error instanceof Error ? error.message : 'Failed to load settings'
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
        const provider = state.providers.find((p) => p.id === providerId)
        if (!provider) {
          notify.warning('Provider not found. Please refresh settings.')
          return
        }

        // Find first enabled model for this provider
        const firstModel = state.models.find(
          (m) => m.providerId === providerId && m.enabled
        )

        set({
          currentProviderId: providerId,
          currentModelId: firstModel?.id || null,
        })
      },

      setCurrentModel: async (modelId: string) => {
        const state = get()
        const model = state.models.find((m) => m.id === modelId)
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
      triggerRefresh: () => {
        set({ lastUpdated: Date.now() })
      },

      // Computed
      getCurrentProvider: () => {
        const state = get()
        if (!state.currentProviderId) return null
        return state.providers.find((p) => p.id === state.currentProviderId) || null
      },

      getCurrentModel: () => {
        const state = get()
        if (!state.currentModelId) return null
        return state.models.find((m) => m.id === state.currentModelId) || null
      },

      getEnabledProviders: () => {
        const state = get()
        return state.providers.filter((p) => p.enabled)
      },

      getModelsForProvider: (providerId: string) => {
        const state = get()
        return state.models.filter((m) => m.providerId === providerId)
      },

      getEnabledModels: () => {
        const state = get()
        const enabledProviderIds = state.providers
          .filter((p) => p.enabled)
          .map((p) => p.id)
        return state.models.filter(
          (m) => m.enabled && enabledProviderIds.includes(m.providerId)
        )
      },
    }),
    {
      name: 'muse-settings-v2',
      // Only persist user preferences, not cached data
      partialize: (state) => ({
        currentProviderId: state.currentProviderId,
        currentModelId: state.currentModelId,
        temperature: state.temperature,
      }),
    }
  )
)

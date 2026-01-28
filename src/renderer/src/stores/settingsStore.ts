import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProviderConfig, ModelConfig } from '@shared/types/config'
import { PRESET_MODELS } from '@shared/constants/models'

interface SettingsStore {
  // State
  currentProvider: string
  providers: Record<string, ProviderConfig>

  // Actions
  setCurrentProvider: (provider: string) => void
  updateProvider: (name: string, config: ProviderConfig) => void
  getProviderConfig: (name: string) => ProviderConfig | undefined
  setProviderModel: (provider: string, model: string) => void
  setProviderTemperature: (provider: string, temperature: number) => void
  addCustomModel: (provider: string, model: ModelConfig) => void
  removeCustomModel: (provider: string, modelId: string) => void
  getAvailableModels: (provider: string) => ModelConfig[]
}

const defaultProviders: Record<string, ProviderConfig> = {
  claude: {
    type: 'claude',
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 1,
    maxTokens: 4096,
  },
  openai: {
    type: 'openai',
    apiKey: '',
    model: 'gpt-4-turbo-preview',
    temperature: 1,
    maxTokens: 4096,
  },
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      currentProvider: 'claude',
      providers: defaultProviders,

      setCurrentProvider: (provider) => set({ currentProvider: provider }),

      updateProvider: (name, config) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [name]: config,
          },
        })),

      getProviderConfig: (name) => {
        const state = get()
        return state.providers[name]
      },

      setProviderModel: (provider, model) =>
        set((state) => {
          const providerConfig = state.providers[provider]
          if (!providerConfig) return state

          return {
            providers: {
              ...state.providers,
              [provider]: {
                ...providerConfig,
                model,
              },
            },
          }
        }),

      setProviderTemperature: (provider, temperature) =>
        set((state) => {
          const providerConfig = state.providers[provider]
          if (!providerConfig) return state

          return {
            providers: {
              ...state.providers,
              [provider]: {
                ...providerConfig,
                temperature,
              },
            },
          }
        }),

      addCustomModel: (provider, model) =>
        set((state) => {
          const providerConfig = state.providers[provider]
          if (!providerConfig) return state

          const customModels = providerConfig.models || []
          // Avoid duplicates
          if (customModels.find((m) => m.id === model.id)) {
            return state
          }

          return {
            providers: {
              ...state.providers,
              [provider]: {
                ...providerConfig,
                models: [...customModels, { ...model, isCustom: true }],
              },
            },
          }
        }),

      removeCustomModel: (provider, modelId) =>
        set((state) => {
          const providerConfig = state.providers[provider]
          if (!providerConfig) return state

          return {
            providers: {
              ...state.providers,
              [provider]: {
                ...providerConfig,
                models: (providerConfig.models || []).filter((m) => m.id !== modelId),
              },
            },
          }
        }),

      getAvailableModels: (provider) => {
        const state = get()
        const presetModels = PRESET_MODELS[provider] || []
        const customModels = state.providers[provider]?.models || []
        return [...presetModels, ...customModels]
      },
    }),
    {
      name: 'muse-settings',
    }
  )
)

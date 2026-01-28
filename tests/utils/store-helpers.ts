import { vi } from 'vitest'

/**
 * Zustand Stores Mock 工厂函数
 * 用于创建可配置的 store mock 实例
 */

/**
 * 创建 chatStore mock
 */
export function createMockChatStore(initialState?: {
  isLoading?: boolean
  error?: string | null
}) {
  const state = {
    isLoading: initialState?.isLoading ?? false,
    error: initialState?.error ?? null
  }

  const store = {
    ...state,
    sendMessage: vi.fn(async () => {
      // Mock implementation
      state.isLoading = true
      state.error = null
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 10))
      state.isLoading = false
    }),
    // Zustand store methods
    getState: vi.fn(() => ({ ...state })),
    setState: vi.fn((newState: any) => {
      Object.assign(state, typeof newState === 'function' ? newState(state) : newState)
    }),
    subscribe: vi.fn(() => vi.fn())
  }

  return store
}

/**
 * 创建 conversationStoreV2 mock
 */
export function createMockConversationStore(initialState?: {
  conversations?: any[]
  currentConversationId?: string | null
  isLoading?: boolean
}) {
  const state = {
    conversations: initialState?.conversations ?? [],
    currentConversationId: initialState?.currentConversationId ?? null,
    isLoading: initialState?.isLoading ?? false
  }

  const store = {
    ...state,
    loadConversations: vi.fn(async () => {
      state.isLoading = true
      await new Promise(resolve => setTimeout(resolve, 10))
      state.isLoading = false
    }),
    createConversation: vi.fn(async (title?: string) => {
      const newConv = {
        id: 'new-conv-id',
        title: title ?? 'New Conversation',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      state.conversations.push(newConv)
      return newConv
    }),
    deleteConversation: vi.fn(async (id: string) => {
      state.conversations = state.conversations.filter(c => c.id !== id)
    }),
    renameConversation: vi.fn(async (id: string, title: string) => {
      const conv = state.conversations.find(c => c.id === id)
      if (conv) conv.title = title
    }),
    loadConversation: vi.fn((id: string) => {
      state.currentConversationId = id
    }),
    updateConversation: vi.fn((id: string, updates: any) => {
      const conv = state.conversations.find(c => c.id === id)
      if (conv) Object.assign(conv, updates)
    }),
    addMessage: vi.fn((message: any) => {
      const conv = state.conversations.find(c => c.id === state.currentConversationId)
      if (conv) conv.messages.push(message)
    }),
    getCurrentConversation: vi.fn(() => {
      return state.conversations.find(c => c.id === state.currentConversationId) ?? null
    }),
    getConversationsByDate: vi.fn(() => ({})),
    getState: vi.fn(() => ({ ...state })),
    setState: vi.fn((newState: any) => {
      Object.assign(state, typeof newState === 'function' ? newState(state) : newState)
    }),
    subscribe: vi.fn(() => vi.fn())
  }

  return store
}

/**
 * 创建 settingsStoreV2 mock
 */
export function createMockSettingsStore(initialState?: {
  currentProviderId?: string | null
  currentModelId?: string | null
  temperature?: number
  providers?: any[]
  models?: any[]
}) {
  const state = {
    currentProviderId: initialState?.currentProviderId ?? null,
    currentModelId: initialState?.currentModelId ?? null,
    temperature: initialState?.temperature ?? 1,
    providers: initialState?.providers ?? [],
    models: initialState?.models ?? []
  }

  const store = {
    ...state,
    loadData: vi.fn(async () => {
      // Mock implementation - simulate loading data
      await new Promise(resolve => setTimeout(resolve, 10))
      // Auto-select first enabled provider/model if none selected
      if (!state.currentProviderId && state.providers.length > 0) {
        const firstProvider = state.providers.find((p: any) => p.enabled)
        if (firstProvider) {
          const firstModel = state.models.find(
            (m: any) => m.providerId === firstProvider.id && m.enabled
          )
          if (firstModel) {
            state.currentProviderId = firstProvider.id
            state.currentModelId = firstModel.id
          }
        }
      }
    }),
    setCurrentProvider: vi.fn(async (providerId: string) => {
      const provider = state.providers.find((p: any) => p.id === providerId)
      if (!provider) return

      const firstModel = state.models.find(
        (m: any) => m.providerId === providerId && m.enabled
      )

      state.currentProviderId = providerId
      state.currentModelId = firstModel?.id || null
    }),
    setCurrentModel: vi.fn(async (modelId: string) => {
      const model = state.models.find((m: any) => m.id === modelId)
      if (!model) return

      state.currentModelId = modelId
      state.currentProviderId = model.providerId
    }),
    setTemperature: vi.fn((temperature: number) => {
      state.temperature = temperature
    }),
    getCurrentProvider: vi.fn(() => {
      if (!state.currentProviderId) return null
      return state.providers.find((p: any) => p.id === state.currentProviderId) || null
    }),
    getCurrentModel: vi.fn(() => {
      if (!state.currentModelId) return null
      return state.models.find((m: any) => m.id === state.currentModelId) || null
    }),
    getEnabledProviders: vi.fn(() => {
      return state.providers.filter((p: any) => p.enabled)
    }),
    getModelsForProvider: vi.fn((providerId: string) => {
      return state.models.filter((m: any) => m.providerId === providerId)
    }),
    getEnabledModels: vi.fn(() => {
      const enabledProviderIds = state.providers
        .filter((p: any) => p.enabled)
        .map((p: any) => p.id)
      return state.models.filter(
        (m: any) => m.enabled && enabledProviderIds.includes(m.providerId)
      )
    }),
    getState: vi.fn(() => ({ ...state })),
    setState: vi.fn((newState: any) => {
      Object.assign(state, typeof newState === 'function' ? newState(state) : newState)
    }),
    subscribe: vi.fn(() => vi.fn())
  }

  return store
}

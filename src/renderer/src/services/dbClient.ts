// Database client for IPC communication

export const dbClient = {
  // Conversations
  conversations: {
    getAll: async () => {
      return await window.api.ipc.invoke('db:conversations:getAll')
    },
    getById: async (id: string) => {
      return await window.api.ipc.invoke('db:conversations:getById', { id })
    },
    getWithMessages: async (id: string) => {
      return await window.api.ipc.invoke('db:conversations:getWithMessages', { id })
    },
    create: async (data: any) => {
      return await window.api.ipc.invoke('db:conversations:create', data)
    },
    update: async (id: string, data: any) => {
      return await window.api.ipc.invoke('db:conversations:update', { id, data })
    },
    delete: async (id: string) => {
      return await window.api.ipc.invoke('db:conversations:delete', { id })
    },
  },

  // Messages
  messages: {
    getByConversationId: async (conversationId: string) => {
      return await window.api.ipc.invoke('db:messages:getByConversationId', { conversationId })
    },
    getAllWithTools: async (conversationId: string) => {
      return await window.api.ipc.invoke('db:messages:getAllWithTools', { conversationId })
    },
    create: async (data: any) => {
      return await window.api.ipc.invoke('db:messages:create', data)
    },
    updateContent: async (id: string, content: string) => {
      return await window.api.ipc.invoke('db:messages:updateContent', { id, content })
    },
    addToolCall: async (messageId: string, data: any) => {
      return await window.api.ipc.invoke('db:messages:addToolCall', { messageId, data })
    },
    addToolResult: async (toolCallId: string, data: any) => {
      return await window.api.ipc.invoke('db:messages:addToolResult', { toolCallId, data })
    },
  },

  // Providers
  providers: {
    getAll: async () => {
      return await window.api.ipc.invoke('db:providers:getAll')
    },
    getEnabled: async () => {
      return await window.api.ipc.invoke('db:providers:getEnabled')
    },
    getById: async (id: string) => {
      return await window.api.ipc.invoke('db:providers:getById', { id })
    },
    getByName: async (name: string) => {
      return await window.api.ipc.invoke('db:providers:getByName', { name })
    },
    create: async (data: any) => {
      return await window.api.ipc.invoke('db:providers:create', data)
    },
    update: async (id: string, data: any) => {
      return await window.api.ipc.invoke('db:providers:update', { id, data })
    },
    delete: async (id: string) => {
      return await window.api.ipc.invoke('db:providers:delete', { id })
    },
    toggleEnabled: async (id: string) => {
      return await window.api.ipc.invoke('db:providers:toggleEnabled', { id })
    },
  },

  // Models
  models: {
    getAll: async () => {
      return await window.api.ipc.invoke('db:models:getAll')
    },
    getByProviderId: async (providerId: string) => {
      return await window.api.ipc.invoke('db:models:getByProviderId', { providerId })
    },
    create: async (data: any) => {
      return await window.api.ipc.invoke('db:models:create', data)
    },
    createMany: async (models: any[]) => {
      return await window.api.ipc.invoke('db:models:createMany', { models })
    },
    update: async (id: string, data: any) => {
      return await window.api.ipc.invoke('db:models:update', { id, data })
    },
    delete: async (id: string) => {
      return await window.api.ipc.invoke('db:models:delete', { id })
    },
    toggleEnabled: async (id: string) => {
      return await window.api.ipc.invoke('db:models:toggleEnabled', { id })
    },
  },

  // Settings
  settings: {
    getAll: async () => {
      return await window.api.ipc.invoke('db:settings:getAll')
    },
    get: async (key: string) => {
      return await window.api.ipc.invoke('db:settings:get', { key })
    },
    set: async (key: string, value: any) => {
      return await window.api.ipc.invoke('db:settings:set', { key, value })
    },
    setMany: async (settings: Record<string, any>) => {
      return await window.api.ipc.invoke('db:settings:setMany', { settings })
    },
  },

  // Migration
  migration: {
    run: async (data: any) => {
      return await window.api.ipc.invoke('db:migration:run', { data })
    },
    verify: async () => {
      return await window.api.ipc.invoke('db:migration:verify')
    },
    clear: async () => {
      return await window.api.ipc.invoke('db:migration:clear')
    },
  },
}

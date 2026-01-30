import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Conversation, Message } from '@shared/types/conversation'
import { dbClient } from '@/services/dbClient'

interface ConversationStore {
  // State
  conversations: Conversation[]
  currentConversationId: string | null
  isLoading: boolean
  loadedConversationIds: Set<string>
  loadingConversationId: string | null

  // Actions
  loadConversations: () => Promise<void>
  createConversation: (title?: string) => Promise<Conversation>
  deleteConversation: (id: string) => Promise<void>
  renameConversation: (id: string, title: string) => Promise<void>
  loadConversation: (id: string) => Promise<void>
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  addMessage: (message: Message) => void
  getCurrentConversation: () => Conversation | null
  getConversationsByDate: () => Record<string, Conversation[]>
  clearCurrentConversation: () => void
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  isLoading: false,
  loadedConversationIds: new Set<string>(),
  loadingConversationId: null,

  // Load all conversations from database (metadata only, no messages)
  loadConversations: async () => {
    set({ isLoading: true })
    try {
      const dbConversations = await dbClient.conversations.getAll()

      // Only load metadata, messages will be loaded on demand
      const conversations = dbConversations.map((conv: any) => ({
        id: conv.id,
        title: conv.title,
        createdAt: new Date(conv.createdAt).getTime(),
        updatedAt: new Date(conv.updatedAt).getTime(),
        messages: [],
      }))

      set({
        conversations,
        isLoading: false,
        loadedConversationIds: new Set<string>(),
      })
    } catch (error) {
      console.error('Failed to load conversations:', error)
      set({ isLoading: false })
    }
  },

  createConversation: async (title = 'New Chat') => {
    const newConversation: Conversation = {
      id: uuidv4(),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    }

    // Save to database
    await dbClient.conversations.create({
      id: newConversation.id,
      title: newConversation.title,
      createdAt: new Date(newConversation.createdAt),
      updatedAt: new Date(newConversation.updatedAt),
    })

    set((state) => ({
      conversations: [newConversation, ...state.conversations],
      currentConversationId: newConversation.id,
    }))

    return newConversation
  },

  deleteConversation: async (id: string) => {
    // Delete from database
    await dbClient.conversations.delete(id)

    set((state) => {
      const newConversations = state.conversations.filter((c) => c.id !== id)
      const newCurrentId =
        state.currentConversationId === id
          ? newConversations[0]?.id || null
          : state.currentConversationId

      return {
        conversations: newConversations,
        currentConversationId: newCurrentId,
      }
    })
  },

  renameConversation: async (id: string, title: string) => {
    // Update in database
    await dbClient.conversations.update(id, { title })

    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title, updatedAt: Date.now() } : c
      ),
    }))
  },

  loadConversation: async (id: string) => {
    set({ currentConversationId: id })

    const { loadedConversationIds } = get()
    if (loadedConversationIds.has(id)) return // Already loaded

    set({ loadingConversationId: id })

    try {
      const messages = await dbClient.messages.getAllWithTools(id)
      const attachmentsApi =
        typeof window !== 'undefined' ? window.api?.attachments : undefined

      const messagesWithAttachments = await Promise.all(
        messages.map(async (msg: any) => {
          const attachments = attachmentsApi?.getPreviewsByMessageId
            ? await attachmentsApi.getPreviewsByMessageId(msg.id)
            : []
          return { ...msg, attachments }
        })
      )

      const mappedMessages = messagesWithAttachments.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        thinking: msg.thinking,
        timestamp: new Date(msg.timestamp).getTime(),
        toolCalls: msg.toolCalls || [],
        toolResults: msg.toolResults || [],
        attachments: msg.attachments || [],
      }))

      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, messages: mappedMessages } : c
        ),
        loadedConversationIds: new Set([...state.loadedConversationIds, id]),
        loadingConversationId: null,
      }))
    } catch (error) {
      console.error('Failed to load conversation messages:', error)
      set({ loadingConversationId: null })
    }
  },

  updateConversation: (id: string, updates: Partial<Conversation>) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
      ),
    })),

  addMessage: (message: Message) =>
    set((state) => {
      const currentId = state.currentConversationId
      if (!currentId) return state

      return {
        conversations: state.conversations.map((c) =>
          c.id === currentId
            ? {
                ...c,
                messages: [...c.messages, message],
                updatedAt: Date.now(),
              }
            : c
        ),
      }
    }),

  getCurrentConversation: () => {
    const state = get()
    return state.conversations.find((c) => c.id === state.currentConversationId) || null
  },

  getConversationsByDate: () => {
    const state = get()
    const now = Date.now()
    const today = new Date(now).setHours(0, 0, 0, 0)
    const yesterday = today - 86400000
    const lastWeek = today - 7 * 86400000
    const lastMonth = today - 30 * 86400000

    return {
      today: state.conversations.filter((c) => c.updatedAt >= today),
      yesterday: state.conversations.filter(
        (c) => c.updatedAt >= yesterday && c.updatedAt < today
      ),
      lastWeek: state.conversations.filter(
        (c) => c.updatedAt >= lastWeek && c.updatedAt < yesterday
      ),
      lastMonth: state.conversations.filter(
        (c) => c.updatedAt >= lastMonth && c.updatedAt < lastWeek
      ),
      older: state.conversations.filter((c) => c.updatedAt < lastMonth),
    }
  },

  clearCurrentConversation: () => set({ currentConversationId: null }),
}))

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Conversation, Message } from '@shared/types/conversation'

interface ConversationStore {
  // State
  conversations: Conversation[]
  currentConversationId: string | null

  // Actions
  createConversation: (title?: string) => Conversation
  deleteConversation: (id: string) => void
  renameConversation: (id: string, title: string) => void
  loadConversation: (id: string) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  addMessage: (message: Message) => void
  getCurrentConversation: () => Conversation | null
  getConversationsByDate: () => Record<string, Conversation[]>
  clearCurrentConversation: () => void
}

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,

      createConversation: (title = 'New Chat') => {
        const newConversation: Conversation = {
          id: uuidv4(),
          title,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
        }

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: newConversation.id,
        }))

        return newConversation
      },

      deleteConversation: (id: string) =>
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
        }),

      renameConversation: (id: string, title: string) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c
          ),
        })),

      loadConversation: (id: string) => set({ currentConversationId: id }),

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
          yesterday: state.conversations.filter((c) => c.updatedAt >= yesterday && c.updatedAt < today),
          lastWeek: state.conversations.filter((c) => c.updatedAt >= lastWeek && c.updatedAt < yesterday),
          lastMonth: state.conversations.filter((c) => c.updatedAt >= lastMonth && c.updatedAt < lastWeek),
          older: state.conversations.filter((c) => c.updatedAt < lastMonth),
        }
      },

      clearCurrentConversation: () => set({ currentConversationId: null }),
    }),
    {
      name: 'muse-conversations',
      version: 1,
    }
  )
)

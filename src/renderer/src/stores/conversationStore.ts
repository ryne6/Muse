import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Conversation, Message } from '~shared/types/conversation'
import { dbClient } from '~/services/dbClient'
import { useWorkspaceStore } from './workspaceStore'
import { useSettingsStore } from './settingsStore'

// 消息 ID 列表 selector，配合 shallow 比较避免内容更新触发重渲染
export const selectCurrentMessageIds = (s: ConversationStore): string[] => {
  const conv = s.conversations.find(c => c.id === s.currentConversationId)
  return conv?.messages.map(m => m.id) ?? []
}

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
  updateMessage: (
    convId: string,
    msgId: string,
    updater: (msg: Message) => Message
  ) => void
  addMessage: (message: Message) => void
  getCurrentConversation: () => Conversation | null
  getConversationsByDate: () => Record<string, Conversation[]>
  clearCurrentConversation: () => void
  setWorkspace: (id: string, workspace: string | null) => Promise<void>
  updateConversationSystemPrompt: (
    id: string,
    systemPrompt: string | null
  ) => Promise<void>
  getEffectiveWorkspace: () => string | null
}

interface DBConversationRow {
  id: string
  title: string
  createdAt: Date | string | number
  updatedAt: Date | string | number
  workspace?: string | null
  systemPrompt?: string | null
  totalInputTokens?: number | null
  totalOutputTokens?: number | null
}

interface DBMessageWithToolsRow {
  id: string
  role: Message['role']
  content: string
  thinking?: string | null
  timestamp: Date | string | number
  toolCalls?: Message['toolCalls']
  toolResults?: Message['toolResults']
  attachments?: Message['attachments']
  inputTokens?: number | null
  input_tokens?: number | null
  outputTokens?: number | null
  output_tokens?: number | null
  durationMs?: number | null
  duration_ms?: number | null
  compressed?: boolean | null
  summaryOf?: string | null
  summary_of?: string | null
}

function parseSummaryOf(
  raw: string | null | undefined
): string[] | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) &&
      parsed.every((id): id is string => typeof id === 'string')
      ? parsed
      : undefined
  } catch {
    return undefined
  }
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  conversations: [],
  currentConversationId: localStorage.getItem('currentConversationId') || null,
  isLoading: false,
  loadedConversationIds: new Set<string>(),
  loadingConversationId: null,

  // Load all conversations from database (metadata only, no messages)
  loadConversations: async () => {
    set({ isLoading: true })
    try {
      const dbConversations = await dbClient.conversations.getAll()

      // Only load metadata, messages will be loaded on demand
      const conversations = (dbConversations as DBConversationRow[]).map(conv => ({
        id: conv.id,
        title: conv.title,
        createdAt: new Date(conv.createdAt).getTime(),
        updatedAt: new Date(conv.updatedAt).getTime(),
        workspace: conv.workspace || null,
        systemPrompt: conv.systemPrompt || null,
        totalInputTokens: conv.totalInputTokens ?? 0,
        totalOutputTokens: conv.totalOutputTokens ?? 0,
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

    // 创建默认工作区目录
    try {
      const { path: workspacePath } = await window.api.workspace.createDefault(
        newConversation.id
      )
      newConversation.workspace = workspacePath
    } catch (error) {
      console.error(
        'Failed to create default workspace, continuing without it:',
        error
      )
    }

    // Save to database (含 workspace)
    await dbClient.conversations.create({
      id: newConversation.id,
      title: newConversation.title,
      createdAt: new Date(newConversation.createdAt),
      updatedAt: new Date(newConversation.updatedAt),
      workspace: newConversation.workspace,
    })

    set(state => ({
      conversations: [newConversation, ...state.conversations],
      currentConversationId: newConversation.id,
    }))

    return newConversation
  },

  deleteConversation: async (id: string) => {
    // 获取对话信息（用于清理工作区）
    const conv = get().conversations.find(c => c.id === id)
    const workspacePath = conv?.workspace

    // Delete from database
    await dbClient.conversations.delete(id)

    // 清理 Crow 管理的工作区目录
    if (workspacePath) {
      try {
        const result = await window.api.workspace.cleanup(workspacePath)
        if (!result.deleted && result.reason === 'not_empty') {
          console.log(`Workspace ${workspacePath} not empty, skipping cleanup`)
        }
      } catch (error) {
        console.error('Failed to cleanup workspace:', error)
      }
    }

    set(state => {
      const newConversations = state.conversations.filter(c => c.id !== id)
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

    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === id ? { ...c, title, updatedAt: Date.now() } : c
      ),
    }))
  },

  loadConversation: async (id: string) => {
    // P1: Trigger memory extraction on the previous conversation before switching
    const previousId = get().currentConversationId
    if (previousId && previousId !== id) {
      const prevConv = get().conversations.find(c => c.id === previousId)
      const memoryEnabled = useSettingsStore.getState().memoryEnabled
      if (memoryEnabled && prevConv) {
        const userMsgCount = prevConv.messages.filter(
          m => m.role === 'user'
        ).length
        if (userMsgCount >= 5) {
          // Fire-and-forget: dynamic import to avoid circular dependency
          import('./chatStore').then(({ triggerMemoryExtraction }) => {
            const settings = useSettingsStore.getState()
            const pid = settings.currentProviderId
            const mid = settings.currentModelId
            if (pid && mid) {
              triggerMemoryExtraction(previousId, pid, mid).catch(err =>
                console.error('Memory extraction on switch failed:', err)
              )
            }
          })
        }
      }
    }

    set({ currentConversationId: id })

    const { loadedConversationIds } = get()
    if (loadedConversationIds.has(id)) return // Already loaded

    set({ loadingConversationId: id })

    try {
      const messages = await dbClient.messages.getAllWithTools(id)
      const attachmentsApi =
        typeof window !== 'undefined' ? window.api?.attachments : undefined

      const messagesWithAttachments = await Promise.all(
        (messages as DBMessageWithToolsRow[]).map(async msg => {
          const attachments = attachmentsApi?.getPreviewsByMessageId
            ? await attachmentsApi.getPreviewsByMessageId(msg.id)
            : []
          return { ...msg, attachments }
        })
      )

      const mappedMessages = messagesWithAttachments.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        thinking: msg.thinking ?? undefined,
        timestamp: new Date(msg.timestamp).getTime(),
        toolCalls: msg.toolCalls || [],
        toolResults: msg.toolResults || [],
        attachments: msg.attachments || [],
        inputTokens: msg.inputTokens ?? msg.input_tokens ?? undefined,
        outputTokens: msg.outputTokens ?? msg.output_tokens ?? undefined,
        durationMs: msg.durationMs ?? msg.duration_ms ?? undefined,
        compressed: msg.compressed ?? false,
        summaryOf: parseSummaryOf(msg.summaryOf ?? msg.summary_of),
      }))

      set(state => ({
        conversations: state.conversations.map(c =>
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
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
      ),
    })),

  // 只更新目标消息，保持其他消息引用不变（配合 memo 避免重渲染）
  updateMessage: (convId, msgId, updater) =>
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === convId
          ? {
              ...c,
              messages: c.messages.map(m => (m.id === msgId ? updater(m) : m)),
            }
          : c
      ),
    })),

  addMessage: (message: Message) =>
    set(state => {
      const currentId = state.currentConversationId
      if (!currentId) return state

      return {
        conversations: state.conversations.map(c =>
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
    return (
      state.conversations.find(c => c.id === state.currentConversationId) ||
      null
    )
  },

  getConversationsByDate: () => {
    const state = get()
    const now = Date.now()
    const today = new Date(now).setHours(0, 0, 0, 0)
    const yesterday = today - 86400000
    const lastWeek = today - 7 * 86400000
    const lastMonth = today - 30 * 86400000

    return {
      today: state.conversations.filter(c => c.updatedAt >= today),
      yesterday: state.conversations.filter(
        c => c.updatedAt >= yesterday && c.updatedAt < today
      ),
      lastWeek: state.conversations.filter(
        c => c.updatedAt >= lastWeek && c.updatedAt < yesterday
      ),
      lastMonth: state.conversations.filter(
        c => c.updatedAt >= lastMonth && c.updatedAt < lastWeek
      ),
      older: state.conversations.filter(c => c.updatedAt < lastMonth),
    }
  },

  clearCurrentConversation: () => set({ currentConversationId: null }),

  setWorkspace: async (id: string, workspace: string | null) => {
    await window.api.ipc.invoke('db:conversations:updateWorkspace', {
      id,
      workspace,
    })
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === id ? { ...c, workspace } : c
      ),
    }))
  },

  updateConversationSystemPrompt: async (
    id: string,
    systemPrompt: string | null
  ) => {
    await window.api.ipc.invoke('db:conversations:updateSystemPrompt', {
      id,
      systemPrompt,
    })
    set(state => ({
      conversations: state.conversations.map(c =>
        c.id === id ? { ...c, systemPrompt } : c
      ),
    }))
  },

  getEffectiveWorkspace: () => {
    const state = get()
    const current = state.conversations.find(
      c => c.id === state.currentConversationId
    )
    if (current?.workspace) return current.workspace
    return useWorkspaceStore.getState().workspacePath
  },
}))

// HMR 时保持当前对话选中状态
useConversationStore.subscribe(state => {
  if (state.currentConversationId) {
    localStorage.setItem('currentConversationId', state.currentConversationId)
  } else {
    localStorage.removeItem('currentConversationId')
  }
})

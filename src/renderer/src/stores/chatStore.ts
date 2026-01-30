import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { apiClient, APIClientError } from '../services/apiClient'
import type { AIMessage, AIConfig, MessageContent } from '@shared/types/ai'
import type { APIError } from '@shared/types/error'
import { getErrorMessage } from '@shared/types/error'
import type { Message, ToolCall, ToolResult } from '@shared/types/conversation'
import type { PendingAttachment } from '@shared/types/attachment'
import { useConversationStore } from './conversationStore'

interface ChatStore {
  // State
  isLoading: boolean
  error: string | null
  lastError: APIError | null
  retryable: boolean

  // Actions
  sendMessage: (
    conversationId: string,
    content: string,
    providerType: string,
    config: AIConfig,
    attachments?: PendingAttachment[]
  ) => Promise<void>
  clearError: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  // State
  isLoading: false,
  error: null,
  lastError: null,
  retryable: false,

  // Actions
  clearError: () => set({ error: null, lastError: null, retryable: false }),
  sendMessage: async (conversationId, content, providerType, config, attachments = []) => {
    set({ isLoading: true, error: null })

    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    useConversationStore.getState().addMessage(userMessage)

    // Get conversation for context
    const conversation = useConversationStore.getState().getCurrentConversation()
    if (!conversation) {
      set({ isLoading: false, error: 'No conversation found' })
      return
    }

    const buildContentBlocks = async (m: Message): Promise<MessageContent[]> => {
      const contentBlocks: MessageContent[] = []

      if (m.content) {
        contentBlocks.push({ type: 'text', text: m.content })
      }

      if (m.attachments?.length && window.api?.attachments?.getBase64) {
        const imageBlocks = await Promise.all(
          m.attachments.map(async (attachment) => {
            const base64 = await window.api.attachments.getBase64(attachment.id)
            return base64
              ? {
                  type: 'image',
                  mimeType: attachment.mimeType,
                  data: base64,
                  note: attachment.note || undefined,
                }
              : null
          })
        )
        contentBlocks.push(...imageBlocks.filter(Boolean))
      }

      return contentBlocks
    }

    // Prepare messages for API (include history attachments)
    const aiMessages: AIMessage[] = await Promise.all(
      conversation.messages.map(async (m) => {
        if (m.attachments && m.attachments.length > 0) {
          return {
            role: m.role as 'user' | 'assistant',
            content: await buildContentBlocks(m),
          }
        }

        return {
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }
      })
    )

    // Add current message with attachments to API messages
    if (attachments.length > 0) {
      const lastMessage = aiMessages[aiMessages.length - 1]
      const contentBlocks: MessageContent[] = []

      // Add text content
      if (content) {
        contentBlocks.push({ type: 'text', text: content })
      }

      // Add image content from attachments
      for (const attachment of attachments) {
        const base64Data = attachment.dataUrl.split(',')[1]
        contentBlocks.push({
          type: 'image',
          mimeType: attachment.mimeType,
          data: base64Data,
          note: attachment.note || undefined,
        })
      }

      // Replace last message content with multimodal content
      aiMessages[aiMessages.length - 1] = {
        ...lastMessage,
        content: contentBlocks,
      }
    }

    // Create placeholder for assistant message
    const assistantMessageId = uuidv4()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      toolCalls: [],
      toolResults: [],
    }

    useConversationStore.getState().addMessage(assistantMessage)

    try {
      // Send message with streaming
      await apiClient.sendMessageStream(
        providerType,
        aiMessages,
        config,
        (chunk) => {
          const conversationStore = useConversationStore.getState()
          const currentConv = conversationStore.getCurrentConversation()
          if (!currentConv) return

          const updatedMessages = currentConv.messages.map((m) => {
            if (m.id !== assistantMessageId) return m

            const updated: Message = { ...m }

            // Update content
            if (chunk.content) {
              updated.content = m.content + chunk.content
            }

            // Add tool call
            if (chunk.toolCall) {
              const toolCalls = updated.toolCalls || []
              const existingCall = toolCalls.find((tc) => tc.id === chunk.toolCall!.id)
              if (!existingCall) {
                toolCalls.push(chunk.toolCall as ToolCall)
                updated.toolCalls = toolCalls
              }
            }

            // Add tool result
            if (chunk.toolResult) {
              const toolResults = updated.toolResults || []
              const existingResult = toolResults.find(
                (tr) => tr.toolCallId === chunk.toolResult!.toolCallId
              )
              if (!existingResult) {
                toolResults.push(chunk.toolResult as ToolResult)
                updated.toolResults = toolResults
              }
            }

            return updated
          })

          conversationStore.updateConversation(conversationId, {
            messages: updatedMessages,
          })
        }
      )

      // Update conversation title if it's the first user message
      const currentConv = useConversationStore.getState().getCurrentConversation()
      if (currentConv && currentConv.messages.filter((m) => m.role === 'user').length === 1) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '')
        useConversationStore.getState().renameConversation(conversationId, title)
      }
    } catch (error) {
      console.error('Failed to send message:', error)

      // Parse error using structured error types
      let errorMessage = 'Unknown error'
      let apiError: APIError | null = null
      let isRetryable = false

      if (error instanceof APIClientError) {
        // Use structured error from API client
        apiError = error.apiError || null
        errorMessage = apiError?.message || error.message
        isRetryable = error.retryable
      } else if (error instanceof Error) {
        // Fallback for non-APIClientError
        errorMessage = getErrorMessage(error.message as any) || error.message
      }

      // Update assistant message with error
      const conversationStore = useConversationStore.getState()
      const currentConv = conversationStore.getCurrentConversation()
      if (currentConv) {
        const updatedMessages = currentConv.messages.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: `Error: ${errorMessage}` }
            : m
        )

        conversationStore.updateConversation(conversationId, {
          messages: updatedMessages,
        })
      }

      set({ error: errorMessage, lastError: apiError, retryable: isRetryable })
    } finally {
      set({ isLoading: false })
    }
  },
}))

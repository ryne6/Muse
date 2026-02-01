import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { apiClient, APIClientError } from '../services/apiClient'
import { dbClient } from '../services/dbClient'
import type { AIMessage, AIConfig, MessageContent, AIRequestOptions } from '@shared/types/ai'
import type { APIError } from '@shared/types/error'
import { getErrorMessage } from '@shared/types/error'
import type { Message, ToolCall, ToolResult } from '@shared/types/conversation'
import type { PendingAttachment } from '@shared/types/attachment'
import { useConversationStore } from './conversationStore'
import { useSettingsStore } from './settingsStore'
import { useWorkspaceStore } from './workspaceStore'

interface ChatStore {
  // State
  isLoading: boolean
  abortController: AbortController | null
  error: string | null
  lastError: APIError | null
  retryable: boolean

  // Actions
  sendMessage: (
    conversationId: string,
    content: string,
    providerType: string,
    config: AIConfig,
    attachments?: PendingAttachment[],
    options?: AIRequestOptions
  ) => Promise<void>
  approveToolCall: (
    conversationId: string,
    toolName: string,
    allowAll?: boolean
  ) => Promise<void>
  abortMessage: () => void
  clearError: () => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // State
  isLoading: false,
  abortController: null,
  error: null,
  lastError: null,
  retryable: false,

  // Actions
  clearError: () => set({ error: null, lastError: null, retryable: false }),

  abortMessage: () => {
    const { abortController } = get()
    if (abortController) {
      abortController.abort()
      set({ isLoading: false, abortController: null })
    }
  },

  sendMessage: async (conversationId, content, providerType, config, attachments = [], options) => {
    const controller = new AbortController()
    set({ isLoading: true, error: null, abortController: controller })

    // Add user message
    const messageId = uuidv4()
    const messageTimestamp = Date.now()
    const userMessage: Message = {
      id: messageId,
      role: 'user',
      content,
      timestamp: messageTimestamp,
      attachments: attachments.map((a) => ({
        id: a.id,
        messageId: messageId,
        filename: a.filename,
        mimeType: a.mimeType,
        note: a.note || null,
        size: a.size,
        width: a.width,
        height: a.height,
        createdAt: new Date(messageTimestamp),
      })),
    }

    // Persist user message to database first
    await dbClient.messages.create({
      id: userMessage.id,
      conversationId,
      role: 'user',
      content,
      timestamp: new Date(userMessage.timestamp),
    })

    // Persist attachments to database
    for (const attachment of attachments) {
      const base64Data = attachment.dataUrl.split(',')[1]
      await window.api.attachments.create({
        id: attachment.id,
        messageId: userMessage.id,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        data: base64Data,
        note: attachment.note || null,
        size: attachment.size,
        width: attachment.width,
        height: attachment.height,
      })
    }

    // Add to memory after database save (so MessageImage can load from DB)
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
    const historyMessages: AIMessage[] = await Promise.all(
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

    // Build system prompt with tool instructions
    const workspacePath = useConversationStore.getState().getEffectiveWorkspace()

    // Get skills content based on selection mode
    const selectedSkill = useSettingsStore.getState().selectedSkill
    let skillsSection = ''

    try {
      if (selectedSkill) {
        // Manual mode: load specific skill content
        const skillContent = await dbClient.skills.getContent(selectedSkill)
        skillsSection = `\n\n## Active Skill\n\n${skillContent}`
      } else {
        // Auto mode: load all skills for AI to choose
        const skills = await dbClient.skills.getAll()
        if (skills.length > 0) {
          const skillsList = skills.map((s: any) => `- **${s.name}**: ${s.description || 'No description'}`).join('\n')
          skillsSection = `\n\n## Available Skills\n\nThe following skills are available. Use them when relevant to the user's request:\n\n${skillsList}`
        }
      }
    } catch (error) {
      console.error('Failed to load skills:', error)
    }

    const systemPrompt = `You are Muse, an AI coding assistant with access to the following tools:

## Available Tools

### File Operations
- **Read**: Read file contents
- **Write**: Create or overwrite files
- **Edit**: Make targeted edits to files
- **LS**: List directory contents
- **Glob**: Find files by pattern (e.g., "**/*.ts")
- **Grep**: Search file contents with regex

### Git Operations
- **GitStatus**: Check repository status
- **GitDiff**: View changes
- **GitLog**: View commit history
- **GitCommit**: Create commits (requires approval)
- **GitPush**: Push to remote (requires approval)
- **GitCheckout**: Switch branches (requires approval)

### Web Operations
- **WebFetch**: Fetch URL content
- **WebSearch**: Search the web

## Guidelines
- Use tools proactively to help users with coding tasks
- When asked about code, use Glob/Grep to find relevant files first
- When asked to modify code, use Read to understand context before Edit/Write
- Always explain what you're doing when using tools

## Tool Error Handling
- If a tool returns an error or empty result, DO NOT retry the same tool with the same parameters
- Instead, either:
  1. Try a different approach or tool
  2. Ask the user for clarification
  3. Inform the user that the operation failed and explain why
- Never loop on the same failing tool call
${skillsSection}
Current workspace: ${workspacePath || 'Not set'}`

    // Combine system prompt with history messages
    const aiMessages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
    ]

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
      const settingsState = useSettingsStore.getState()
      const workspacePath = useConversationStore.getState().getEffectiveWorkspace()
      const toolPermissions = options?.toolPermissions
        ?? settingsState.getToolPermissions(workspacePath)

      // Send message with streaming
      await apiClient.sendMessageStream(
        providerType,
        aiMessages,
        config,
        (chunk) => {
          const conversationStore = useConversationStore.getState()
          // Use original conversationId to find the conversation, not getCurrentConversation()
          // This ensures streaming updates go to the correct conversation even if user switches away
          const conv = conversationStore.conversations.find((c) => c.id === conversationId)
          if (!conv) return

          const updatedMessages = conv.messages.map((m) => {
            if (m.id !== assistantMessageId) return m

            const updated: Message = { ...m }

            // Update content
            if (chunk.content) {
              updated.content = m.content + chunk.content
            }

            // Update thinking content
            if (chunk.thinking) {
              updated.thinking = (m.thinking || '') + chunk.thinking
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
        },
        controller.signal,
        {
          toolPermissions,
          allowOnceTools: options?.allowOnceTools,
        }
      )

      // Persist assistant message to database after streaming completes
      const finalConv = useConversationStore.getState().getCurrentConversation()
      const finalAssistantMessage = finalConv?.messages.find((m) => m.id === assistantMessageId)
      if (finalAssistantMessage) {
        await dbClient.messages.create({
          id: finalAssistantMessage.id,
          conversationId,
          role: 'assistant',
          content: finalAssistantMessage.content,
          thinking: finalAssistantMessage.thinking,
          timestamp: new Date(finalAssistantMessage.timestamp),
        })
      }

      // Update conversation title if it's the first user message
      const currentConv = useConversationStore.getState().getCurrentConversation()
      if (currentConv && currentConv.messages.filter((m) => m.role === 'user').length === 1) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '')
        useConversationStore.getState().renameConversation(conversationId, title)
      }
    } catch (error) {
      // Ignore abort errors (user cancelled)
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

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
      set({ isLoading: false, abortController: null })
    }
  },

  approveToolCall: async (conversationId, toolName, allowAll = false) => {
    const settingsState = useSettingsStore.getState()
    const workspacePath = useConversationStore.getState().getEffectiveWorkspace()
    const provider = settingsState.getCurrentProvider()
    const model = settingsState.getCurrentModel()

    if (!provider || !model) {
      set({ error: 'No provider or model selected' })
      return
    }

    if (!provider.apiKey) {
      set({ error: 'Provider API key missing' })
      return
    }

    if (allowAll) {
      settingsState.setToolAllowAll(workspacePath ?? '', true)
    }

    const aiConfig: AIConfig = {
      apiKey: provider.apiKey,
      model: model.modelId,
      baseURL: provider.baseURL || undefined,
      apiFormat: provider.apiFormat || 'chat-completions',
      temperature: settingsState.temperature,
      maxTokens: 4096,
      thinkingEnabled: settingsState.thinkingEnabled,
    }

    const message = `已允许工具: ${toolName}`

    await get().sendMessage(
      conversationId,
      message,
      provider.type,
      aiConfig,
      [],
      { allowOnceTools: [toolName] }
    )
  },
}))

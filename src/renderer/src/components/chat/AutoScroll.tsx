// Based on: https://github.com/lobehub/lobe-chat/blob/main/src/features/Conversation/ChatList/components/AutoScroll/index.tsx
// License: MIT

import { useEffect, useCallback } from 'react'
import { useConversationStore } from '~/stores/conversationStore'
import { useChatStore } from '~/stores/chatStore'

// 无 UI 组件，放在 VList 最后一项内部，负责流式生成时自动跟随底部
export function AutoScroll() {
  const isLoading = useChatStore(s => s.isLoading)
  const atBottom = useChatStore(s => s.atBottom)
  const isScrolling = useChatStore(s => s.isScrolling)
  const scrollToBottom = useChatStore(s => s.scrollToBottom)

  const currentConversationId = useConversationStore(
    s => s.currentConversationId
  )
  // 监听最后一条消息的内容长度变化（流式增长）
  const lastMessageLength = useConversationStore(
    useCallback(s => {
      const conv = s.conversations.find(c => c.id === s.currentConversationId)
      if (!conv || conv.messages.length === 0) return 0
      const last = conv.messages[conv.messages.length - 1]
      return (last.content?.length ?? 0) + (last.thinking?.length ?? 0)
    }, [])
  )
  const messageCount = useConversationStore(
    useCallback(s => {
      const conv = s.conversations.find(c => c.id === s.currentConversationId)
      return conv?.messages.length ?? 0
    }, [])
  )

  useEffect(() => {
    if (atBottom && isLoading && !isScrolling) {
      scrollToBottom(false)
    }
  }, [
    lastMessageLength,
    messageCount,
    atBottom,
    isLoading,
    isScrolling,
    scrollToBottom,
    currentConversationId,
  ])

  return null
}

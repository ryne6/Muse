import { useEffect, useRef } from 'react'
import { useConversationStore } from '@/stores/conversationStore'
import { useChatStore } from '@/stores/chatStore'
import { MessageItem } from './MessageItem'

export function MessageList() {
  const { getCurrentConversation } = useConversationStore()
  const loadingConversationId = useConversationStore((s) => s.loadingConversationId)
  const currentConversationId = useConversationStore((s) => s.currentConversationId)
  const isLoading = useChatStore((state) => state.isLoading)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const conversation = getCurrentConversation()
  const currentMessages = conversation?.messages || []

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages])

  // Show loading state when messages are being fetched
  if (loadingConversationId === currentConversationId && currentConversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">Start a new conversation</p>
          <p className="text-sm">Click "New Chat" or start typing below</p>
        </div>
      </div>
    )
  }

  if (currentMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">Start a conversation</p>
          <p className="text-sm">Type a message below to begin</p>
        </div>
      </div>
    )
  }

  // Check if we should show loading indicators
  const lastMessage = currentMessages[currentMessages.length - 1]
  // 准备响应中：isLoading 且最后消息是空的 assistant
  const showPreparing = isLoading && lastMessage?.role === 'assistant' && !lastMessage?.content
  // 正在生成中：isLoading 且最后消息是有内容的 assistant
  const showGenerating = isLoading && lastMessage?.role === 'assistant' && !!lastMessage?.content

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-6 space-y-6">
        {currentMessages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        {showPreparing && (
          <div className="flex items-center gap-2 animate-breathing ml-11">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-sm text-muted-foreground">准备响应中 ...</span>
          </div>
        )}
        {showGenerating && (
          <div className="flex items-center gap-2 animate-breathing ml-11">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-sm text-muted-foreground">正在生成 ...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

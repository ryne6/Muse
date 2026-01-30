import { useEffect, useRef } from 'react'
import { useConversationStore } from '@/stores/conversationStoreV2'
import { useChatStore } from '@/stores/chatStore'
import { MessageItem } from './MessageItem'

export function MessageList() {
  const { getCurrentConversation } = useConversationStore()
  const isLoading = useChatStore((state) => state.isLoading)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const conversation = getCurrentConversation()
  const currentMessages = conversation?.messages || []

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages])

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

  // Check if we should show loading indicator
  const lastMessage = currentMessages[currentMessages.length - 1]
  const showLoading = isLoading && lastMessage?.role === 'assistant' && !lastMessage?.content

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[800px] mx-auto px-6 py-6 space-y-6">
        {currentMessages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        {showLoading && (
          <div className="flex items-center gap-2 animate-breathing">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-sm text-muted-foreground">准备响应中 ...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

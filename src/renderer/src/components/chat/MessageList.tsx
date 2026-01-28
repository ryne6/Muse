import { useEffect, useRef } from 'react'
import { useConversationStore } from '@/stores/conversationStoreV2'
import { MessageItem } from './MessageItem'

export function MessageList() {
  const { getCurrentConversation } = useConversationStore()
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

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {currentMessages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  )
}

import { useConversationStore } from '@/stores/conversationStoreV2'

export function ChatHeader() {
  const { getCurrentConversation } = useConversationStore()
  const conversation = getCurrentConversation()
  const messageCount = conversation?.messages?.length || 0

  return (
    <div className="h-14 flex items-center justify-center px-6 bg-[hsl(var(--bg-main))]">
      <span className="text-sm text-[hsl(var(--text-muted))]">
        {messageCount} messages
      </span>
    </div>
  )
}

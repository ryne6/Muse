import { useConversationStore } from '~/stores/conversationStore'

export function ChatHeader() {
  const { getCurrentConversation } = useConversationStore()
  const conversation = getCurrentConversation()
  const messageCount = conversation?.messages?.length || 0

  return (
    <div
      className="h-14 flex items-center justify-center px-6"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <span
        className="text-sm text-[hsl(var(--text-muted))]"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {messageCount} messages
      </span>
    </div>
  )
}

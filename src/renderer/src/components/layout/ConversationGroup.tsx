import type { Conversation } from '~shared/types/conversation'
import { ConversationItem } from './ConversationItem'

interface ConversationGroupProps {
  label: string
  conversations: Conversation[]
}

export function ConversationGroup({
  label,
  conversations,
}: ConversationGroupProps) {
  return (
    <div className="space-y-1">
      <div className="px-3 py-1 text-xs text-muted-foreground">{label}</div>
      {conversations.map(conversation => (
        <ConversationItem key={conversation.id} conversation={conversation} />
      ))}
    </div>
  )
}

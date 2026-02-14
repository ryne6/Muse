import type { Conversation } from '~shared/types/conversation'
import { ConversationItem } from './ConversationItem'

interface ConversationGroupProps {
  label: string
  conversations: Conversation[]
  showText?: boolean
}

export function ConversationGroup({
  label,
  conversations,
  showText = true,
}: ConversationGroupProps) {
  return (
    <div className={showText ? 'space-y-1' : 'space-y-0.5'}>
      <div
        className={`px-3 text-xs text-muted-foreground overflow-hidden transition-all duration-200 ${
          showText ? 'py-1 opacity-100 max-h-6' : 'py-0 opacity-0 max-h-0'
        }`}
      >
        {label}
      </div>
      {conversations.map(conversation => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          showText={showText}
        />
      ))}
    </div>
  )
}

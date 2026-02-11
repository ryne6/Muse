import { Plus, MessageSquare } from 'lucide-react'
import { useConversationStore } from '@/stores/conversationStore'
import { useSearchStore } from '@/stores/searchStore'
import { Button } from '../ui/button'
import { ConversationGroup } from './ConversationGroup'
import { SearchBar } from './SearchBar'
import { SearchResults } from './SearchResults'
import { cn } from '@/utils/cn'
import type { Conversation } from '@shared/types/conversation'

function ConversationIconItem({ conversation }: { conversation: Conversation }) {
  const { currentConversationId, loadConversation } = useConversationStore()
  const isActive = currentConversationId === conversation.id

  return (
    <button
      className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
        isActive
          ? 'bg-[hsl(var(--border))] text-foreground'
          : 'hover:bg-black/5 text-[hsl(var(--text-muted))]'
      )}
      onClick={() => loadConversation(conversation.id)}
      title={conversation.title}
    >
      <MessageSquare className="w-4 h-4" />
    </button>
  )
}

interface ConversationListProps {
  showText?: boolean
}

export function ConversationList({ showText = true }: ConversationListProps) {
  const isCollapsed = !showText
  const { conversations, createConversation, getConversationsByDate } = useConversationStore()
  const { isOpen: isSearchOpen, results: searchResults } = useSearchStore()

  const conversationGroups = getConversationsByDate()
  const hasConversations = conversations.length > 0

  const handleNewChat = () => {
    createConversation()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with New Chat button */}
      <div className={cn(
        'border-b border-[hsl(var(--border))]',
        isCollapsed ? 'px-2 py-2 flex flex-col items-center' : 'px-3 pb-3 pt-1 space-y-2'
      )}>
        <Button
          onClick={handleNewChat}
          variant="ghost"
          size="sm"
          className={cn(
            'bg-white text-foreground border border-[hsl(var(--border))] shadow-sm hover:bg-white/90',
            isCollapsed ? 'w-9 h-9 p-0 justify-center' : 'w-full justify-start'
          )}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="ml-2">开启新话题</span>}
        </Button>
        {!isCollapsed && <SearchBar />}
      </div>

      {/* Search Results */}
      {!isCollapsed && isSearchOpen && searchResults.length > 0 && (
        <SearchResults />
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-1 py-2">
            {conversations.slice(0, 10).map((conv) => (
              <ConversationIconItem key={conv.id} conversation={conv} />
            ))}
          </div>
        ) : hasConversations ? (
          <div className="p-2 space-y-4">
            {conversationGroups.today.length > 0 && (
              <ConversationGroup label="# 今天" conversations={conversationGroups.today} />
            )}
            {conversationGroups.yesterday.length > 0 && (
              <ConversationGroup label="# 昨天" conversations={conversationGroups.yesterday} />
            )}
            {conversationGroups.lastWeek.length > 0 && (
              <ConversationGroup label="# 本周" conversations={conversationGroups.lastWeek} />
            )}
            {conversationGroups.lastMonth.length > 0 && (
              <ConversationGroup label="# 本月" conversations={conversationGroups.lastMonth} />
            )}
            {conversationGroups.older.length > 0 && (
              <ConversationGroup label="# 更早" conversations={conversationGroups.older} />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No conversations yet
              <br />
              Start a new chat to begin
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

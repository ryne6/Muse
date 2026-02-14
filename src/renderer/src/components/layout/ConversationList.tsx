import { Plus, MessageSquare } from 'lucide-react'
import { useConversationStore } from '~/stores/conversationStore'
import { useSearchStore } from '~/stores/searchStore'
import { Button } from '../ui/button'
import { ConversationGroup } from './ConversationGroup'
import { SearchBar } from './SearchBar'
import { SearchResults } from './SearchResults'
import { cn } from '~/utils/cn'

interface ConversationListProps {
  showText?: boolean
}

export function ConversationList({ showText = true }: ConversationListProps) {
  const isCollapsed = !showText
  const { conversations, createConversation, getConversationsByDate } =
    useConversationStore()
  const { isOpen: isSearchOpen, results: searchResults } = useSearchStore()

  const conversationGroups = getConversationsByDate()
  const hasConversations = conversations.length > 0

  const handleNewChat = () => {
    createConversation()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with New Chat button */}
      <div
        className={cn(
          'border-b border-[hsl(var(--border))]',
          isCollapsed ? 'px-2 py-2 flex flex-col' : 'px-3 pb-3 pt-1 space-y-2'
        )}
      >
        <Button
          onClick={handleNewChat}
          variant="ghost"
          className={cn(
            'bg-[hsl(var(--bg-main)/0.6)] text-foreground/80 backdrop-blur-sm',
            'rounded-lg hover:bg-[hsl(var(--bg-main)/0.8)] hover:text-foreground',
            'transition-colors duration-150',
            'h-9 w-full justify-start px-3 text-sm'
          )}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span
            className={cn(
              'ml-2 whitespace-nowrap overflow-hidden transition-all duration-200',
              isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-[120px]'
            )}
          >
            开启新话题
          </span>
        </Button>
        <div
          className={cn(
            'w-full overflow-hidden transition-all duration-200',
            isCollapsed
              ? 'max-h-0 opacity-0 pointer-events-none'
              : 'max-h-16 opacity-100'
          )}
        >
          <SearchBar />
        </div>
      </div>

      {/* Search Results */}
      {isSearchOpen && searchResults.length > 0 && (
        <div
          className={cn(
            'overflow-hidden transition-all duration-200',
            isCollapsed
              ? 'max-h-0 opacity-0 pointer-events-none'
              : 'max-h-[320px] opacity-100'
          )}
        >
          <SearchResults />
        </div>
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {hasConversations ? (
          <div className={cn('p-2', isCollapsed ? 'space-y-1' : 'space-y-4')}>
            {conversationGroups.today.length > 0 && (
              <ConversationGroup
                label="# 今天"
                conversations={conversationGroups.today}
                showText={!isCollapsed}
              />
            )}
            {conversationGroups.yesterday.length > 0 && (
              <ConversationGroup
                label="# 昨天"
                conversations={conversationGroups.yesterday}
                showText={!isCollapsed}
              />
            )}
            {conversationGroups.lastWeek.length > 0 && (
              <ConversationGroup
                label="# 本周"
                conversations={conversationGroups.lastWeek}
                showText={!isCollapsed}
              />
            )}
            {conversationGroups.lastMonth.length > 0 && (
              <ConversationGroup
                label="# 本月"
                conversations={conversationGroups.lastMonth}
                showText={!isCollapsed}
              />
            )}
            {conversationGroups.older.length > 0 && (
              <ConversationGroup
                label="# 更早"
                conversations={conversationGroups.older}
                showText={!isCollapsed}
              />
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

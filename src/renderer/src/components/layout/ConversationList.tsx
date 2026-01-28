import { Plus, MessageSquare } from 'lucide-react'
import { useConversationStore } from '@/stores/conversationStoreV2'
import { useSearchStore } from '@/stores/searchStore'
import { Button } from '../ui/button'
import { ConversationGroup } from './ConversationGroup'
import { SearchBar } from './SearchBar'
import { SearchResults } from './SearchResults'

export function ConversationList() {
  const { conversations, createConversation, getConversationsByDate } = useConversationStore()
  const { isOpen: isSearchOpen, results: searchResults } = useSearchStore()

  const conversationGroups = getConversationsByDate()
  const hasConversations = conversations.length > 0

  const handleNewChat = () => {
    createConversation()
  }

  return (
    <div className="flex flex-col h-full bg-secondary/30 border-r">
      {/* Header with New Chat button */}
      <div className="p-3 border-b bg-background/50 space-y-2">
        <Button
          onClick={handleNewChat}
          className="w-full justify-start"
          variant="default"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
        <SearchBar />
      </div>

      {/* Search Results */}
      {isSearchOpen && searchResults.length > 0 && (
        <SearchResults />
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {hasConversations ? (
          <div className="p-2 space-y-4">
            {conversationGroups.today.length > 0 && (
              <ConversationGroup label="Today" conversations={conversationGroups.today} />
            )}
            {conversationGroups.yesterday.length > 0 && (
              <ConversationGroup label="Yesterday" conversations={conversationGroups.yesterday} />
            )}
            {conversationGroups.lastWeek.length > 0 && (
              <ConversationGroup label="Last 7 Days" conversations={conversationGroups.lastWeek} />
            )}
            {conversationGroups.lastMonth.length > 0 && (
              <ConversationGroup label="Last 30 Days" conversations={conversationGroups.lastMonth} />
            )}
            {conversationGroups.older.length > 0 && (
              <ConversationGroup label="Older" conversations={conversationGroups.older} />
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

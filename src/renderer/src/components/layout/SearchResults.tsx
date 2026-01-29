import { useEffect, useRef } from 'react'
import { FileText, MessageSquare, Wrench, Image } from 'lucide-react'
import { useSearchStore } from '@/stores/searchStore'
import { useConversationStore } from '@/stores/conversationStoreV2'
import type { SearchResult, SearchContentType } from '@shared/types/search'
import { LoadingInline } from '@/components/ui/loading'

const contentTypeIcons: Record<SearchContentType, typeof FileText> = {
  conversation_title: FileText,
  message: MessageSquare,
  tool_call: Wrench,
  tool_result: Wrench,
  attachment_note: Image,
}

const contentTypeLabels: Record<SearchContentType, string> = {
  conversation_title: '标题',
  message: '消息',
  tool_call: '工具',
  tool_result: '结果',
  attachment_note: '图片',
}

export function SearchResults() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { results, total, hasMore, isLoading, error, loadMore } = useSearchStore()
  const { selectConversation } = useConversationStore()

  // Infinite scroll
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !isLoading) {
        loadMore()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMore, isLoading, loadMore])

  const handleResultClick = (result: SearchResult) => {
    selectConversation(result.conversationId)
    useSearchStore.getState().closeSearch()
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive text-sm">
        {error}
      </div>
    )
  }

  if (results.length === 0) {
    return null
  }

  // Group results by conversation
  const grouped = results.reduce((acc, result) => {
    if (!acc[result.conversationId]) {
      acc[result.conversationId] = {
        title: result.conversationTitle,
        results: [],
      }
    }
    acc[result.conversationId].results.push(result)
    return acc
  }, {} as Record<string, { title: string; results: SearchResult[] }>)

  return (
    <div ref={containerRef} className="max-h-[400px] overflow-y-auto">
      <div className="px-3 py-2 text-xs text-[hsl(var(--text-muted))] border-b border-[hsl(var(--border))]">
        {total} 条结果
      </div>

      {Object.entries(grouped).map(([convId, group]) => (
        <div key={convId} className="border-b border-[hsl(var(--border))] last:border-b-0">
          <div className="px-3 py-2 text-xs text-[hsl(var(--text-muted))] bg-[hsl(var(--surface-3))]">
            {group.title}
          </div>
          {group.results.map((result) => (
            <SearchResultItem
              key={result.id}
              result={result}
              onClick={() => handleResultClick(result)}
            />
          ))}
        </div>
      ))}

      {isLoading && (
        <LoadingInline />
      )}
    </div>
  )
}

interface SearchResultItemProps {
  result: SearchResult
  onClick: () => void
}

function SearchResultItem({ result, onClick }: SearchResultItemProps) {
  const Icon = contentTypeIcons[result.contentType]
  const label = contentTypeLabels[result.contentType]

  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2 text-left hover:bg-black/5 transition-colors"
    >
      <div className="flex items-start gap-2">
        <div className="flex items-center gap-1 text-xs text-[hsl(var(--text-muted))] shrink-0 mt-0.5">
          <Icon className="w-3 h-3" />
          <span>{label}</span>
        </div>
        <div
          className="text-sm line-clamp-2 text-[hsl(var(--text))]"
          dangerouslySetInnerHTML={{ __html: result.highlightedSnippet }}
        />
      </div>
    </button>
  )
}

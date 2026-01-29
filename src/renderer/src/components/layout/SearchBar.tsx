import { useEffect, useRef, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { useSearchStore } from '@/stores/searchStore'
import { Input } from '../ui/input'
import { Button } from '../ui/button'

export function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  const {
    isOpen,
    query,
    isLoading,
    openSearch,
    closeSearch,
    setQuery,
    search,
  } = useSearchStore()

  // Handle keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) {
          closeSearch()
        } else {
          openSearch()
        }
      }
      if (e.key === 'Escape' && isOpen) {
        closeSearch()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, openSearch, closeSearch])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Debounced search
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      search()
    }, 300)
  }, [setQuery, search])

  if (!isOpen) {
    return (
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--text-muted))] rounded-md hover:bg-black/5"
        onClick={openSearch}
        type="button"
      >
        <Search className="w-4 h-4" />
        <span>搜索</span>
      </button>
    )
  }

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--text-muted))]" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="搜索对话..."
        className="pl-9 pr-9 bg-white border-[hsl(var(--border))]"
      />
      {(query || isLoading) && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          onClick={closeSearch}
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

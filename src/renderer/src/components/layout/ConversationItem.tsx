import { useState } from 'react'
import { Star, MoreVertical, Trash2, Edit2 } from 'lucide-react'
import type { Conversation } from '@shared/types/conversation'
import { useConversationStore } from '@/stores/conversationStore'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

interface ConversationItemProps {
  conversation: Conversation
}

export function ConversationItem({ conversation }: ConversationItemProps) {
  const { currentConversationId, loadConversation, deleteConversation, renameConversation } =
    useConversationStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(conversation.title)

  const isActive = currentConversationId === conversation.id

  const handleClick = () => {
    loadConversation(conversation.id)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete "${conversation.title}"?`)) {
      deleteConversation(conversation.id)
    }
  }

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  const handleSaveRename = () => {
    if (editTitle.trim()) {
      renameConversation(conversation.id, editTitle.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename()
    } else if (e.key === 'Escape') {
      setEditTitle(conversation.title)
      setIsEditing(false)
    }
  }

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`group relative flex items-center gap-2 px-3 h-9 rounded-lg cursor-pointer transition-colors text-sm ${
        isActive
          ? 'bg-[hsl(var(--border))] text-foreground font-medium'
          : 'hover:bg-black/5 text-[hsl(var(--text))]'
      }`}
      onClick={handleClick}
      onKeyDown={handleItemKeyDown}
      aria-label={`Conversation: ${conversation.title}`}
      aria-current={isActive ? 'true' : undefined}
    >
      <Star className="w-4 h-4 shrink-0 text-[hsl(var(--text-muted))]" />

      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSaveRename}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-background border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="flex-1 min-w-0">
          <div className="truncate">{conversation.title}</div>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[hsl(var(--text-muted))]"
            aria-label="Conversation actions"
          >
            <MoreVertical className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleRename}>
            <Edit2 className="w-3 h-3 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="w-3 h-3 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

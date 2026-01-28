import { useState } from 'react'
import { MessageSquare, MoreVertical, Trash2, Edit2 } from 'lucide-react'
import type { Conversation } from '@shared/types/conversation'
import { useConversationStore } from '@/stores/conversationStoreV2'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

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
      className={`group relative flex items-center gap-2 px-2 h-9 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-[hsl(var(--surface-2))] text-foreground font-medium'
          : 'hover:bg-[hsl(var(--surface-3))] text-foreground'
      }`}
      onClick={handleClick}
      onKeyDown={handleItemKeyDown}
      aria-label={`Conversation: ${conversation.title}`}
      aria-current={isActive ? 'true' : undefined}
    >
      {/* Accent bar */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[hsl(var(--accent))] rounded-full" />
      )}
      <MessageSquare className="w-4 h-4 shrink-0" />

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
          <div className="text-sm truncate">{conversation.title}</div>
          <div className="text-xs text-[hsl(var(--text-muted))] truncate">
            {formatRelativeTime(conversation.updatedAt)}
          </div>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
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

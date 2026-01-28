import type { Message } from '@shared/types/conversation'
import { User, Bot } from 'lucide-react'
import { cn } from '@/utils/cn'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ToolCallsList } from './ToolCallsList'
import { MessageImage } from './MessageImage'

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface MessageItemProps {
  message: Message
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user'
  const hasAttachments = message.attachments && message.attachments.length > 0

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
        isUser ? 'bg-[hsl(var(--surface-2))]' : 'bg-[hsl(var(--accent))] text-white'
      )}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Content */}
      <div className="max-w-[85%]">
        {/* Header */}
        <div className={cn(
          'flex items-center gap-2 mb-1',
          isUser ? 'justify-end' : 'justify-start'
        )}>
          <span className="text-sm font-medium text-[hsl(var(--text-strong))]">
            {isUser ? 'You' : 'Assistant'}
          </span>
          <span className="text-xs text-[hsl(var(--text-muted))]">
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Body */}
        <div
          className={cn(
            isUser
              ? 'rounded-lg px-4 py-3 border border-border bg-background text-foreground'
              : 'text-foreground'
          )}
        >
        {/* Tool Calls (只在 AI 消息中显示) */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallsList toolCalls={message.toolCalls} toolResults={message.toolResults} />
        )}

        {/* Attachments */}
        {hasAttachments && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.attachments!.map((attachment) => (
              <MessageImage key={attachment.id} attachment={attachment} />
            ))}
          </div>
        )}

        {/* Message Content */}
        {message.content && (
          <>
            {isUser ? (
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}
          </>
        )}
        </div>
      </div>
    </div>
  )
}

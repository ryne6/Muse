import type { Message } from '@shared/types/conversation'
import logoImage from '@/assets/providers/logo.png'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ToolCallsList } from './ToolCallsList'
import { MessageImage } from './MessageImage'
import { ThinkingBlock } from './ThinkingBlock'

function formatTime(timestamp?: number): string {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface MessageItemProps {
  message: Message
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user'
  const hasAttachments = message.attachments && message.attachments.length > 0
  const timestamp = formatTime(message.timestamp)

  const contentBody = (
    <>
      {/* Thinking Process (只在 AI 消息中显示) */}
      {!isUser && message.thinking && (
        <ThinkingBlock thinking={message.thinking} />
      )}

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
    </>
  )

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          data-user-bubble
          className="max-w-[80%] rounded-xl px-4 py-2.5 bg-[hsl(var(--surface-2))] text-foreground"
        >
          {contentBody}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[hsl(var(--surface-2))]">
        <img src={logoImage} alt="Muse" className="w-full h-full object-cover rounded-full" />
      </div>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 text-xs text-[hsl(var(--text-muted))]">
          <span className="text-sm font-semibold text-foreground">Lobe AI</span>
          {timestamp ? (
            <span className="ml-auto text-[hsl(var(--text-muted))]">{timestamp}</span>
          ) : null}
        </div>

        {/* Body */}
        <div className="text-foreground">
          {contentBody}
        </div>
      </div>
    </div>
  )
}

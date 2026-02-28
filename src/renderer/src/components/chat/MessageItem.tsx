import { memo, useCallback } from 'react'
import logoImage from '~/assets/providers/logo.png'
import { useConversationStore } from '~/stores/conversationStore'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ToolCallsList } from './ToolCallsList'
import { MessageImage } from './MessageImage'
import { ThinkingBlock } from './ThinkingBlock'
import { MessageStats } from './MessageStats'
import { CompressedSummary } from './CompressedSummary'

function formatTime(timestamp?: number): string {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface MessageItemProps {
  id: string
}

// ID 驱动 + memo，配合 updateMessage 保持引用不变，避免流式期间历史消息重渲染
export const MessageItem = memo<MessageItemProps>(function MessageItem({ id }) {
  const message = useConversationStore(
    useCallback(
      s =>
        s.conversations
          .find(c => c.id === s.currentConversationId)
          ?.messages.find(m => m.id === id),
      [id]
    )
  )

  if (!message) return null

  // 摘要消息：渲染 CompressedSummary 组件
  if (message.summaryOf && message.summaryOf.length > 0) {
    return (
      <div className="animate-fade-in-up">
        <CompressedSummary
          content={message.content}
          compressedCount={message.summaryOf.length}
        />
      </div>
    )
  }

  // 已压缩的消息不渲染
  if (message.compressed) return null

  const isUser = message.role === 'user'
  const hasAttachments = message.attachments && message.attachments.length > 0
  const timestamp = formatTime(message.timestamp)
  const contentBody = (
    <>
      {/* 思考过程（只在 AI 消息中显示） */}
      {!isUser && message.thinking && (
        <ThinkingBlock
          thinking={message.thinking}
          isComplete={!!message.content}
        />
      )}

      {/* Tool Calls（只在 AI 消息中显示） */}
      {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
        <ToolCallsList
          toolCalls={message.toolCalls}
          toolResults={message.toolResults}
        />
      )}

      {/* 附件 */}
      {hasAttachments && (
        <div className="flex flex-wrap gap-2 mb-2">
          {message.attachments!.map(attachment => (
            <MessageImage key={attachment.id} attachment={attachment} />
          ))}
        </div>
      )}

      {/* 消息内容 */}
      {message.content && (
        <>
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          ) : (
            <MarkdownRenderer
              content={message.content}
              animated={!message.durationMs}
            />
          )}
        </>
      )}

      {/* Token 统计（仅 assistant） */}
      {!isUser && (
        <MessageStats
          inputTokens={message.inputTokens}
          outputTokens={message.outputTokens}
          durationMs={message.durationMs}
        />
      )}
    </>
  )

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in-up">
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
        <img
          src={logoImage}
          alt="Crow"
          className="w-full h-full object-cover rounded-full"
        />
      </div>

      {/* 消息内容 */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 text-xs text-[hsl(var(--text-muted))]">
          <span className="text-sm font-semibold text-foreground">Crow</span>
          {timestamp ? (
            <span className="ml-auto text-[hsl(var(--text-muted))]">
              {timestamp}
            </span>
          ) : null}
        </div>

        {/* Body */}
        <div className="text-foreground">{contentBody}</div>
      </div>
    </div>
  )
})

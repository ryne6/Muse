import { useCallback } from 'react'
import { Zap, X } from 'lucide-react'
import { useChatStore } from '~/stores/chatStore'

// 消息缓冲队列 UI，紧贴 ChatInput 上方显示
export function MessageBuffer() {
  const messageBuffer = useChatStore(s => s.messageBuffer)
  const sendBufferItem = useChatStore(s => s.sendBufferItem)
  const dequeueMessage = useChatStore(s => s.dequeueMessage)

  const handleSend = useCallback(
    (id: string) => sendBufferItem(id),
    [sendBufferItem]
  )

  const handleRemove = useCallback(
    (id: string) => dequeueMessage(id),
    [dequeueMessage]
  )

  if (messageBuffer.length === 0) return null

  return (
    <div className="relative z-30 border-t border-border/50 bg-background/95 backdrop-blur-sm px-4 py-2">
      <div className="flex items-center gap-2 mb-1.5 text-xs text-[hsl(var(--text-muted))]">
        <span>缓冲队列 ({messageBuffer.length})</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {messageBuffer.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 bg-[hsl(var(--surface-2))] animate-fade-in-up"
          >
            <span className="text-xs text-[hsl(var(--text-muted))] shrink-0">
              {index + 1}
            </span>
            <span className="flex-1 text-sm truncate">
              {item.content.slice(0, 50)}
              {item.content.length > 50 ? '...' : ''}
            </span>
            <button
              onClick={() => handleSend(item.id)}
              className="shrink-0 p-1 rounded hover:bg-[hsl(var(--surface-3))] text-[hsl(var(--text-muted))] hover:text-foreground transition-colors"
              title="立即发送"
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleRemove(item.id)}
              className="shrink-0 p-1 rounded hover:bg-[hsl(var(--surface-3))] text-[hsl(var(--text-muted))] hover:text-foreground transition-colors"
              title="删除"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

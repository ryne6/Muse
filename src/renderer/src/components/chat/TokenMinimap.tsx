import { memo, useCallback, useMemo } from 'react'
import { useConversationStore } from '~/stores/conversationStore'
import { useChatStore } from '~/stores/chatStore'
import type { Message } from '~shared/types/conversation'

const MIN_WIDTH = 4
const MAX_WIDTH = 32

interface BarData {
  index: number // messages 数组中的索引，用于 scrollToIndex
  tokens: number
  preview: string // 用户消息预览，用于 tooltip
  hasReply: boolean // 是否有 AI 回复
}

export const TokenMinimap = memo(function TokenMinimap() {
  const messages = useConversationStore(s => {
    const conv = s.conversations.find(c => c.id === s.currentConversationId)
    return conv?.messages ?? []
  })

  const scrollToIndex = useChatStore(s => s.scrollToIndex)

  // 构建横条数据：每条 user 消息 + 对应 assistant 回复的 outputTokens
  const bars = useMemo(() => {
    const result: BarData[] = []
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      if (msg.role !== 'user') continue

      let tokens = 0
      let hasReply = false
      const next: Message | undefined = messages[i + 1]
      if (next?.role === 'assistant') {
        hasReply = true
        if (next.outputTokens) tokens = next.outputTokens
      }
      // 消息预览：截取前 40 字符
      const preview = msg.content.slice(0, 40) + (msg.content.length > 40 ? '...' : '')
      result.push({ index: i, tokens, preview, hasReply })
    }
    return result
  }, [messages])

  const maxTokens = useMemo(
    () => Math.max(...bars.map(b => b.tokens), 0),
    [bars]
  )

  const handleBarClick = useCallback(
    (index: number) => {
      scrollToIndex(index)
    },
    [scrollToIndex]
  )

  // 用户消息少于 3 条时不显示
  if (bars.length < 3) return null

  return (
    <div
      className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-[3px] rounded-md bg-black/10 dark:bg-white/10 px-1 py-1.5 opacity-40 hover:opacity-80 transition-opacity"
      style={{ maxHeight: '60vh', maxWidth: 48 }}
    >
      {bars.map((bar, i) => {
        const w =
          maxTokens > 0
            ? Math.max(MIN_WIDTH, (bar.tokens / maxTokens) * MAX_WIDTH)
            : MIN_WIDTH

        // 有 AI 回复用蓝色，无回复用灰色区分
        const barColor = bar.hasReply
          ? 'bg-blue-400/70 hover:bg-blue-500'
          : 'bg-gray-400/50 hover:bg-gray-500'

        // tooltip：消息预览 + token 数
        const tooltip = bar.tokens > 0
          ? `${bar.preview}\n${bar.tokens} tokens`
          : bar.preview

        return (
          <button
            key={i}
            type="button"
            onClick={() => handleBarClick(bar.index)}
            className={`h-[4px] rounded-sm ${barColor} transition-colors cursor-pointer shrink-0 ml-auto`}
            style={{ width: w }}
            title={tooltip}
          />
        )
      })}
    </div>
  )
})

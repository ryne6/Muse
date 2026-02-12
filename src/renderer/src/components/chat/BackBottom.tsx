// Based on: https://github.com/lobehub/lobe-chat/blob/main/src/features/Conversation/ChatList/components/BackBottom/index.tsx
// License: MIT

import { ArrowDown } from 'lucide-react'
import { useChatStore } from '@/stores/chatStore'

// 浮动按钮，放在 VList 外部（绝对定位），上滚时出现
export function BackBottom() {
  const atBottom = useChatStore(s => s.atBottom)
  const scrollToBottom = useChatStore(s => s.scrollToBottom)

  if (atBottom) return null

  return (
    <button
      onClick={() => scrollToBottom(true)}
      className="absolute bottom-4 right-4 z-10 flex items-center justify-center
                 w-8 h-8 rounded-full bg-[hsl(var(--surface-2))] border border-border
                 shadow-md hover:bg-[hsl(var(--surface-3))] transition-all
                 animate-fade-in-up"
      aria-label="滚动到底部"
    >
      <ArrowDown className="w-4 h-4 text-muted-foreground" />
    </button>
  )
}

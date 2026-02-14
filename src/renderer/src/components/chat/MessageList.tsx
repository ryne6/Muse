// Based on: https://github.com/lobehub/lobe-chat/blob/main/src/features/Conversation/ChatList/components/VirtualizedList.tsx
// License: MIT

import { useEffect, useRef, useCallback } from 'react'
import { VList, type VListHandle } from 'virtua'
import {
  useConversationStore,
  selectCurrentMessageIds,
} from '~/stores/conversationStore'
import { useChatStore } from '~/stores/chatStore'
import { useShallow } from 'zustand/react/shallow'
import { MessageItem } from './MessageItem'
import { AutoScroll } from './AutoScroll'
import { BackBottom } from './BackBottom'

const AT_BOTTOM_THRESHOLD = 100

export function MessageList() {
  const currentConversationId = useConversationStore(
    s => s.currentConversationId
  )
  const loadingConversationId = useConversationStore(
    s => s.loadingConversationId
  )
  const messageIds = useConversationStore(useShallow(selectCurrentMessageIds))
  const isLoading = useChatStore(s => s.isLoading)
  const setScrollState = useChatStore(s => s.setScrollState)
  const registerScrollMethods = useChatStore(s => s.registerScrollMethods)

  const virtuaRef = useRef<VListHandle>(null)
  const scrollEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 注册滚动方法到 store，供 AutoScroll / BackBottom 调用
  // key={conversationId} 会导致 VList 重新挂载，用 rAF 确保 ref 已赋值
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (virtuaRef.current) {
        registerScrollMethods({
          scrollToIndex: (index, options) => {
            virtuaRef.current?.scrollToIndex(index, {
              align: options?.align as
                | 'start'
                | 'center'
                | 'end'
                | 'nearest'
                | undefined,
              smooth: options?.smooth,
            })
          },
        })
      }
    })
    return () => {
      cancelAnimationFrame(raf)
      registerScrollMethods(null)
    }
  }, [registerScrollMethods, currentConversationId])

  // VList onScroll 签名: (offset: number) => void
  const handleScroll = useCallback(
    (offset: number) => {
      const handle = virtuaRef.current
      if (!handle) return
      const atBottom =
        handle.scrollSize - offset - handle.viewportSize <= AT_BOTTOM_THRESHOLD
      setScrollState({ atBottom, isScrolling: true })

      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current)
      scrollEndTimerRef.current = setTimeout(() => {
        setScrollState({ isScrolling: false })
      }, 150)
    },
    [setScrollState]
  )

  // 加载中状态
  if (
    loadingConversationId === currentConversationId &&
    currentConversationId
  ) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
          <span>加载中...</span>
        </div>
      </div>
    )
  }

  // 无对话
  if (!currentConversationId) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">Start a new conversation</p>
          <p className="text-sm">
            Click &quot;New Chat&quot; or start typing below
          </p>
        </div>
      </div>
    )
  }

  // 空消息
  if (messageIds.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">Start a conversation</p>
          <p className="text-sm">Type a message below to begin</p>
        </div>
      </div>
    )
  }

  // 状态指示器数据
  const lastMessageId = messageIds[messageIds.length - 1]

  return (
    <div className="flex-1 min-h-0 relative">
      <VList
        key={currentConversationId}
        ref={virtuaRef}
        data={messageIds}
        bufferSize={typeof window !== 'undefined' ? window.innerHeight : 800}
        style={{ height: '100%', overflowAnchor: 'none' }}
        onScroll={handleScroll}
      >
        {(messageId, index) => {
          const isLast = index === messageIds.length - 1
          return (
            <div key={messageId} className="px-6 py-3">
              <MessageItem id={messageId} />
              {isLast && <AutoScroll />}
              {isLast && <div className="h-6" />}
            </div>
          )
        }}
      </VList>

      {/* 状态指示器：VList 外部绝对定位 */}
      <StatusIndicator lastMessageId={lastMessageId} isLoading={isLoading} />

      {/* 回到底部按钮 */}
      <BackBottom />
    </div>
  )
}

// 准备响应中 / 正在生成 指示器
function StatusIndicator({
  lastMessageId,
  isLoading,
}: {
  lastMessageId: string
  isLoading: boolean
}) {
  const lastMessage = useConversationStore(
    useCallback(
      s => {
        const conv = s.conversations.find(c => c.id === s.currentConversationId)
        return conv?.messages.find(m => m.id === lastMessageId)
      },
      [lastMessageId]
    )
  )

  if (!isLoading || !lastMessage || lastMessage.role !== 'assistant')
    return null

  const showPreparing = !lastMessage.content
  const showGenerating = !!lastMessage.content

  if (showPreparing) {
    return (
      <div className="absolute bottom-2 left-0 right-0 flex items-center gap-2 animate-breathing ml-17 px-6">
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        <span className="text-sm text-muted-foreground">准备响应中 ...</span>
      </div>
    )
  }

  if (showGenerating) {
    return (
      <div className="absolute bottom-2 left-0 right-0 flex items-center gap-2 animate-breathing ml-17 px-6">
        <span className="w-2 h-2 rounded-full bg-blue-400" />
        <span className="text-sm text-muted-foreground">正在生成 ...</span>
      </div>
    )
  }

  return null
}

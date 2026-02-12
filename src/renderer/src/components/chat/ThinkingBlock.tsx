import { memo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ScrollArea } from '@lobehub/ui'

interface ThinkingBlockProps {
  thinking: string
  isComplete?: boolean
}

export const ThinkingBlock = memo<ThinkingBlockProps>(function ThinkingBlock({
  thinking,
  isComplete = false,
}) {
  const [isFullExpanded, setIsFullExpanded] = useState(false)

  if (!thinking) return null

  return (
    <div className="mb-3 relative group">
      {/* 头部标题 */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-muted-foreground">
          {isComplete ? 'Thought for a moment' : 'Thinking...'}
        </span>
      </div>

      {/* 内容区域 */}
      {isFullExpanded ? (
        <ScrollArea scrollFade style={{ maxHeight: 300 }}>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {thinking}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-[4.5rem] overflow-hidden group-hover:overflow-auto">
          {thinking}
        </div>
      )}

      {/* 悬浮时显示展开按钮（仅当内容超长时） */}
      {!isFullExpanded && thinking.length > 200 && (
        <button
          onClick={() => setIsFullExpanded(true)}
          className="absolute bottom-0 right-0 flex items-center gap-1 px-2 py-0.5 text-xs
                     text-muted-foreground bg-[hsl(var(--surface-2))] rounded
                     opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronDown className="w-3 h-3" />
          展开
        </button>
      )}

      {/* 展开后显示收起按钮 */}
      {isFullExpanded && (
        <button
          onClick={() => setIsFullExpanded(false)}
          className="absolute bottom-0 right-0 flex items-center gap-1 px-2 py-0.5 text-xs
                     text-muted-foreground bg-[hsl(var(--surface-2))] rounded
                     opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronUp className="w-3 h-3" />
          收起
        </button>
      )}
    </div>
  )
})

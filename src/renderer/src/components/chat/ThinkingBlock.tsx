import { useState } from 'react'
import { ChevronDown, ChevronRight, Brain } from 'lucide-react'

interface ThinkingBlockProps {
  thinking: string
}

export function ThinkingBlock({ thinking }: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!thinking) return null

  return (
    <div className="mb-3 border border-[hsl(var(--border))] rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-[hsl(var(--surface-1))] hover:bg-[hsl(var(--surface-2))] transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        <Brain className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium">Thinking Process</span>
        <span className="text-xs text-[hsl(var(--text-muted))] ml-auto">
          {thinking.length} chars
        </span>
      </button>
      {isExpanded && (
        <div className="px-3 py-2 text-sm text-[hsl(var(--text-muted))] whitespace-pre-wrap max-h-[400px] overflow-y-auto">
          {thinking}
        </div>
      )}
    </div>
  )
}

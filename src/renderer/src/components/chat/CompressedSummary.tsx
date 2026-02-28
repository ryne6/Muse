import { useState, memo } from 'react'
import { ChevronRight } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'

interface CompressedSummaryProps {
  content: string
  compressedCount: number
}

export const CompressedSummary = memo<CompressedSummaryProps>(
  function CompressedSummary({ content, compressedCount }) {
    const [expanded, setExpanded] = useState(false)

    return (
      <div className="border border-dashed border-[hsl(var(--border))] rounded-lg px-4 py-3 text-sm text-[hsl(var(--text-muted))]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full text-left"
        >
          <ChevronRight
            className={`w-4 h-4 shrink-0 transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
          />
          <span>已压缩 {compressedCount} 条早期消息</span>
        </button>
        {expanded && (
          <div className="mt-3 pt-3 border-t border-dashed border-[hsl(var(--border))]">
            <MarkdownRenderer content={content} />
          </div>
        )}
      </div>
    )
  }
)

import { memo } from 'react'
import { Markdown } from '@lobehub/ui'

interface MarkdownRendererProps {
  content: string
  animated?: boolean
}

// memo + content 字符串比较，避免流式期间历史消息重复解析
export const MarkdownRenderer = memo<MarkdownRendererProps>(
  function MarkdownRenderer({ content, animated }) {
    return (
      <div className="overflow-x-auto max-w-full">
        <Markdown
          className="prose prose-sm max-w-none"
          variant="chat"
          enableImageGallery
          animated={animated}
        >
          {content}
        </Markdown>
      </div>
    )
  },
  (prev, next) => prev.content === next.content && prev.animated === next.animated
)

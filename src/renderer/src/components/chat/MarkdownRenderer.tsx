import { Markdown } from '@lobehub/ui'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="overflow-x-auto max-w-full">
      <Markdown
        className="prose prose-sm max-w-none"
        enableImageGallery
      >
        {content}
      </Markdown>
    </div>
  )
}

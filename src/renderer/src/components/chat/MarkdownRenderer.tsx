import { Markdown } from '@lobehub/ui'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <Markdown
      className="prose prose-sm max-w-none"
      enableImageGallery
    >
      {content}
    </Markdown>
  )
}

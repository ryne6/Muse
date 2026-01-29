import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import type { Components } from 'react-markdown'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

interface CodeBlockProps {
  inline?: boolean
  className?: string
  children?: React.ReactNode
}

function CodeBlock({ inline, className, children, ...props }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const code = String(children).replace(/\n$/, '')

  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded bg-[hsl(var(--surface-2))] text-sm font-mono text-foreground">
        {children}
      </code>
    )
  }

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative my-4 rounded-lg border border-[hsl(var(--border))] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[hsl(var(--surface-3))] border-b border-[hsl(var(--border))]">
        <span className="text-xs font-medium text-[hsl(var(--text-muted))]">
          {language || 'code'}
        </span>
        <CopyToClipboard text={code} onCopy={handleCopy}>
          <button
            className="flex items-center gap-1 text-xs text-[hsl(var(--text-muted))] hover:text-foreground transition-colors"
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </CopyToClipboard>
      </div>

      {/* Code Content */}
      {language ? (
        <SyntaxHighlighter
          language={language}
          style={oneLight}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '0.875rem',
            padding: '1rem',
          }}
          {...props}
        >
          {code}
        </SyntaxHighlighter>
      ) : (
        <pre className="bg-[hsl(var(--surface-2))] p-4 overflow-x-auto">
          <code className="text-sm font-mono">{code}</code>
        </pre>
      )}
    </div>
  )
}

const markdownComponents: Components = {
  code: CodeBlock as any,

  // Headings
  h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-foreground">{children}</h1>,
  h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-3 text-foreground">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-foreground">{children}</h3>,
  h4: ({ children }) => <h4 className="text-base font-semibold mt-3 mb-2 text-foreground">{children}</h4>,

  // Paragraph
  p: ({ children }) => <p className="mb-4 text-[15px] leading-[1.6] text-foreground">{children}</p>,

  // Lists
  ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-1 text-foreground">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-1 text-foreground">{children}</ol>,
  li: ({ children }) => <li className="leading-7">{children}</li>,

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
      {children}
    </blockquote>
  ),

  // Link
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {children}
    </a>
  ),

  // Table
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full divide-y divide-border border border-border rounded-lg">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-secondary">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-2 text-left text-sm font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }) => <td className="px-4 py-2 text-sm text-foreground">{children}</td>,

  // Horizontal rule
  hr: () => <hr className="my-6 border-border" />,

  // Emphasis
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,

  // Delete
  del: ({ children }) => <del className="line-through text-muted-foreground">{children}</del>,
}

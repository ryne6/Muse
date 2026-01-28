/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownRenderer } from '../MarkdownRenderer'

/**
 * MarkdownRenderer 组件测试
 *
 * 测试目标：
 * - 基本 Markdown 渲染
 * - 代码块渲染
 * - 内联代码渲染
 * - 链接渲染
 */

// Mock external libraries to simplify testing
vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children, language }: any) => (
    <pre data-testid="syntax-highlighter" data-language={language}>
      <code>{children}</code>
    </pre>
  )
}))

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneLight: {}
}))

describe('MarkdownRenderer', () => {
  describe('基本渲染测试', () => {
    it('should render plain text', () => {
      render(<MarkdownRenderer content="Hello, world!" />)

      expect(screen.getByText('Hello, world!')).toBeInTheDocument()
    })

    it('should render paragraph', () => {
      render(<MarkdownRenderer content="This is a paragraph." />)

      expect(screen.getByText('This is a paragraph.')).toBeInTheDocument()
    })

    it('should render heading', () => {
      render(<MarkdownRenderer content="# Heading 1" />)

      expect(screen.getByRole('heading', { level: 1, name: 'Heading 1' })).toBeInTheDocument()
    })
  })

  describe('代码渲染测试', () => {
    it('should render inline code', () => {
      render(<MarkdownRenderer content="This is `inline code` text." />)

      const codeElement = screen.getByText('inline code')
      expect(codeElement).toBeInTheDocument()
      expect(codeElement.tagName).toBe('CODE')
    })

    it('should render code block with language', () => {
      const codeContent = '```javascript\nconst x = 1;\n```'
      render(<MarkdownRenderer content={codeContent} />)

      const syntaxHighlighter = screen.getByTestId('syntax-highlighter')
      expect(syntaxHighlighter).toBeInTheDocument()
      expect(syntaxHighlighter).toHaveAttribute('data-language', 'javascript')
    })

    it('should render code block without language', () => {
      const codeContent = '```\nplain code\n```'
      render(<MarkdownRenderer content={codeContent} />)

      expect(screen.getByText('plain code')).toBeInTheDocument()
    })
  })

  describe('链接和列表渲染测试', () => {
    it('should render links', () => {
      render(<MarkdownRenderer content="[Click here](https://example.com)" />)

      const link = screen.getByRole('link', { name: 'Click here' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', 'https://example.com')
      expect(link).toHaveAttribute('target', '_blank')
    })

    it('should render unordered list', () => {
      const listContent = '- Item 1\n- Item 2\n- Item 3'
      render(<MarkdownRenderer content={listContent} />)

      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
      expect(screen.getByText('Item 3')).toBeInTheDocument()
    })
  })
})

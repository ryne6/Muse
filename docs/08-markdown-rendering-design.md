# F005 - Markdown 渲染和代码高亮设计文档

## 1. 功能概述

实现 Markdown 渲染和代码语法高亮，提升 AI 响应的可读性。

### 核心功能
- Markdown 解析和渲染
- 代码块语法高亮
- 支持常见编程语言
- 代码复制按钮
- 链接支持
- 列表、表格等 Markdown 元素

## 2. 技术选型

### Markdown 渲染
- **react-markdown**: React 的 Markdown 渲染组件
- **remark-gfm**: GitHub Flavored Markdown 支持

### 代码高亮
- **react-syntax-highlighter**: 代码语法高亮组件
- **prism-react-renderer**: 或使用 Prism 主题

### 代码复制
- **react-copy-to-clipboard**: 复制到剪贴板功能

## 3. 组件设计

### 3.1 MarkdownRenderer 组件

```typescript
// src/renderer/src/components/chat/MarkdownRenderer.tsx

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: CodeBlock,
        // 自定义其他元素样式
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function CodeBlock({ inline, className, children, ...props }) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const code = String(children).replace(/\n$/, '')

  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded bg-secondary text-sm font-mono">
        {children}
      </code>
    )
  }

  const handleCopy = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <CopyToClipboard text={code} onCopy={handleCopy}>
        <button className="absolute right-2 top-2 p-2 rounded bg-secondary/80 opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </CopyToClipboard>

      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
        }}
        {...props}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
```

### 3.2 自定义 Markdown 样式

```typescript
// 自定义各种 Markdown 元素

components={{
  code: CodeBlock,

  // 标题
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold mt-6 mb-4">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
  ),

  // 段落
  p: ({ children }) => (
    <p className="mb-4 leading-7">{children}</p>
  ),

  // 列表
  ul: ({ children }) => (
    <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="leading-7">{children}</li>
  ),

  // 引用
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
      {children}
    </blockquote>
  ),

  // 链接
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

  // 表格
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full divide-y divide-border">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-secondary">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2 text-left text-sm font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2 text-sm">{children}</td>
  ),

  // 水平线
  hr: () => <hr className="my-6 border-border" />,

  // 强调
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
}
```

## 4. 集成到 MessageItem

```typescript
// src/renderer/src/components/chat/MessageItem.tsx (updated)

import { MarkdownRenderer } from './MarkdownRenderer'

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user'

  return (
    <div className={/* ... */}>
      {isUser ? (
        // 用户消息：保持纯文本
        <div className="whitespace-pre-wrap">{message.content}</div>
      ) : (
        // AI 消息：使用 Markdown 渲染
        <MarkdownRenderer content={message.content} />
      )}
    </div>
  )
}
```

## 5. 依赖安装

```bash
npm install react-markdown remark-gfm react-syntax-highlighter react-copy-to-clipboard
npm install --save-dev @types/react-syntax-highlighter @types/react-copy-to-clipboard
```

## 6. 支持的语言

react-syntax-highlighter 支持 100+ 编程语言，包括：
- JavaScript/TypeScript
- Python
- Java
- C/C++
- Go
- Rust
- Ruby
- PHP
- SQL
- HTML/CSS
- Shell/Bash
- JSON/YAML
- Markdown
- 等等...

## 7. 代码块示例

### 输入 (AI 响应)
````markdown
Here's a simple React component:

```typescript
import React from 'react'

interface ButtonProps {
  onClick: () => void
  children: React.ReactNode
}

export function Button({ onClick, children }: ButtonProps) {
  return (
    <button onClick={onClick} className="px-4 py-2 bg-blue-500 text-white rounded">
      {children}
    </button>
  )
}
```

You can use it like this:

```tsx
<Button onClick={() => console.log('Clicked!')}>
  Click me
</Button>
```
````

### 输出 (渲染效果)
- 代码块带语法高亮
- 支持 TypeScript/TSX 识别
- 鼠标悬停显示复制按钮
- 点击复制代码到剪贴板
- 深色主题 (oneDark)

## 8. 样式优化

### 8.1 代码块样式
- 圆角边框
- 适当的内边距
- 深色背景 (与应用主题一致)
- 字体: 等宽字体
- 字号: 0.875rem (14px)
- 行高: 1.5

### 8.2 复制按钮
- 位置: 右上角
- 默认隐藏，悬停显示
- 复制成功显示勾号
- 2 秒后恢复复制图标

### 8.3 内联代码
- 浅色背景
- 圆角
- 小字号
- 等宽字体

## 9. 性能优化

- 使用 `react-syntax-highlighter/dist/esm` 按需加载
- 只加载需要的语言定义
- 代码块懒加载 (如果消息很长)
- Markdown 解析缓存

## 10. 实现步骤

1. ✅ 创建设计文档
2. 安装依赖
3. 创建 MarkdownRenderer 组件
4. 创建 CodeBlock 组件
5. 自定义 Markdown 元素样式
6. 集成到 MessageItem
7. 测试各种 Markdown 语法
8. 优化样式和性能

## 11. 测试用例

### 基础 Markdown
```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*
`inline code`

- List item 1
- List item 2

1. Numbered item 1
2. Numbered item 2

> Blockquote

[Link](https://example.com)
```

### 代码块
````markdown
```javascript
console.log('Hello World')
```

```python
def hello():
    print("Hello World")
```

```typescript
const greeting: string = "Hello World"
```
````

### 表格
```markdown
| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |
| Value 3  | Value 4  |
```

### 混合内容
```markdown
Here's how to create a React component:

1. Create a new file
2. Import React
3. Define the component:

```tsx
export function MyComponent() {
  return <div>Hello</div>
}
```

4. Export it
```

## 12. 后续增强

- 数学公式支持 (KaTeX)
- 图表支持 (Mermaid)
- 代码块折叠/展开
- 行号显示
- 代码块标题
- 语言图标
- 多主题切换

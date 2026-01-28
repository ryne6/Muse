# Muse 开发规范

**文档版本**: v1.0
**创建日期**: 2026-01-24

---

## 1. 项目初始化

### 1.1 环境要求

```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

**推荐版本**:
- Node.js: v18.19.0 LTS 或 v20.11.0 LTS
- npm: v9.0.0+
- pnpm: v8.0.0+ (可选，更快的包管理器)

---

### 1.2 开发工具

**必备**:
- VS Code (推荐)
- ESLint 插件
- Prettier 插件
- TypeScript 插件

**推荐**:
- Tailwind CSS IntelliSense
- GitLens
- Error Lens

---

## 2. 代码风格规范

### 2.1 TypeScript 规范

#### 命名约定

```typescript
// ✅ 类名: PascalCase
class UserService {}
class ChatStore {}

// ✅ 接口/类型: PascalCase
interface User {}
type MessageContent = string

// ✅ 枚举: PascalCase
enum MessageRole {
  User = 'user',
  Assistant = 'assistant'
}

// ✅ 函数: camelCase
function sendMessage() {}
const handleClick = () => {}

// ✅ 变量: camelCase
const userName = 'Alice'
let messageCount = 0

// ✅ 常量: UPPER_SNAKE_CASE
const MAX_RETRIES = 3
const API_BASE_URL = 'https://api.anthropic.com'

// ✅ 私有成员: 下划线前缀
class MyClass {
  private _privateField: string
}

// ✅ 文件名: kebab-case
chat-store.ts
user-service.ts
message-list.tsx
```

---

#### 类型定义

```typescript
// ✅ 优先使用 interface（可扩展）
interface User {
  id: string
  name: string
  email: string
}

// ✅ 使用 type 定义联合类型
type Theme = 'light' | 'dark' | 'system'

// ✅ 避免使用 any
// ❌ 错误
function process(data: any) {}

// ✅ 正确
function process(data: unknown) {}
function process<T>(data: T) {}

// ✅ 使用可选链和空值合并
const userName = user?.profile?.name ?? 'Anonymous'

// ✅ 明确函数返回类型
function getUser(): Promise<User | null> {
  // ...
}
```

---

#### 导入顺序

```typescript
// 1. 第三方库
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// 2. 项目内部模块（按路径层级）
import { ChatStore } from '@/stores/chatStore'
import { sendMessage } from '@/services/api'

// 3. 相对路径导入
import { Button } from '../ui/button'
import { formatDate } from './utils'

// 4. 类型导入（放在最后）
import type { User, Message } from '@/types'

// 5. CSS/样式（放在最后）
import './styles.css'
```

---

### 2.2 React 规范

#### 组件定义

```tsx
// ✅ 使用函数组件 + Hooks
import React from 'react'

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {children}
    </button>
  )
}

// ❌ 避免使用类组件（除非必要）
class OldButton extends React.Component {}
```

---

#### Hooks 使用规范

```tsx
// ✅ Hooks 放在组件顶部
function ChatView() {
  // 1. State
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

  // 2. Store
  const { sendMessage } = useChatStore()

  // 3. Refs
  const inputRef = useRef<HTMLInputElement>(null)

  // 4. Effects
  useEffect(() => {
    // 副作用逻辑
  }, [])

  // 5. Callbacks / Memoized values
  const handleSend = useCallback(() => {
    // ...
  }, [input])

  // 6. Render
  return <div>...</div>
}
```

---

#### 条件渲染

```tsx
// ✅ 使用 && 和三元运算符
{isLoading && <Spinner />}
{error ? <ErrorMessage /> : <Content />}

// ✅ 复杂条件抽取为变量
const showEmptyState = !isLoading && messages.length === 0
{showEmptyState && <EmptyState />}

// ❌ 避免复杂的嵌套
{isLoading ? (
  <Spinner />
) : error ? (
  <Error />
) : data ? (
  <Content data={data} />
) : (
  <Empty />
)}

// ✅ 改为提前返回
if (isLoading) return <Spinner />
if (error) return <Error />
if (!data) return <Empty />
return <Content data={data} />
```

---

### 2.3 ESLint 配置

`.eslintrc.js`:
```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    // TypeScript
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_'
    }],
    '@typescript-eslint/explicit-function-return-type': 'off',

    // React
    'react/react-in-jsx-scope': 'off', // React 17+ 不需要
    'react/prop-types': 'off', // 使用 TypeScript
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // 通用
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error'
  }
}
```

---

### 2.4 Prettier 配置

`.prettierrc`:
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

---

## 3. 文件组织规范

### 3.1 目录结构

```
src/
├── main/                       # Electron Main Process
│   ├── index.ts               # 主进程入口
│   ├── window.ts              # 窗口管理
│   ├── ipc/                   # IPC 处理
│   │   ├── index.ts           # 统一导出
│   │   ├── chat.ts
│   │   ├── files.ts
│   │   └── workspace.ts
│   └── utils/                 # 工具函数
│
├── api/                        # 独立 API 服务
│   ├── index.ts               # API 入口
│   ├── routes/                # 路由
│   │   ├── index.ts
│   │   ├── chat.ts
│   │   └── tools.ts
│   ├── services/              # 业务逻辑
│   │   ├── claude.ts          # Claude SDK
│   │   ├── storage.ts         # 数据存储
│   │   └── tools/             # 工具系统
│   │       ├── index.ts       # 工具注册
│   │       ├── base.ts        # 工具基类
│   │       ├── read.ts
│   │       ├── write.ts
│   │       ├── edit.ts
│   │       └── bash.ts
│   ├── types/                 # 类型定义
│   └── utils/
│
├── renderer/                   # React UI
│   ├── src/
│   │   ├── main.tsx           # React 入口
│   │   ├── App.tsx
│   │   │
│   │   ├── components/        # 组件
│   │   │   ├── ui/            # shadcn/ui 基础组件
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   └── card.tsx
│   │   │   │
│   │   │   ├── chat/          # Chat 相关组件
│   │   │   │   ├── ChatView.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageItem.tsx
│   │   │   │   └── ChatInput.tsx
│   │   │   │
│   │   │   ├── sidebar/       # 侧边栏组件
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── WorkspaceList.tsx
│   │   │   │   └── SessionList.tsx
│   │   │   │
│   │   │   ├── editor/        # 代码编辑器
│   │   │   │   └── CodeEditor.tsx
│   │   │   │
│   │   │   └── layout/        # 布局组件
│   │   │       ├── AppLayout.tsx
│   │   │       └── TitleBar.tsx
│   │   │
│   │   ├── pages/             # 页面
│   │   │   ├── Chat.tsx
│   │   │   └── Settings.tsx
│   │   │
│   │   ├── stores/            # Zustand 状态管理
│   │   │   ├── index.ts       # 统一导出
│   │   │   ├── chatStore.ts
│   │   │   ├── workspaceStore.ts
│   │   │   └── settingsStore.ts
│   │   │
│   │   ├── hooks/             # 自定义 Hooks
│   │   │   ├── useChat.ts
│   │   │   ├── useWorkspace.ts
│   │   │   └── useKeyboard.ts
│   │   │
│   │   ├── services/          # 前端服务层
│   │   │   └── ipc.ts         # IPC 调用封装
│   │   │
│   │   ├── utils/             # 工具函数
│   │   │   ├── cn.ts          # className 合并
│   │   │   ├── format.ts      # 格式化
│   │   │   └── storage.ts     # 本地存储
│   │   │
│   │   ├── types/             # 类型定义
│   │   │   ├── index.ts
│   │   │   ├── chat.ts
│   │   │   └── workspace.ts
│   │   │
│   │   ├── styles/            # 样式
│   │   │   ├── index.css      # 全局样式
│   │   │   └── globals.css
│   │   │
│   │   └── constants/         # 常量
│   │       └── index.ts
│   │
│   ├── index.html
│   └── vite.config.ts
│
└── shared/                     # 跨进程共享代码
    ├── types/                 # 共享类型
    │   ├── ipc.ts
    │   └── api.ts
    └── constants/             # 共享常量
        └── index.ts
```

---

### 3.2 文件命名规范

| 文件类型 | 命名规则 | 示例 |
|---------|---------|------|
| React 组件 | PascalCase.tsx | `ChatView.tsx` |
| 工具函数 | kebab-case.ts | `format-date.ts` |
| Hooks | camelCase.ts | `useChat.ts` |
| Store | camelCase.ts | `chatStore.ts` |
| 类型定义 | kebab-case.ts | `chat-types.ts` |
| 常量 | kebab-case.ts | `api-constants.ts` |
| 样式文件 | kebab-case.css | `chat-view.css` |

---

### 3.3 文件大小限制

**建议**:
- 单文件 < 300 行
- 单组件 < 200 行
- 超过限制应拆分成多个文件

**拆分策略**:
```tsx
// 大组件拆分
ChatView.tsx (200 lines)
├── MessageList.tsx (80 lines)
├── MessageItem.tsx (60 lines)
└── ChatInput.tsx (60 lines)
```

---

## 4. Git 工作流

### 4.1 分支策略

```
main          - 主分支，始终保持可发布状态
├── dev       - 开发分支，日常开发合并到这里
├── feature/* - 功能分支
├── fix/*     - 修复分支
└── release/* - 发布分支
```

**分支命名**:
```bash
feature/chat-ui          # 功能分支
fix/message-render-bug   # 修复分支
release/v1.0.0           # 发布分支
```

---

### 4.2 Commit 规范

**格式**:
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**:
- `feat`: 新功能
- `fix`: 修复 Bug
- `docs`: 文档修改
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**:
```bash
# 简单提交
feat(chat): add message streaming support

# 完整提交
feat(chat): add message streaming support

Implement streaming response from Claude API using Server-Sent Events.
This improves user experience by showing AI response in real-time.

Closes #123
```

---

### 4.3 Git Hooks

**使用 Husky + lint-staged**

`package.json`:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

`.husky/pre-commit`:
```bash
#!/bin/sh
npm run lint-staged
```

---

## 5. 注释规范

### 5.1 文件头注释

```typescript
/**
 * Chat Store
 *
 * 管理聊天相关的状态，包括消息列表、发送消息、工具调用等
 *
 * @module stores/chatStore
 */
```

---

### 5.2 函数注释

```typescript
/**
 * 发送消息到 AI
 *
 * @param content - 消息内容
 * @param sessionId - 会话 ID
 * @returns Promise<void>
 *
 * @example
 * await sendMessage('Hello', 'session-123')
 */
async function sendMessage(content: string, sessionId: string): Promise<void> {
  // 实现
}
```

---

### 5.3 行内注释

```typescript
// ✅ 解释为什么这样做
// 使用 setTimeout 避免 React 的批量更新导致闪烁
setTimeout(() => scrollToBottom(), 0)

// ❌ 不要重复代码的意思
// 设置 loading 为 true
setLoading(true)
```

---

## 6. 错误处理

### 6.1 统一错误处理

```typescript
// 定义错误类
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// 使用
throw new AppError('API_ERROR', 'Failed to send message', {
  status: 500
})
```

---

### 6.2 Try-Catch 规范

```typescript
// ✅ 具体捕获错误
try {
  await sendMessage(content)
} catch (error) {
  if (error instanceof AppError) {
    toast.error(error.message)
  } else {
    toast.error('Unknown error occurred')
    console.error(error)
  }
}

// ❌ 空的 catch
try {
  // ...
} catch (error) {
  // 什么都不做
}
```

---

### 6.3 Promise 错误处理

```typescript
// ✅ 使用 async/await + try-catch
async function loadData() {
  try {
    const data = await fetchData()
    return data
  } catch (error) {
    handleError(error)
  }
}

// ✅ 或使用 .catch()
fetchData()
  .then(data => {
    // 处理数据
  })
  .catch(error => {
    handleError(error)
  })
```

---

## 7. 性能优化

### 7.1 React 性能优化

```typescript
// ✅ 使用 React.memo 避免无效渲染
export const MessageItem = React.memo(({ message }: Props) => {
  return <div>{message.content}</div>
})

// ✅ 使用 useCallback 缓存函数
const handleClick = useCallback(() => {
  sendMessage(input)
}, [input, sendMessage])

// ✅ 使用 useMemo 缓存计算结果
const filteredMessages = useMemo(() => {
  return messages.filter(m => m.role === 'user')
}, [messages])

// ✅ 使用虚拟滚动处理大列表
import { VirtualList } from 'react-virtual'
```

---

### 7.2 Bundle 优化

```typescript
// ✅ 动态导入
const Settings = lazy(() => import('./pages/Settings'))

// ✅ 按需加载 Monaco Editor
const loadEditor = async () => {
  const monaco = await import('@monaco-editor/react')
  return monaco
}
```

---

## 8. 测试规范（可选）

### 8.1 单元测试

```typescript
import { describe, it, expect } from 'vitest'
import { formatDate } from './format'

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-24')
    expect(formatDate(date)).toBe('2024-01-24')
  })
})
```

---

### 8.2 组件测试

```tsx
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    screen.getByText('Click').click()
    expect(handleClick).toHaveBeenCalled()
  })
})
```

---

## 9. 文档规范

### 9.1 README.md

每个重要模块应有 README：
```
src/api/README.md        - API 服务文档
src/api/tools/README.md  - 工具系统文档
```

**内容包括**:
- 模块功能概述
- 快速开始
- API 文档
- 示例代码

---

### 9.2 CHANGELOG.md

```markdown
# Changelog

## [1.0.0] - 2026-01-24

### Added
- Chat 对话功能
- 工具系统（Read, Write, Edit, Bash）
- 多项目工作区

### Fixed
- 修复消息滚动问题

### Changed
- 优化 UI 样式
```

---

## 10. 开发流程

### 10.1 功能开发流程

1. **创建分支**
```bash
git checkout -b feature/message-streaming
```

2. **开发功能**
- 写代码
- 写注释
- 自测

3. **提交代码**
```bash
git add .
git commit -m "feat(chat): add message streaming"
```

4. **推送分支**
```bash
git push origin feature/message-streaming
```

5. **创建 PR**
- 填写 PR 描述
- 等待 Code Review
- 根据反馈修改

6. **合并到 dev**
```bash
git checkout dev
git merge feature/message-streaming
```

---

### 10.2 Code Review 检查项

**必查项**:
- [ ] 代码符合规范（ESLint 通过）
- [ ] 类型定义完整（无 any）
- [ ] 注释清晰（关键逻辑有注释）
- [ ] 无明显性能问题
- [ ] 无安全漏洞
- [ ] 功能测试通过

**建议查**:
- [ ] 代码可读性
- [ ] 命名是否语义化
- [ ] 是否有重复代码可抽取
- [ ] 是否有更优的实现方式

---

## 11. 开发工具配置

### 11.1 VS Code 配置

`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^\"'`]*)(?:'|\"|`)"]
  ]
}
```

---

### 11.2 推荐插件

`.vscode/extensions.json`:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "eamodio.gitlens",
    "usernamehw.errorlens"
  ]
}
```

---

## 12. 快捷开发命令

**package.json scripts**:
```json
{
  "scripts": {
    "dev": "vite",
    "dev:electron": "electron .",
    "build": "tsc && vite build",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

---

**文档结束**

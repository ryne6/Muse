# Conversation Management Design

## 概述
实现类似 Claude.ai、ChatGPT 的对话管理功能，允许用户创建、保存、加载、删除多个对话。

## 功能需求

### 1. 核心功能
- ✅ 创建新对话
- ✅ 自动保存当前对话
- ✅ 加载历史对话
- ✅ 删除对话
- ✅ 重命名对话
- ✅ 对话列表展示
- ✅ 对话搜索/过滤

### 2. 对话元数据
```typescript
interface Conversation {
  id: string                    // UUID
  title: string                 // 对话标题
  createdAt: number            // 创建时间戳
  updatedAt: number            // 最后更新时间戳
  messages: Message[]          // 消息列表
  provider?: string            // 使用的 AI provider
  model?: string               // 使用的模型
  contextFiles?: string[]      // 关联的文件路径
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
}
```

### 3. UI 设计

#### 3.1 侧边栏布局
```
┌─────────────────────────────────────┐
│ [+ New Chat]              [Search] │
├─────────────────────────────────────┤
│ Today                               │
│ • Fix TypeScript errors in...       │
│ • Implement authentication...       │
│                                     │
│ Yesterday                           │
│ • Add dark mode support             │
│ • Refactor API layer                │
│                                     │
│ Last 7 Days                         │
│ • Build landing page                │
│ • Setup CI/CD pipeline              │
│                                     │
│ Last 30 Days                        │
│ • Project initialization            │
│ • Setup database schema             │
├─────────────────────────────────────┤
│ [Settings Icon] Settings            │
└─────────────────────────────────────┘
```

#### 3.2 对话项操作
```
┌─────────────────────────────────────┐
│ • Fix TypeScript errors in...  [⋮] │  <- 悬停显示菜单按钮
│   ├─ Rename                         │
│   ├─ Delete                         │
│   └─ Export                         │
└─────────────────────────────────────┘
```

#### 3.3 空状态
```
┌─────────────────────────────────────┐
│                                     │
│         💬                          │
│                                     │
│    Start a new conversation         │
│                                     │
│    [+ New Chat]                     │
│                                     │
└─────────────────────────────────────┘
```

## 实现方案

### 1. Zustand Store
```typescript
// src/renderer/src/stores/conversationStore.ts

interface ConversationStore {
  // State
  conversations: Conversation[]
  currentConversationId: string | null

  // Actions
  createConversation: (title?: string) => Conversation
  deleteConversation: (id: string) => void
  renameConversation: (id: string, title: string) => void
  loadConversation: (id: string) => void
  updateConversation: (id: string, updates: Partial<Conversation>) => void
  addMessage: (message: Message) => void
  getCurrentConversation: () => Conversation | null
  getConversationsByDate: () => Record<string, Conversation[]>
}
```

### 2. 自动标题生成
- 当用户发送第一条消息后，使用 AI 生成简洁标题（15-30 字符）
- 如果 AI 生成失败，使用消息前 30 个字符作为标题

```typescript
async function generateTitle(firstMessage: string): Promise<string> {
  try {
    const response = await ai.chat({
      messages: [
        {
          role: 'user',
          content: `Generate a concise title (15-30 chars) for this message: "${firstMessage.slice(0, 200)}"`
        }
      ],
      max_tokens: 50
    })
    return response.content.trim()
  } catch {
    return firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '')
  }
}
```

### 3. 日期分组
```typescript
function groupConversationsByDate(conversations: Conversation[]) {
  const now = Date.now()
  const today = new Date(now).setHours(0, 0, 0, 0)
  const yesterday = today - 86400000
  const lastWeek = today - 7 * 86400000
  const lastMonth = today - 30 * 86400000

  return {
    today: conversations.filter(c => c.updatedAt >= today),
    yesterday: conversations.filter(c => c.updatedAt >= yesterday && c.updatedAt < today),
    lastWeek: conversations.filter(c => c.updatedAt >= lastWeek && c.updatedAt < yesterday),
    lastMonth: conversations.filter(c => c.updatedAt >= lastMonth && c.updatedAt < lastWeek),
    older: conversations.filter(c => c.updatedAt < lastMonth)
  }
}
```

### 4. 持久化存储
使用 Zustand persist middleware，保存到 localStorage：
```typescript
persist(
  (set, get) => ({
    // ... store implementation
  }),
  {
    name: 'muse-conversations',
    version: 1,
  }
)
```

### 5. 组件结构
```
Sidebar/
├── ConversationList.tsx       # 对话列表容器
├── ConversationGroup.tsx      # 日期分组（Today, Yesterday...）
├── ConversationItem.tsx       # 单个对话项
├── ConversationMenu.tsx       # 对话操作菜单（Rename, Delete）
└── NewChatButton.tsx          # 新建对话按钮
```

## 技术细节

### 1. UUID 生成
```typescript
import { v4 as uuidv4 } from 'uuid'

const conversation: Conversation = {
  id: uuidv4(),
  title: 'New Chat',
  // ...
}
```

### 2. 搜索实现
```typescript
function searchConversations(query: string, conversations: Conversation[]) {
  const lowerQuery = query.toLowerCase()
  return conversations.filter(conv =>
    conv.title.toLowerCase().includes(lowerQuery) ||
    conv.messages.some(msg => msg.content.toLowerCase().includes(lowerQuery))
  )
}
```

### 3. 导出对话
```typescript
function exportConversation(conversation: Conversation) {
  const markdown = conversation.messages
    .map(msg => `**${msg.role}**: ${msg.content}`)
    .join('\n\n---\n\n')

  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${conversation.title}.md`
  a.click()
}
```

## 优先级

### 高优先级（立即实现）
- ✅ 创建/删除对话
- ✅ 对话列表展示
- ✅ 日期分组
- ✅ 切换对话
- ✅ 自动保存

### 中优先级（后续优化）
- ⏳ 重命名对话
- ⏳ 自动标题生成
- ⏳ 搜索对话
- ⏳ 导出对话

### 低优先级（未来增强）
- ⏳ 标签/文件夹
- ⏳ 收藏对话
- ⏳ 对话分享
- ⏳ 对话统计

## 用户体验

### 1. 新用户首次使用
```
1. 打开应用 -> 显示欢迎界面和 "New Chat" 按钮
2. 点击或开始输入 -> 自动创建第一个对话
3. 发送消息后 -> 自动生成标题，出现在侧边栏
```

### 2. 老用户回访
```
1. 打开应用 -> 自动加载最近的对话
2. 侧边栏显示历史对话列表
3. 可以点击切换到任意历史对话
```

### 3. 创建新对话
```
1. 点击 "+ New Chat" 按钮
2. 清空当前聊天界面
3. 创建新对话（标题为 "New Chat"）
4. 用户输入第一条消息后生成实际标题
```

## 与现有代码集成

### 1. ChatWindow 修改
```typescript
// 当前从 chatStore 读取消息
// 改为从 conversationStore 读取当前对话的消息

const { getCurrentConversation } = useConversationStore()
const conversation = getCurrentConversation()
const messages = conversation?.messages || []
```

### 2. chatStore 重构
```typescript
// 移除 messages 状态，改为从 conversationStore 读取
// chatStore 只负责临时 UI 状态（loading, error 等）

interface ChatStore {
  isLoading: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
}
```

### 3. 消息发送流程
```typescript
async sendMessage(content: string) {
  // 1. 获取或创建当前对话
  let conversation = conversationStore.getCurrentConversation()
  if (!conversation) {
    conversation = conversationStore.createConversation()
  }

  // 2. 添加用户消息
  const userMessage = { id: uuidv4(), role: 'user', content, timestamp: Date.now() }
  conversationStore.addMessage(userMessage)

  // 3. 调用 AI
  const response = await ai.chat(...)

  // 4. 添加 AI 回复
  const assistantMessage = { id: uuidv4(), role: 'assistant', content: response, timestamp: Date.now() }
  conversationStore.addMessage(assistantMessage)

  // 5. 如果是第一条消息，生成标题
  if (conversation.messages.length === 1) {
    const title = await generateTitle(content)
    conversationStore.renameConversation(conversation.id, title)
  }
}
```

## 参考实现
- Claude.ai - 简洁的对话列表，自动标题生成
- ChatGPT - 日期分组，搜索功能
- Cursor - 项目上下文集成

## 数据迁移
如果之前有旧的消息数据，需要迁移脚本：
```typescript
function migrateOldMessages() {
  const oldMessages = localStorage.getItem('muse-chat')
  if (oldMessages) {
    const messages = JSON.parse(oldMessages)
    const conversation = createConversation('Migrated Chat')
    conversation.messages = messages
    conversationStore.conversations.push(conversation)
  }
}
```

# 功能设计文档：Chat 界面基础布局

**功能编号**: F002
**创建日期**: 2026-01-24
**依赖**: F001 (项目初始化)
**状态**: 设计中

---

## 1. 功能概述

实现 Muse 的核心 Chat 界面，包括：
- 极简三栏布局（侧边栏、Chat 区、工具输出区）
- 消息列表组件
- 消息输入框
- 基础样式和交互

**不包括**:
- AI 调用（下一个功能）
- 工具系统（后续功能）

---

## 2. 界面设计

### 2.1 整体布局

```
┌─────────────────────────────────────────────────┐
│  Title Bar (30px) - macOS native               │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ Sidebar  │        Chat Area                     │
│ (240px)  │                                      │
│          │  [Message List]                      │
│ - Logo   │                                      │
│ - New    │  User: Hello                         │
│ - Chats  │  AI: Hi there!                       │
│          │                                      │
│          │                                      │
│ - Settings│ [Input Box]                         │
│ (60px)   │ 💬 Type a message...        [Send]  │
└──────────┴──────────────────────────────────────┘
```

### 2.2 组件树

```
App
├── AppLayout
│   ├── Sidebar
│   │   ├── Logo
│   │   ├── NewChatButton
│   │   ├── ChatList
│   │   │   └── ChatItem (multiple)
│   │   └── SettingsButton
│   │
│   └── ChatView
│       ├── MessageList
│       │   └── MessageItem (multiple)
│       │       ├── UserMessage
│       │       └── AIMessage
│       └── ChatInput
│           ├── Textarea
│           └── SendButton
```

---

## 3. 组件设计

### 3.1 AppLayout

**职责**: 整体布局容器

**Props**: 无

**State**: 无

**样式**:
```tsx
<div className="flex h-screen overflow-hidden">
  <Sidebar />
  <ChatView />
</div>
```

---

### 3.2 Sidebar

**职责**: 侧边栏，包含 Logo、聊天列表、设置按钮

**Props**: 无

**State**:
- 当前选中的 Chat ID (使用 Zustand store)

**样式**:
- 宽度: 240px (固定)
- 背景: `bg-secondary`
- 边框: 右侧 `border-r`

**结构**:
```tsx
<div className="w-60 bg-secondary border-r flex flex-col">
  {/* Logo */}
  <div className="h-14 flex items-center px-4">
    <h1 className="font-semibold text-lg">Muse</h1>
  </div>

  {/* New Chat Button */}
  <div className="px-3 py-2">
    <Button>+ New Chat</Button>
  </div>

  {/* Chat List */}
  <div className="flex-1 overflow-y-auto px-3">
    <ChatList />
  </div>

  {/* Settings */}
  <div className="h-14 border-t px-3 flex items-center">
    <Button variant="ghost">Settings</Button>
  </div>
</div>
```

---

### 3.3 ChatList

**职责**: 显示聊天会话列表

**Props**: 无

**State**: 从 Zustand store 读取聊天列表

**数据结构**:
```typescript
interface Chat {
  id: string
  title: string
  lastMessage?: string
  createdAt: number
}
```

**临时数据** (Mock):
```typescript
const mockChats: Chat[] = [
  {
    id: '1',
    title: 'New Project Setup',
    lastMessage: 'Help me create a React app',
    createdAt: Date.now() - 1000 * 60 * 30
  },
  {
    id: '2',
    title: 'Bug Fix',
    lastMessage: 'There is an error in...',
    createdAt: Date.now() - 1000 * 60 * 60 * 2
  }
]
```

---

### 3.4 ChatItem

**职责**: 单个聊天会话卡片

**Props**:
```typescript
interface ChatItemProps {
  chat: Chat
  isActive: boolean
  onClick: () => void
}
```

**样式**:
```tsx
<button
  onClick={onClick}
  className={cn(
    "w-full text-left p-3 rounded-lg transition-colors",
    isActive
      ? "bg-accent text-accent-foreground"
      : "hover:bg-accent/50"
  )}
>
  <div className="font-medium truncate">{chat.title}</div>
  {chat.lastMessage && (
    <div className="text-sm text-muted-foreground truncate mt-1">
      {chat.lastMessage}
    </div>
  )}
</button>
```

---

### 3.5 ChatView

**职责**: Chat 主视图，包含消息列表和输入框

**Props**: 无

**State**:
- 当前 Chat 的消息列表 (从 store)
- 输入框内容 (local state)

**样式**:
```tsx
<div className="flex-1 flex flex-col">
  <MessageList />
  <ChatInput />
</div>
```

---

### 3.6 MessageList

**职责**: 显示消息列表

**Props**: 无

**State**: 从 Zustand store 读取消息列表

**数据结构**:
```typescript
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}
```

**临时数据** (Mock):
```typescript
const mockMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'Hello, can you help me?',
    createdAt: Date.now() - 1000 * 60 * 5
  },
  {
    id: '2',
    role: 'assistant',
    content: 'Of course! How can I assist you today?',
    createdAt: Date.now() - 1000 * 60 * 4
  }
]
```

**样式**:
```tsx
<div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
  {messages.map(message => (
    <MessageItem key={message.id} message={message} />
  ))}
</div>
```

---

### 3.7 MessageItem

**职责**: 单条消息展示

**Props**:
```typescript
interface MessageItemProps {
  message: Message
}
```

**用户消息样式**:
```tsx
<div className="flex justify-end">
  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3 max-w-[70%]">
    {message.content}
  </div>
</div>
```

**AI 消息样式**:
```tsx
<div className="flex justify-start">
  <div className="bg-secondary text-foreground rounded-2xl rounded-bl-sm px-4 py-3 max-w-[70%]">
    {message.content}
  </div>
</div>
```

---

### 3.8 ChatInput

**职责**: 消息输入框

**Props**: 无

**State**:
- `input`: string - 输入内容
- `isSubmitting`: boolean - 是否正在发送

**交互**:
- Enter 键发送（Shift+Enter 换行）
- 点击发送按钮发送

**样式**:
```tsx
<div className="border-t px-4 py-3">
  <div className="flex items-end gap-2">
    <textarea
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder="Type a message..."
      className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm min-h-[60px] max-h-[200px]"
      rows={3}
    />
    <Button
      onClick={handleSend}
      disabled={!input.trim() || isSubmitting}
    >
      Send
    </Button>
  </div>
</div>
```

---

## 4. 状态管理 (Zustand)

### 4.1 ChatStore

```typescript
interface ChatStore {
  // State
  chats: Chat[]
  currentChatId: string | null
  messages: Record<string, Message[]> // chatId -> messages

  // Actions
  setCurrentChat: (id: string) => void
  addMessage: (chatId: string, message: Message) => void
  createChat: () => void
}
```

### 4.2 实现 (Mock 数据)

```typescript
import { create } from 'zustand'

export const useChatStore = create<ChatStore>((set) => ({
  chats: [
    {
      id: '1',
      title: 'New Project Setup',
      lastMessage: 'Help me create a React app',
      createdAt: Date.now() - 1000 * 60 * 30
    }
  ],
  currentChatId: '1',
  messages: {
    '1': [
      {
        id: '1',
        role: 'user',
        content: 'Hello, can you help me?',
        createdAt: Date.now() - 1000 * 60 * 5
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Of course! How can I assist you today?',
        createdAt: Date.now() - 1000 * 60 * 4
      }
    ]
  },

  setCurrentChat: (id) => set({ currentChatId: id }),

  addMessage: (chatId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [...(state.messages[chatId] || []), message]
      }
    })),

  createChat: () => {
    const newChat: Chat = {
      id: nanoid(),
      title: 'New Chat',
      createdAt: Date.now()
    }
    set((state) => ({
      chats: [newChat, ...state.chats],
      currentChatId: newChat.id,
      messages: { ...state.messages, [newChat.id]: [] }
    }))
  }
}))
```

---

## 5. shadcn/ui 组件使用

需要安装以下 shadcn/ui 组件：

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add textarea
```

---

## 6. 实现步骤

### Step 1: 创建工具函数 `cn`

```typescript
// src/renderer/src/utils/cn.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Step 2: 创建类型定义

```typescript
// src/renderer/src/types/chat.ts
export interface Chat {
  id: string
  title: string
  lastMessage?: string
  createdAt: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}
```

### Step 3: 创建 Zustand Store

```typescript
// src/renderer/src/stores/chatStore.ts
```

### Step 4: 创建 UI 组件

```typescript
// src/renderer/src/components/ui/button.tsx
// src/renderer/src/components/ui/textarea.tsx (可选，用原生的也行)
```

### Step 5: 创建布局组件

```typescript
// src/renderer/src/components/layout/AppLayout.tsx
// src/renderer/src/components/layout/Sidebar.tsx
```

### Step 6: 创建 Chat 组件

```typescript
// src/renderer/src/components/chat/ChatView.tsx
// src/renderer/src/components/chat/ChatList.tsx
// src/renderer/src/components/chat/ChatItem.tsx
// src/renderer/src/components/chat/MessageList.tsx
// src/renderer/src/components/chat/MessageItem.tsx
// src/renderer/src/components/chat/ChatInput.tsx
```

### Step 7: 更新 App.tsx

```typescript
import AppLayout from '@/components/layout/AppLayout'

function App() {
  return <AppLayout />
}
```

### Step 8: 测试

```bash
npm run dev
```

---

## 7. 验收标准

- [x] 显示侧边栏（Logo、聊天列表、设置按钮）
- [x] 显示 Chat 区域（消息列表、输入框）
- [x] 可以创建新 Chat
- [x] 可以切换 Chat
- [x] 可以发送消息（仅添加到本地状态，暂不调用 AI）
- [x] 消息列表自动滚动到底部
- [x] UI 美观，符合设计规范

---

## 8. 下一步

完成 Chat 界面后，下一个功能是：
**F003: 集成多模型 AI 支持（DIP 架构）**

---

**文档结束**

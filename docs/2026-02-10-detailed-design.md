# 详细设计文档

> 日期：2026-02-10
> 关联文档：
> - docs/2026-02-10-ui-improvement-tasks.md（任务清单）
> - docs/2026-02-10-bdd-acceptance-criteria.md（BDD 验收标准）
> 状态：Review 完成

---

## 总体可行性评估

| 任务 | 可行性 | 风险等级 | 备注 |
|------|--------|----------|------|
| 1. 工具调用折叠 | 高 | 低 | 纯前端状态，改动集中在单文件 |
| 2. 侧边栏拖拽伸缩 | 高 | 中 | `@lobehub/ui` 提供 `DraggablePanel`，可复用 |
| 3. ScrollArea 滚动优化 | 中 | **高** | `@lobehub/ui` 无 `ScrollArea` 导出，需替代方案 |
| 4. TodoWrite 渲染 | 高 | 低 | 新增组件，不影响现有逻辑 |
| 5. 流式渲染优化 | 中 | 中 | 涉及核心 chatStore 流式逻辑 |
| 6. Approve 按钮优化 | 高 | 低 | 纯 UI 状态，改动集中在单文件 |

### 关键风险项

1. **任务 3 - ScrollArea 不可用**：`@lobehub/ui@4.32.2` 不导出 `ScrollArea`，仅有 `ScrollShadow`。需改用原生 CSS `overflow-y: auto` + 自定义滚动样式，或使用 `ScrollShadow` 组件包裹。
2. **任务 2 - DraggablePanel 适配**：`@lobehub/ui` 导出了 `DraggablePanel` 和 `DraggableSideNav`，但需验证其 API 是否满足需求，否则自行实现拖拽。
3. **任务 5 - chatStore 改动**：流式更新逻辑是核心路径，节流不当可能导致消息丢失或显示延迟。

---

## 任务 1：工具调用区域折叠优化

### 涉及文件

| 文件 | 修改类型 | 行号范围 |
|------|----------|----------|
| `src/renderer/src/components/chat/ToolCallCard.tsx` | 修改 | 全文（234 行） |

### 当前实现分析

- `isExpanded`（第 52 行）仅控制输出文本的 Show More/Less 截断（>300 字符）
- Header（第 195-205 行）+ Parameters（第 208-213 行）+ Output（第 216-230 行）始终全部渲染
- Header 当前不可点击，无折叠指示器

### 实现步骤

#### 步骤 1：新增图标导入和状态

修改第 1-15 行的导入，新增 `ChevronRight`：

```typescript
// 第 11 行，在现有导入中添加
ChevronRight,
```

在第 52 行 `isExpanded` 之后新增：

```typescript
const [isCollapsed, setIsCollapsed] = useState(true)
```

#### 步骤 2：修改 Header 区域（第 194-205 行）

将 Header 改为可点击，添加折叠指示图标：

```tsx
{/* Header */}
<div
  className="flex items-center gap-2 cursor-pointer select-none"
  onClick={() => setIsCollapsed(!isCollapsed)}
>
  {isCollapsed ? (
    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
  ) : (
    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
  )}
  {icon}
  <span className="font-semibold text-sm">{toolCall.name}</span>
  <div className="flex-1" />
  {statusIcon}
  <span className="text-xs text-muted-foreground">
    {status === 'pending' && (isPermissionRequest ? '需要权限' : 'Running...')}
    {status === 'success' && 'Success'}
    {status === 'error' && 'Error'}
  </span>
</div>
```

**关键变更**：
- 移除原有的 `mb-2`（折叠时 Header 下方不需要间距）
- 添加 `cursor-pointer select-none` 使 Header 可点击
- 左侧新增 ChevronRight/ChevronDown 折叠指示器

#### 步骤 3：条件渲染 Parameters 和 Output（第 207-231 行）

用 `{!isCollapsed && (...)}` 包裹 Parameters 和 Output 区域：

```tsx
{!isCollapsed && (
  <>
    {/* Input Parameters */}
    {Object.keys(toolCall.input).length > 0 && (
      <div className="bg-background/50 rounded p-2 mt-2">
        <div className="text-xs text-muted-foreground mb-1">Parameters:</div>
        <div className="space-y-1">{renderInput()}</div>
      </div>
    )}

    {/* Output Result */}
    {toolResult && (
      <div
        className={cn(
          'rounded p-2 mt-2',
          toolResult.isError
            ? 'bg-destructive/10 border border-destructive/20'
            : 'bg-background/50'
        )}
      >
        <div className="text-xs text-muted-foreground mb-1">
          {toolResult.isError ? 'Error:' : 'Result:'}
        </div>
        {renderOutput()}
      </div>
    )}
  </>
)}
```

**注意**：将原来的 `mb-2` 改为 `mt-2`，因为折叠时 Header 不需要底部间距。

### 状态管理

| 状态 | 类型 | 默认值 | 用途 |
|------|------|--------|------|
| `isCollapsed` | `boolean` | `true` | 控制卡片整体折叠/展开 |
| `isExpanded` | `boolean` | `false` | 控制长文本 Show More/Less（保留不变） |

### 组件接口

无变化，`ToolCallCardProps` 保持不变。

### 潜在风险

- **低风险**：权限请求按钮在折叠状态下不可见，用户需点击展开才能操作。Header 状态文字 "需要权限" 已提供足够提示。
- **无风险**：`isCollapsed` 是组件内部状态，不影响其他组件。

---

## 任务 2：左侧导航栏拖拽伸缩 + 折叠重构

### 涉及文件

| 文件 | 修改类型 | 行号范围 |
|------|----------|----------|
| `src/renderer/src/components/layout/AppLayout.tsx` | 修改 | 全文（39 行） |
| `src/renderer/src/components/layout/Sidebar.tsx` | 修改 | 全文（24 行） |
| `src/renderer/src/components/layout/ConversationList.tsx` | 修改 | 第 20-73 行 |
| `src/renderer/src/components/layout/Settings.tsx` | 修改 | 第 60-67 行 |

### 当前实现分析

- `Sidebar.tsx`（24 行）：固定 `w-[280px]`，无拖拽、无折叠
- `AppLayout.tsx`（39 行）：`<div className="flex flex-1">` 中直接渲染 `<Sidebar />` + `<ChatView />`，无宽度状态管理
- `ConversationList.tsx`（75 行）：按钮文字 "开启新话题" 无折叠适配
- `Settings.tsx`（185 行）：Settings 按钮带文字 "Settings"，无折叠适配

### 方案选择：自行实现拖拽（推荐）

经评估，`@lobehub/ui` 的 `DraggablePanel` 是一个完整的面板组件，内部封装了 header/body/footer 结构，与现有 Sidebar 结构不兼容，强行适配会增加复杂度。**推荐自行实现拖拽逻辑**，代码量约 60 行，可控性更强。

### 宽度常量

```typescript
const SIDEBAR_MIN = 60    // 折叠模式（图标模式）
const SIDEBAR_DEFAULT = 280
const SIDEBAR_MAX = 400
const SIDEBAR_COLLAPSE_THRESHOLD = 120  // 拖拽到此宽度以下自动折叠
```

### 实现步骤

#### 步骤 1：AppLayout.tsx - 添加宽度状态管理

在 `AppLayout` 组件中新增侧边栏宽度状态，使用 `localStorage` 持久化：

```typescript
const [sidebarWidth, setSidebarWidth] = useState(() => {
  const saved = localStorage.getItem('sidebar-width')
  return saved ? Number(saved) : SIDEBAR_DEFAULT
})
const [isCollapsed, setIsCollapsed] = useState(() => {
  return localStorage.getItem('sidebar-collapsed') === 'true'
})

// 持久化
useEffect(() => {
  localStorage.setItem('sidebar-width', String(sidebarWidth))
}, [sidebarWidth])
useEffect(() => {
  localStorage.setItem('sidebar-collapsed', String(isCollapsed))
}, [isCollapsed])
```

#### 步骤 2：AppLayout.tsx - 拖拽手柄实现

在 `<Sidebar />` 和 `<ChatView />` 之间插入拖拽手柄：

```tsx
{/* Drag Handle */}
<div
  className="w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors flex-shrink-0"
  onMouseDown={handleDragStart}
/>
```

拖拽逻辑（在 AppLayout 组件内）：

```typescript
const handleDragStart = useCallback((e: React.MouseEvent) => {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = isCollapsed ? SIDEBAR_MIN : sidebarWidth

  const handleMouseMove = (e: MouseEvent) => {
    const delta = e.clientX - startX
    const newWidth = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startWidth + delta))

    if (newWidth <= SIDEBAR_COLLAPSE_THRESHOLD) {
      setIsCollapsed(true)
    } else {
      setIsCollapsed(false)
      setSidebarWidth(newWidth)
    }
  }

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}, [isCollapsed, sidebarWidth])
```

#### 步骤 3：AppLayout.tsx - 修改渲染结构

将 Sidebar 的宽度改为动态控制，传递 props：

```tsx
<div className="flex flex-1 overflow-hidden">
  <Sidebar
    width={isCollapsed ? SIDEBAR_MIN : sidebarWidth}
    isCollapsed={isCollapsed}
    onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
  />
  {/* Drag Handle */}
  <div
    className="w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors flex-shrink-0"
    onMouseDown={handleDragStart}
  />
  <ChatView />
</div>
```

#### 步骤 4：Sidebar.tsx - 接收 props 并适配折叠模式

修改 Sidebar 组件接口和渲染逻辑：

```typescript
interface SidebarProps {
  width: number
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ width, isCollapsed, onToggleCollapse }: SidebarProps) {
  return (
    <div
      className="bg-[hsl(var(--bg-sidebar))] border-r border-[hsl(var(--border))] flex flex-col transition-[width] duration-200"
      style={{ width: `${width}px`, minWidth: `${width}px` }}
    >
      {/* Brand */}
      <div className="h-12 flex items-center px-4">
        <img src={logoImage} alt="Muse" className="w-6 h-6 rounded flex-shrink-0" />
        {!isCollapsed && (
          <span className="ml-2 text-[17px] font-semibold text-foreground">Muse</span>
        )}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-hidden">
        <ConversationList isCollapsed={isCollapsed} />
      </div>

      {/* Settings */}
      <Settings isCollapsed={isCollapsed} />
    </div>
  )
}
```

#### 步骤 5：ConversationList.tsx - 折叠模式适配

修改 `ConversationList` 接收 `isCollapsed` prop：

```typescript
interface ConversationListProps {
  isCollapsed?: boolean
}

export function ConversationList({ isCollapsed = false }: ConversationListProps) {
```

折叠模式下 "新话题" 按钮只显示图标（修改第 24-33 行）：

```tsx
<Button onClick={handleNewChat} variant="ghost" size="sm"
  className={cn(
    "bg-white text-foreground border border-[hsl(var(--border))] shadow-sm hover:bg-white/90",
    isCollapsed ? "w-10 h-10 p-0 justify-center mx-auto" : "w-full justify-start"
  )}
>
  <Plus className="w-4 h-4" />
  {!isCollapsed && <span className="ml-2">开启新话题</span>}
</Button>
```

折叠模式下隐藏搜索栏和会话文字，仅保留图标提示。

#### 步骤 6：Settings.tsx - 折叠模式适配

修改 `Settings` 接收 `isCollapsed` prop（修改第 60-67 行）：

```typescript
interface SettingsComponentProps {
  isCollapsed?: boolean
}
// 在 Settings 函数签名中添加 props
export function Settings({ isCollapsed = false }: SettingsComponentProps) {
```

折叠模式下按钮只显示图标：

```tsx
<Button variant="ghost"
  className={cn(
    isCollapsed ? "w-10 h-10 p-0 justify-center mx-auto" : "w-full justify-start"
  )}
  onClick={() => setIsOpen(true)}
>
  <SettingsIcon className="w-4 h-4" />
  {!isCollapsed && <span className="ml-2">Settings</span>}
</Button>
```

### 状态管理

| 状态 | 位置 | 类型 | 默认值 | 持久化 |
|------|------|------|--------|--------|
| `sidebarWidth` | AppLayout | `number` | `280` | localStorage |
| `isCollapsed` | AppLayout | `boolean` | `false` | localStorage |

### 潜在风险

- **中风险**：拖拽时 `transition-[width] duration-200` 可能导致拖拽不跟手。解决方案：拖拽期间临时移除 transition，mouseUp 时恢复。
- **低风险**：macOS title bar 拖拽区域（`-webkit-app-region: drag`）与侧边栏拖拽手柄可能冲突。手柄需设置 `-webkit-app-region: no-drag`。
- **低风险**：折叠模式下会话列表项需要 tooltip 显示完整标题，否则用户无法区分会话。

---

## 任务 3：Thinking 区域 & 工具调用区域滚动优化

### 涉及文件

| 文件 | 修改类型 | 行号范围 |
|------|----------|----------|
| `src/renderer/src/components/chat/ThinkingBlock.tsx` | 修改 | 第 25-32 行 |
| `src/renderer/src/components/chat/ToolCallCard.tsx` | 修改 | 第 103-184 行（renderOutput） |

### 关键发现：ScrollArea 不可用

经验证，`@lobehub/ui@4.32.2` **不导出 `ScrollArea` 组件**。可用的相关组件是 `ScrollShadow`，它提供滚动阴影效果但不是完整的滚动容器。

**替代方案**：使用原生 CSS 实现滚动容器，配合自定义滚动条样式。

### 实现步骤

#### 步骤 1：ThinkingBlock.tsx - 展开后添加滚动容器（第 25-32 行）

将内容区域的 `max-h-[4.5rem] overflow-hidden` 改为带滚动的容器：

```tsx
<div
  className={cn(
    'text-sm text-muted-foreground whitespace-pre-wrap',
    isFullExpanded
      ? 'max-h-[300px] overflow-y-auto scrollbar-thin'
      : 'max-h-[4.5rem] overflow-hidden group-hover:overflow-auto'
  )}
>
  {thinking}
</div>
```

**关键变更**：展开后限制 `max-h-[300px]` 并启用 `overflow-y-auto`。

#### 步骤 2：ToolCallCard.tsx - 输出区域添加滚动容器

在 `renderOutput()` 函数中，为展开后的输出内容包裹滚动容器（修改第 168-183 行）：

```tsx
return (
  <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
    <pre className="font-mono text-xs whitespace-pre-wrap break-words">
      {output}
    </pre>
    {isLong && (
      <button
        onClick={() => setIsExpanded(false)}
        className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
      >
        Show Less
        <ChevronUp className="w-3 h-3" />
      </button>
    )}
  </div>
)
```

#### 步骤 3：添加 scrollbar-thin 工具类

需要在 Tailwind 配置或全局 CSS 中添加自定义滚动条样式。检查项目是否已有相关配置：

```css
/* 在全局 CSS 中添加 */
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 2px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--text-muted));
}
```

### 潜在风险

- **高风险（已缓解）**：原方案依赖 `@lobehub/ui` 的 `ScrollArea`，但该组件不存在。已改用原生 CSS 方案，风险降为低。
- **低风险**：`scrollbar-thin` 类名可能与 Tailwind 插件冲突，需确认项目未安装 `tailwind-scrollbar` 插件。

---

## 任务 4：TodoWrite 工具调用渲染

### 涉及文件

| 文件 | 修改类型 | 行号范围 |
|------|----------|----------|
| `src/renderer/src/components/chat/TodoCard.tsx` | **新增** | - |
| `src/renderer/src/components/chat/ToolCallCard.tsx` | 修改 | 第 51 行、第 186-233 行 |

### 当前实现分析

- `ToolCallCard.tsx` 对所有工具调用使用统一渲染：Header + Parameters JSON + Output 文本
- `ToolCall` 类型定义（`src/shared/types/conversation.ts:14-18`）：`{ id, name, input: Record<string, any> }`
- `TOOL_ICONS` 已包含 `TodoWrite: <ListTodo />`（第 48 行）
- TodoWrite 的 `input` 参数结构需要从 AI 工具定义中确认

### TodoWrite Input 参数结构（已确认）

来源：`src/api/services/ai/tools/definitions.ts:106-134`

```typescript
interface TodoItem {
  id: string       // 必填
  title: string    // 必填
  status: 'todo' | 'in_progress' | 'done'  // 必填
  notes?: string   // 可选
}

// toolCall.input 结构
interface TodoWriteInput {
  todos: TodoItem[]  // 必填
}
```

### 实现步骤

#### 步骤 1：新增 TodoCard.tsx 组件

创建 `src/renderer/src/components/chat/TodoCard.tsx`：

```typescript
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

interface TodoItem {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  notes?: string
}

interface TodoCardProps {
  todos: TodoItem[]
}

const STATUS_CONFIG = {
  todo: {
    icon: Circle,
    className: 'text-muted-foreground',
    label: '待办',
  },
  in_progress: {
    icon: Loader2,
    className: 'text-blue-500 animate-spin',
    label: '进行中',
  },
  done: {
    icon: CheckCircle2,
    className: 'text-green-500',
    label: '已完成',
  },
}
```

TodoCard 渲染函数：

```tsx
export function TodoCard({ todos }: TodoCardProps) {
  const doneCount = todos.filter(t => t.status === 'done').length

  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground mb-2">
        Tasks: {doneCount}/{todos.length} completed
      </div>
      {todos.map((todo) => {
        const config = STATUS_CONFIG[todo.status]
        const Icon = config.icon
        return (
          <div key={todo.id} className="flex items-start gap-2 py-1">
            <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.className)} />
            <div className="flex-1 min-w-0">
              <span className={cn(
                'text-sm',
                todo.status === 'done' && 'line-through text-muted-foreground'
              )}>
                {todo.title}
              </span>
              {todo.notes && (
                <p className="text-xs text-muted-foreground mt-0.5">{todo.notes}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

#### 步骤 2：ToolCallCard.tsx - 添加 TodoWrite 特殊分支

在文件顶部添加导入：

```typescript
import { TodoCard } from './TodoCard'
```

在 `{!isCollapsed && (...)}` 内部，当 `toolCall.name === 'TodoWrite'` 时使用专用组件替代默认 Parameters 渲染：

```tsx
{!isCollapsed && (
  <>
    {/* TodoWrite 专用渲染 vs 默认 Parameters */}
    {toolCall.name === 'TodoWrite' && toolCall.input.todos ? (
      <div className="mt-2">
        <TodoCard todos={toolCall.input.todos} />
      </div>
    ) : (
      Object.keys(toolCall.input).length > 0 && (
        <div className="bg-background/50 rounded p-2 mt-2">
          <div className="text-xs text-muted-foreground mb-1">Parameters:</div>
          <div className="space-y-1">{renderInput()}</div>
        </div>
      )
    )}
    {/* Output Result - 保持不变 */}
  </>
)}
```

### 潜在风险

- **低风险**：`toolCall.input.todos` 可能为 undefined 或格式异常。TodoCard 需做防御性检查（`Array.isArray` 校验）。
- **无风险**：新增组件不影响其他工具调用的渲染。

---

## 任务 5：流式渲染卡顿优化

### 涉及文件

| 文件 | 修改类型 | 行号范围 |
|------|----------|----------|
| `src/renderer/src/stores/chatStore.ts` | 修改 | 第 296-349 行（streaming callback） |
| `src/renderer/src/components/chat/MessageItem.tsx` | 修改 | 第 87-89 行（内容区域） |

### 当前实现分析

- `chatStore.ts` 第 299 行：streaming callback 在每个 chunk 到达时立即调用 `conversationStore.updateConversation()`
- 每次 `updateConversation` 触发 Zustand 状态更新，导致所有订阅组件 re-render
- `MessageItem.tsx` 中 `MarkdownRenderer` 每次 re-render 都重新解析全部 Markdown 内容
- 高频 token 到达时（如 Claude 的快速流式输出），可能每秒触发 30-60 次 re-render

### 实现步骤

#### 步骤 1：chatStore.ts - 使用 requestAnimationFrame 节流

在 streaming callback（第 299 行）中引入 RAF 节流，将高频 chunk 合并为每帧一次更新：

```typescript
// 在 sendMessage 函数内，streaming callback 之前声明
let pendingChunks: typeof chunk[] = []
let rafId: number | null = null

const flushChunks = () => {
  const conversationStore = useConversationStore.getState()
  const conv = conversationStore.conversations.find((c) => c.id === conversationId)
  if (!conv) return

  const updatedMessages = conv.messages.map((m) => {
    if (m.id !== assistantMessageId) return m
    const updated: Message = { ...m }

    for (const chunk of pendingChunks) {
      if (chunk.content) updated.content = (updated.content || '') + chunk.content
      if (chunk.thinking) updated.thinking = (updated.thinking || '') + chunk.thinking
      if (chunk.toolCall) {
        const toolCalls = updated.toolCalls || []
        if (!toolCalls.find((tc) => tc.id === chunk.toolCall!.id)) {
          toolCalls.push(chunk.toolCall as ToolCall)
          updated.toolCalls = toolCalls
        }
      }
      if (chunk.toolResult) {
        const toolResults = updated.toolResults || []
        if (!toolResults.find((tr) => tr.toolCallId === chunk.toolResult!.toolCallId)) {
          toolResults.push(chunk.toolResult as ToolResult)
          updated.toolResults = toolResults
        }
      }
    }
    return updated
  })

  conversationStore.updateConversation(conversationId, { messages: updatedMessages })
  pendingChunks = []
  rafId = null
}
```

修改 streaming callback 为：

```typescript
(chunk) => {
  pendingChunks.push(chunk)
  if (!rafId) {
    rafId = requestAnimationFrame(flushChunks)
  }
},
```

**注意**：在 streaming 结束后（finally 块之前），需要确保最后一批 chunks 被 flush：

```typescript
// 在 try 块末尾、finally 之前
if (pendingChunks.length > 0) {
  if (rafId) cancelAnimationFrame(rafId)
  flushChunks()
}
```

#### 步骤 2：MessageItem.tsx - 添加淡入动画

在 AI 消息的内容区域（第 87-89 行）添加 CSS 淡入效果：

```tsx
{/* Body */}
<div className="text-foreground animate-fade-in">
  {contentBody}
</div>
```

在全局 CSS 中添加动画定义：

```css
@keyframes fade-in {
  from { opacity: 0.6; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fade-in 200ms ease-out;
}
```

### 潜在风险

- **中风险**：RAF 节流可能导致最后几个 token 延迟显示。已通过 streaming 结束时强制 flush 缓解。
- **中风险**：`pendingChunks` 累积多个 chunk 后一次性合并，需确保 toolCall/toolResult 的去重逻辑正确。
- **低风险**：`animate-fade-in` 在高频更新时可能导致闪烁。如果出现，可改为仅在首次渲染时应用动画。

---

## 任务 6：Approve 权限申请按钮交互优化

### 涉及文件

| 文件 | 修改类型 | 行号范围 |
|------|----------|----------|
| `src/renderer/src/components/chat/ToolCallCard.tsx` | 修改 | 第 106-146 行（renderOutput 权限部分） |

### 当前实现分析

- 权限请求按钮在 `renderOutput()` 函数的第 106-146 行
- 三个按钮："允许"、"允许所有"、"拒绝"
- 点击 "允许"/"允许所有" 调用 `approveToolCall(conversationId, toolCall.name, allowAll)`
- "拒绝" 按钮当前无 onClick 处理（第 138-140 行）
- 点击后无任何视觉反馈，按钮状态不变
- `approveToolCall` 实际上会发送一条新消息（chatStore.ts 第 421-461 行），这是异步操作

### 实现步骤

#### 步骤 1：新增 approvalStatus 状态

在 `ToolCallCard` 组件中（第 52 行附近）新增：

```typescript
type ApprovalStatus = 'idle' | 'loading' | 'approved' | 'approvedAll' | 'denied'
const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('idle')
```

#### 步骤 2：修改权限按钮的 onClick 处理

替换第 118-143 行的按钮区域：

```tsx
{showButtons && approvalStatus === 'idle' && (
  <div className="flex flex-wrap gap-2">
    <button
      onClick={async () => {
        if (!currentConversationId) return
        setApprovalStatus('loading')
        await approveToolCall(currentConversationId, toolCall.name, false)
        setApprovalStatus('approved')
      }}
      className="text-xs px-2 py-1 rounded bg-[hsl(var(--surface-2))] hover:bg-[hsl(var(--surface-3))] transition-colors"
    >
      允许
    </button>
    <button
      onClick={async () => {
        if (!currentConversationId) return
        setApprovalStatus('loading')
        await approveToolCall(currentConversationId, toolCall.name, true)
        setApprovalStatus('approvedAll')
      }}
      className="text-xs px-2 py-1 rounded bg-[hsl(var(--surface-2))] hover:bg-[hsl(var(--surface-3))] transition-colors"
    >
      允许所有
    </button>
    <button
      onClick={() => setApprovalStatus('denied')}
      className="text-xs px-2 py-1 rounded text-muted-foreground hover:text-foreground transition-colors"
    >
      拒绝
    </button>
  </div>
)}
```

#### 步骤 3：添加状态反馈 UI

在按钮区域之后，添加各状态的视觉反馈：

```tsx
{/* Loading 状态 */}
{approvalStatus === 'loading' && (
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <Loader2 className="w-3.5 h-3.5 animate-spin" />
    <span>处理中...</span>
  </div>
)}

{/* 已允许 */}
{approvalStatus === 'approved' && (
  <div className="flex items-center gap-2 text-xs text-green-600">
    <CheckCircle2 className="w-3.5 h-3.5" />
    <span>已允许</span>
  </div>
)}

{/* 已允许所有 */}
{approvalStatus === 'approvedAll' && (
  <div className="flex items-center gap-2 text-xs text-green-600">
    <CheckCircle2 className="w-3.5 h-3.5" />
    <span>已允许所有</span>
  </div>
)}

{/* 已拒绝 */}
{approvalStatus === 'denied' && (
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <XCircle className="w-3.5 h-3.5" />
    <span>已拒绝</span>
  </div>
)}
```

### 状态管理

| 状态 | 类型 | 默认值 | 用途 |
|------|------|--------|------|
| `approvalStatus` | `ApprovalStatus` | `'idle'` | 控制按钮的显示状态和交互反馈 |

### 潜在风险

- **低风险**：`approveToolCall` 是异步操作，如果失败需要回退状态。建议在 catch 中将 `approvalStatus` 重置为 `'idle'`。
- **低风险**："拒绝" 按钮当前无后端处理逻辑，仅做前端状态变更。后续可能需要通知 AI 工具被拒绝。
- **无风险**：`approvalStatus` 是组件内部状态，不影响其他组件。

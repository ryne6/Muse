# 上下文自动压缩 — 详细实现计划

> 基于: `docs/plans/2026-02-27-context-compression-design.md`
> 日期: 2026-02-27
> 总步骤: 10 步
> 数据流方向: Schema → Service → IPC → API → Store → UI

---

## Step 1: Schema 变更 — messages 表新增字段

**改动文件:**
- `src/main/db/schema.ts`

**依赖:** 无（第一步）

**具体改动:**

在 `messages` 表定义中（schema.ts:21-33），`durationMs` 字段后追加两个字段：

```typescript
// schema.ts — messages 表，在 durationMs 之后追加
compressed: integer('compressed', { mode: 'boolean' }).default(false),
summaryOf: text('summary_of'), // JSON string: 被压缩的消息 ID 数组
```

无需修改类型导出，Drizzle 的 `$inferSelect` / `$inferInsert` 会自动包含新字段。

**验收标准:**
- `Message` 类型（schema 推断）包含 `compressed?: boolean` 和 `summaryOf?: string | null`
- `npm run build` 不因 schema 变更报错（新字段有 default 值）

---

## Step 2: 数据库迁移 — ALTER TABLE 添加列

**改动文件:**
- `src/main/db/index.ts`

**依赖:** Step 1

**具体改动:**

在 `runSchemaMigrations()` 函数末尾（index.ts:246 附近，`} catch (error)` 之前），追加迁移块：

```typescript
// 在 hasLastAccessed 迁移块之后、catch 之前追加

// 上下文压缩：messages 表新增 compressed、summary_of 列
const msgColsForCompression = sqlite.pragma('table_info(messages)') as {
  name: string
}[]
const hasCompressed = msgColsForCompression.some(
  col => col.name === 'compressed'
)

if (!hasCompressed) {
  sqlite.exec(
    'ALTER TABLE messages ADD COLUMN compressed INTEGER DEFAULT 0'
  )
  sqlite.exec('ALTER TABLE messages ADD COLUMN summary_of TEXT')
}
```

复用现有迁移模式：`pragma table_info` 检测 → 条件 `ALTER TABLE`。注意 SQLite 的 boolean 用 `INTEGER DEFAULT 0`，与 `isError` 字段一致。

**验收标准:**
- 启动应用后，`pragma table_info(messages)` 包含 `compressed` 和 `summary_of` 列
- 已有消息的 `compressed` 值为 0（false）
- 重复启动不报错（幂等）

---

## Step 3: 共享类型扩展 — Message 接口新增字段

**改动文件:**
- `src/shared/types/conversation.ts`

**依赖:** Step 1（概念依赖，类型需与 schema 对齐）

**具体改动:**

在 `Message` 接口（conversation.ts:3-15）的 `durationMs` 字段后追加：

```typescript
// conversation.ts — Message 接口，durationMs 之后
compressed?: boolean
summaryOf?: string[] // 被压缩的消息 ID 列表（DB 存 JSON string，前端解析后为数组）
```

**验收标准:**
- `Message` 类型包含 `compressed` 和 `summaryOf` 可选字段
- 现有引用 `Message` 的代码不报错（新字段可选）

---

## Step 4: MessageService 新增方法 + IPC Handler

**改动文件:**
- `src/main/db/services/messageService.ts`
- `src/main/index.ts`

**依赖:** Step 1, Step 2

**具体改动:**

### 4a. MessageService（messageService.ts 末尾，`delete` 方法之后）

```typescript
// 批量标记消息为已压缩
static async markCompressed(messageIds: string[]) {
  if (messageIds.length === 0) return
  const db = getDatabase()
  for (const id of messageIds) {
    await db
      .update(messages)
      .set({ compressed: true })
      .where(eq(messages.id, id))
  }
}

// 创建摘要消息
static async createSummary(data: {
  id: string
  conversationId: string
  content: string
  summaryOf: string[]
  timestamp: Date
}) {
  const db = getDatabase()
  const newMessage: NewMessage = {
    id: data.id,
    conversationId: data.conversationId,
    role: 'assistant',
    content: data.content,
    timestamp: data.timestamp,
    summaryOf: JSON.stringify(data.summaryOf),
  }
  await db.insert(messages).values(newMessage)
  return newMessage
}
```

需要在文件顶部 import 中确认 `NewMessage` 已导入（当前已有）。`summaryOf` 在 DB 层是 JSON string。

### 4b. IPC Handler（index.ts，在 `db:messages:addToolResult` handler 之后）

```typescript
ipcMain.handle(
  'db:messages:markCompressed',
  async (_, { messageIds }) => {
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new Error('messageIds must be a non-empty array')
    }
    if (messageIds.length > 100) {
      throw new Error('messageIds exceeds max length of 100')
    }
    await MessageService.markCompressed(messageIds)
    return { success: true }
  }
)

ipcMain.handle('db:messages:createSummary', async (_, data) => {
  if (!data.id || !data.conversationId || !data.content || !data.summaryOf) {
    throw new Error('Missing required fields: id, conversationId, content, summaryOf')
  }
  if (!Array.isArray(data.summaryOf)) {
    throw new Error('summaryOf must be an array of message IDs')
  }
  return await MessageService.createSummary({
    ...data,
    timestamp: new Date(data.timestamp),
  })
})
```

**验收标准:**
- 通过 IPC 调用 `db:messages:markCompressed` 可批量标记消息
- 通过 IPC 调用 `db:messages:createSummary` 可创建摘要消息，`summaryOf` 存为 JSON string
- 输入校验：空数组、超长数组、缺失字段均抛异常

---

## Step 5: API 端点 — POST /api/chat/compress

**改动文件:**
- `src/api/routes/chat.ts`

**依赖:** 无（独立端点，不依赖前面的 DB 改动）

**具体改动:**

在 chat.ts 末尾 `export default app` 之前（chat.ts:239 附近），新增压缩端点：

```typescript
// 压缩 system prompt
const COMPRESSION_SYSTEM_PROMPT = `你是一个对话摘要助手。请将以下对话历史压缩为简洁的摘要。

要求：
- 保留所有文件路径、代码片段、技术决策
- 保留错误信息和解决方案
- 保留因果关系和上下文依赖
- 500 字以内
- 使用与原始对话相同的语言
- 以 "[Context Summary]" 开头`

// 上下文压缩端点（非流式，独立超时）
app.post('/chat/compress', async c => {
  try {
    const { provider, messages, config } = await c.req.json<{
      provider: string
      messages: AIMessage[]
      config: AIConfig
    }>()

    if (!provider || !messages || !config) {
      const error = new AIError(
        ErrorCode.INVALID_REQUEST,
        'Missing required fields: provider, messages, config'
      )
      return c.json(createErrorResponse(error), error.httpStatus)
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return c.json({ summary: '' })
    }

    // 构建压缩请求：system prompt + 待压缩消息
    const compressMessages: AIMessage[] = [
      { role: 'system', content: COMPRESSION_SYSTEM_PROMPT },
      ...messages,
      {
        role: 'user',
        content: '请将以上对话压缩为摘要。',
      },
    ]

    // 非流式调用，低温度
    const compressConfig: AIConfig = {
      ...config,
      temperature: 0.2,
      maxTokens: 2048,
      thinkingEnabled: false,
    }

    const response = await aiManager.sendMessage(
      provider,
      compressMessages,
      compressConfig
    )

    return c.json({ summary: response || '' })
  } catch (error) {
    const aiError = AIError.fromUnknown(error)
    return c.json(createErrorResponse(aiError), aiError.httpStatus)
  }
})
```

注意：此端点不传 `toolPermissions`、不传 `onChunk`（非流式），`aiManager.sendMessage` 第四个参数为 `undefined`。

**验收标准:**
- `POST /api/chat/compress` 返回 `{ summary: string }`
- 空消息数组返回 `{ summary: '' }`
- 缺失字段返回 400 错误
- AI 调用失败返回结构化错误（不 crash）

---

## Step 6: settingsStore — 新增压缩开关

**改动文件:**
- `src/renderer/src/stores/settingsStore.ts`

**依赖:** 无（独立状态）

**具体改动:**

### 6a. 接口声明（settingsStore.ts:19 附近，`memoryEnabled` 之后）

```typescript
contextCompressionEnabled: boolean
```

### 6b. Action 声明（settingsStore.ts:34 附近，`setMemoryEnabled` 之后）

```typescript
setContextCompressionEnabled: (enabled: boolean) => void
```

### 6c. 初始值（settingsStore.ts:84 附近，`memoryEnabled: false` 之后）

```typescript
contextCompressionEnabled: true, // 默认开启
```

### 6d. Action 实现（settingsStore.ts:188 附近，`setMemoryEnabled` 实现之后）

```typescript
setContextCompressionEnabled: (enabled: boolean) => {
  set({ contextCompressionEnabled: enabled })
},
```

### 6e. partialize 持久化（settingsStore.ts:247 附近，`memoryEnabled` 之后）

```typescript
contextCompressionEnabled: state.contextCompressionEnabled,
```

### 6f. migrate 函数（settingsStore.ts:263 附近，`memoryEnabled` 之后）

```typescript
contextCompressionEnabled: state?.contextCompressionEnabled ?? true,
```

**验收标准:**
- `useSettingsStore.getState().contextCompressionEnabled` 默认为 `true`
- 切换后持久化到 localStorage，刷新后保持
- 不影响现有 settings 数据（migrate 兼容）

---

## Step 7: chatStore — 压缩检测 + 执行 + 过滤逻辑

**改动文件:**
- `src/renderer/src/stores/chatStore.ts`

**依赖:** Step 3, Step 4, Step 5, Step 6

**具体改动:**

这是最核心的一步，改动集中在 `sendMessage()` 方法内部。

### 7a. 新增常量和辅助函数（chatStore.ts 顶部，`triggerMemoryExtraction` 函数之后）

```typescript
// 上下文压缩常量
const COMPRESSION_THRESHOLD = 0.8
const KEEP_RECENT = 6

// 截断降级：AI 压缩失败时的 fallback
function generateTruncatedSummary(msgs: Message[]): string {
  const lines = msgs.map(m => {
    const prefix = m.role === 'user' ? 'User' : 'Assistant'
    const text = m.content.slice(0, 100)
    return `${prefix}: ${text}${m.content.length > 100 ? '...' : ''}`
  })
  return `[Truncated Summary]\n${lines.join('\n')}`
}
```

### 7b. 新增 `apiClient` 压缩方法（apiClient.ts，`APIClient` 类末尾）

在 `src/renderer/src/services/apiClient.ts` 的 `APIClient` 类中，`healthCheck` 方法之前新增：

```typescript
// 上下文压缩（非流式，30s 超时）
async compressMessages(
  provider: string,
  messages: AIMessage[],
  config: AIConfig
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(`${API_BASE_URL}/chat/compress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, messages, config }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw await parseErrorResponse(response)
    }

    const data = await response.json()
    return data.summary || ''
  } finally {
    clearTimeout(timeout)
  }
}
```

### 7c. sendMessage() 内部插入压缩逻辑

在 chatStore.ts 的 `sendMessage()` 方法中，精确插入位置如下：

**插入点 A — 压缩检测与执行（chatStore.ts:232-238 之间）**

在获取 `conversation`（第 232-237 行）之后、`buildContentBlocks` 函数定义（第 240 行）之前，插入压缩检测块：

```typescript
// --- 上下文压缩检测 ---
const compressionEnabled =
  useSettingsStore.getState().contextCompressionEnabled
const currentModel = useSettingsStore.getState().getCurrentModel()

if (compressionEnabled && currentModel?.contextLength) {
  // 找最近一条有 inputTokens 的 assistant 消息
  const lastAssistant = conversation.messages
    .filter(m => m.role === 'assistant' && m.inputTokens)
    .at(-1)

  if (lastAssistant?.inputTokens) {
    const ratio = lastAssistant.inputTokens / currentModel.contextLength
    // 未压缩的活跃消息（排除已压缩的）
    const activeMessages = conversation.messages.filter(m => !m.compressed)

    if (ratio >= COMPRESSION_THRESHOLD && activeMessages.length > KEEP_RECENT + 1) {
      // 筛选待压缩消息：排除最近 KEEP_RECENT 条
      const toCompress = activeMessages.slice(0, -KEEP_RECENT)
      const toCompressIds = toCompress.map(m => m.id)

      // 格式化待压缩消息为 AI 可读格式
      const compressPayload: AIMessage[] = toCompress.map(m => ({
        role: m.role as 'user' | 'assistant',
        content:
          m.content.length > 500 ? m.content.slice(0, 500) + '...' : m.content,
      }))

      let summaryContent: string
      try {
        summaryContent = await apiClient.compressMessages(
          providerType,
          compressPayload,
          config
        )
      } catch (err) {
        console.error('AI compression failed, falling back to truncation:', err)
        summaryContent = generateTruncatedSummary(toCompress)
      }

      // 先创建摘要消息 → 再标记原始消息
      const summaryId = uuidv4()
      await window.api.ipc.invoke('db:messages:createSummary', {
        id: summaryId,
        conversationId,
        content: summaryContent,
        summaryOf: toCompressIds,
        timestamp: Date.now(),
      })

      await window.api.ipc.invoke('db:messages:markCompressed', {
        messageIds: toCompressIds,
      })

      // 更新 Zustand 内存状态
      const summaryMessage: Message = {
        id: summaryId,
        role: 'assistant',
        content: summaryContent,
        timestamp: Date.now(),
        summaryOf: toCompressIds,
      }

      // 替换 conversation.messages：移除被压缩的 + 插入摘要
      const updatedMessages = [
        summaryMessage,
        ...conversation.messages.filter(
          m => !toCompressIds.includes(m.id)
        ),
      ]

      useConversationStore.getState().updateConversation(conversationId, {
        messages: updatedMessages,
      })

      // 重新获取 conversation 引用
      conversation = useConversationStore.getState().getCurrentConversation()!
    }
  }
}
// --- 压缩检测结束 ---
```

**注意：** `conversation` 变量需要从 `const` 改为 `let`（chatStore.ts:232 行）。

**插入点 B — historyMessages 过滤（chatStore.ts:274 附近）**

现有的 `historyMessages` 构建逻辑（第 274-288 行）需要增加 `.filter(m => !m.compressed)` 过滤：

```typescript
// 原始代码：
const historyMessages: AIMessage[] = await Promise.all(
  conversation.messages.map(async m => {
    // ...
  })
)

// 改为：
const historyMessages: AIMessage[] = await Promise.all(
  conversation.messages
    .filter(m => !m.compressed)  // 过滤已压缩消息
    .map(async m => {
      // ... 原有逻辑不变
    })
)
```

### 7d. `/compact` 手动触发支持

`/compact` 命令的触发不在 chatStore 内部，而是在 ChatInput.tsx 中拦截（见 Step 9）。但 chatStore 需要导出一个独立的压缩函数供 `/compact` 调用：

```typescript
// chatStore.ts 顶部，triggerMemoryExtraction 之后导出
export async function triggerCompression(
  conversationId: string,
  providerType: string,
  config: AIConfig
): Promise<{ compressed: boolean; count: number }> {
  const conv = useConversationStore
    .getState()
    .conversations.find(c => c.id === conversationId)
  if (!conv) return { compressed: false, count: 0 }

  const activeMessages = conv.messages.filter(m => !m.compressed)
  if (activeMessages.length <= KEEP_RECENT + 1) {
    return { compressed: false, count: 0 }
  }

  const toCompress = activeMessages.slice(0, -KEEP_RECENT)
  const toCompressIds = toCompress.map(m => m.id)

  const compressPayload: AIMessage[] = toCompress.map(m => ({
    role: m.role as 'user' | 'assistant',
    content:
      m.content.length > 500 ? m.content.slice(0, 500) + '...' : m.content,
  }))

  let summaryContent: string
  try {
    summaryContent = await apiClient.compressMessages(
      providerType,
      compressPayload,
      config
    )
  } catch (err) {
    console.error('AI compression failed, falling back to truncation:', err)
    summaryContent = generateTruncatedSummary(toCompress)
  }

  const summaryId = uuidv4()
  await window.api.ipc.invoke('db:messages:createSummary', {
    id: summaryId,
    conversationId,
    content: summaryContent,
    summaryOf: toCompressIds,
    timestamp: Date.now(),
  })

  await window.api.ipc.invoke('db:messages:markCompressed', {
    messageIds: toCompressIds,
  })

  const summaryMessage: Message = {
    id: summaryId,
    role: 'assistant',
    content: summaryContent,
    timestamp: Date.now(),
    summaryOf: toCompressIds,
  }

  const updatedMessages = [
    summaryMessage,
    ...conv.messages.filter(m => !toCompressIds.includes(m.id)),
  ]

  useConversationStore.getState().updateConversation(conversationId, {
    messages: updatedMessages,
  })

  return { compressed: true, count: toCompressIds.length }
}
```

**验收标准:**
- 当 ratio >= 0.8 且活跃消息 > 7 时，自动触发压缩
- 压缩后 historyMessages 不包含 compressed=true 的消息
- AI 压缩失败时降级为截断摘要
- 写入顺序：先创建摘要 → 再标记压缩
- `/compact` 可通过 `triggerCompression()` 手动触发

---

## Step 8: conversationStore — loadConversation 映射新字段

**改动文件:**
- `src/renderer/src/stores/conversationStore.ts`

**依赖:** Step 2, Step 3

**具体改动:**

在 `loadConversation()` 的 `mappedMessages` 映射中（conversationStore.ts:211-223），`durationMs` 映射之后追加两个字段：

```typescript
// conversationStore.ts — mappedMessages 映射，durationMs 之后追加
compressed: msg.compressed ?? false,
summaryOf: msg.summaryOf
  ? JSON.parse(msg.summaryOf)
  : undefined,
```

`summaryOf` 在 DB 中是 JSON string，这里解析为 `string[]`。`msg.summaryOf` 可能是 `summary_of`（snake_case 从 DB 返回），需要兼容：

```typescript
summaryOf: (msg.summaryOf ?? msg.summary_of)
  ? JSON.parse(msg.summaryOf ?? msg.summary_of)
  : undefined,
```

**验收标准:**
- 加载对话时，摘要消息的 `summaryOf` 是 `string[]` 类型
- 普通消息的 `compressed` 为 `false`，`summaryOf` 为 `undefined`
- 已压缩消息的 `compressed` 为 `true`

---

## Step 9: UI — CompressedSummary 组件 + MessageItem 集成 + /compact 命令

**改动文件:**
- `src/renderer/src/components/chat/CompressedSummary.tsx`（新增）
- `src/renderer/src/components/chat/MessageItem.tsx`
- `src/renderer/src/components/chat/ChatInput.tsx`

**依赖:** Step 3, Step 7, Step 8

**具体改动:**

### 9a. CompressedSummary 组件（新增文件）

`src/renderer/src/components/chat/CompressedSummary.tsx`

```typescript
import { useState, memo } from 'react'
import { ChevronRight } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'

interface CompressedSummaryProps {
  content: string
  compressedCount: number
}

export const CompressedSummary = memo<CompressedSummaryProps>(
  function CompressedSummary({ content, compressedCount }) {
    const [expanded, setExpanded] = useState(false)

    return (
      <div className="border border-dashed border-[hsl(var(--border))] rounded-lg px-4 py-3 text-sm text-[hsl(var(--text-muted))]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full text-left"
        >
          <ChevronRight
            className={`w-4 h-4 shrink-0 transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
          />
          <span>
            已压缩 {compressedCount} 条早期消息
          </span>
        </button>
        {expanded && (
          <div className="mt-3 pt-3 border-t border-dashed border-[hsl(var(--border))]">
            <MarkdownRenderer content={content} />
          </div>
        )}
      </div>
    )
  }
)
```

设计要点：
- 虚线边框 + muted 颜色，与正常消息视觉区分
- 折叠态：单行"已压缩 N 条早期消息"
- 展开态：用 MarkdownRenderer 渲染 AI 摘要
- `memo` 包裹避免不必要重渲染

### 9b. MessageItem 集成（MessageItem.tsx）

在 MessageItem.tsx 中，需要两处改动：

**Import 新增（MessageItem.tsx:1 附近）：**

```typescript
import { CompressedSummary } from './CompressedSummary'
```

**渲染逻辑（MessageItem.tsx:34 附近，`if (!message) return null` 之后）：**

在 `const isUser = message.role === 'user'` 之前，插入摘要消息的早期返回：

```typescript
// 摘要消息：渲染 CompressedSummary 组件
if (message.summaryOf && message.summaryOf.length > 0) {
  return (
    <div className="animate-fade-in-up">
      <CompressedSummary
        content={message.content}
        compressedCount={message.summaryOf.length}
      />
    </div>
  )
}

// 已压缩的消息不渲染
if (message.compressed) return null
```

这样摘要消息会渲染为折叠卡片，被压缩的原始消息完全隐藏。

### 9c. ChatInput — `/compact` 斜杠命令（ChatInput.tsx）

复用 `handleMemoryCommand` 的模式，在其之后新增 `handleCompactCommand`。

**Import 新增（ChatInput.tsx 顶部）：**

```typescript
import { triggerCompression } from '~/stores/chatStore'
```

**新增 handler（ChatInput.tsx:115 附近，`handleMemoryCommand` 之后）：**

```typescript
const handleCompactCommand = useCallback(
  async (message: string): Promise<boolean> => {
    if (message !== '~main/compact') return false

    const conv = getCurrentConversation()
    if (!conv) {
      notify.info('没有活跃的对话')
      return true
    }

    const provider = getCurrentProvider()
    const model = getCurrentModel()
    if (!provider || !model || !provider.apiKey) {
      notify.error('请先配置 AI 供应商')
      return true
    }

    notify.info('正在压缩对话上下文...')

    try {
      const aiConfig: AIConfig = {
        apiKey: provider.apiKey,
        model: model.modelId,
        baseURL: provider.baseURL || undefined,
        apiFormat: provider.apiFormat || 'chat-completions',
        temperature,
        maxTokens: 4096,
        thinkingEnabled: false,
      }

      const result = await triggerCompression(
        conv.id,
        provider.type,
        aiConfig
      )

      if (result.compressed) {
        notify.success(`已压缩 ${result.count} 条消息`)
      } else {
        notify.info('消息数量不足，无需压缩')
      }
    } catch {
      notify.error('压缩失败')
    }
    return true
  },
  [getCurrentConversation, getCurrentProvider, getCurrentModel, temperature]
)
```

**handleSend 中拦截（ChatInput.tsx:232 附近，`handleMemoryCommand` 拦截之后）：**

```typescript
// 原有：
if (await handleMemoryCommand(message)) return

// 之后追加：
if (await handleCompactCommand(message)) return
```

注意：ChatInput 中斜杠命令的内部表示是 `~main/compact`（与 `~main/remember` 等一致），用户输入 `/compact` 时由现有的斜杠命令转换逻辑映射。

**验收标准:**
- CompressedSummary 组件：折叠态显示压缩条数，展开态显示摘要内容
- MessageItem：摘要消息渲染为 CompressedSummary，已压缩消息不渲染
- `/compact` 命令：消息不足时提示"无需压缩"，成功时提示压缩条数
- 压缩失败时显示错误 toast

---

## Step 10: Settings UI — 上下文管理区块

**改动文件:**
- `src/renderer/src/components/settings/MemorySettings.tsx`

**依赖:** Step 6

**具体改动:**

在 MemorySettings.tsx 的记忆功能 toggle 区块之后（MemorySettings.tsx:433 附近，`</div>` 闭合记忆 toggle 之后），新增"上下文管理"区块。

设计上放在记忆功能 toggle 和记忆列表之间，作为独立区块。

**Store hooks 新增（MemorySettings.tsx:48-49 附近）：**

```typescript
const contextCompressionEnabled = useSettingsStore(
  s => s.contextCompressionEnabled
)
const setContextCompressionEnabled = useSettingsStore(
  s => s.setContextCompressionEnabled
)
```

**JSX 插入位置（MemorySettings.tsx:433 附近，记忆 toggle `</div>` 之后）：**

复用记忆 toggle 的 UI 模式（flex justify-between + switch），插入在 `{!memoryEnabled && (` 判断之前：

```tsx
{/* 上下文压缩 toggle */}
<div className="flex items-center justify-between">
  <div>
    <h3 className="text-base font-semibold">上下文压缩</h3>
    <p className="text-xs text-muted-foreground mt-1">
      {contextCompressionEnabled
        ? '已开启 — 对话过长时自动压缩早期消息'
        : '开启后，长对话将自动压缩以节省上下文窗口'}
    </p>
  </div>
  <button
    role="switch"
    aria-checked={contextCompressionEnabled}
    aria-label="上下文压缩开关"
    onClick={() =>
      setContextCompressionEnabled(!contextCompressionEnabled)
    }
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      contextCompressionEnabled ? 'bg-primary' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
        contextCompressionEnabled
          ? 'translate-x-6'
          : 'translate-x-1'
      }`}
    />
  </button>
</div>
```

样式与记忆 toggle 完全一致（同一个 `space-y-6` 容器内的兄弟元素）。

**验收标准:**
- Settings 页面"记忆功能"区块下方出现"上下文压缩"开关
- 开关状态持久化，刷新后保持
- 开关关闭时，自动压缩不触发（Step 7 中检查 `compressionEnabled`）
- 开关关闭不影响 `/compact` 手动命令（手动命令不检查开关）

---

## 依赖关系图

```
Step 1 (schema) ──→ Step 2 (migration) ──→ Step 4 (service + IPC)
     │                                           │
     └──→ Step 3 (shared types) ─────────────────┤
                                                  │
Step 5 (API endpoint) ────────────────────────────┤
                                                  │
Step 6 (settingsStore) ───────────────────────────┤
                                                  │
                                                  ▼
                                        Step 7 (chatStore 核心逻辑)
                                                  │
Step 8 (conversationStore) ←── Step 2, Step 3     │
                                                  │
                                                  ▼
                                        Step 9 (UI 组件)
                                                  │
Step 10 (Settings UI) ←── Step 6                  │
```

**可并行的步骤组：**
- Group A: Step 1 + Step 3（schema + shared types，无运行时依赖）
- Group B: Step 5 + Step 6（API endpoint + settingsStore，互相独立）
- Group C: Step 8 + Step 10（conversationStore + Settings UI，互相独立）

---

## 改动文件汇总

| 文件 | 步骤 | 改动类型 |
|------|------|---------|
| `src/main/db/schema.ts` | 1 | 新增字段 |
| `src/main/db/index.ts` | 2 | 新增迁移 |
| `src/shared/types/conversation.ts` | 3 | 新增字段 |
| `src/main/db/services/messageService.ts` | 4 | 新增方法 |
| `src/main/index.ts` | 4 | 新增 IPC handler |
| `src/api/routes/chat.ts` | 5 | 新增端点 |
| `src/renderer/src/stores/settingsStore.ts` | 6 | 新增状态 |
| `src/renderer/src/services/apiClient.ts` | 7 | 新增方法 |
| `src/renderer/src/stores/chatStore.ts` | 7 | 核心逻辑 |
| `src/renderer/src/stores/conversationStore.ts` | 8 | 字段映射 |
| `src/renderer/src/components/chat/CompressedSummary.tsx` | 9 | **新增文件** |
| `src/renderer/src/components/chat/MessageItem.tsx` | 9 | 条件渲染 |
| `src/renderer/src/components/chat/ChatInput.tsx` | 9 | /compact 命令 |
| `src/renderer/src/components/settings/MemorySettings.tsx` | 10 | 新增开关 |

总计：13 个已有文件改动 + 1 个新增文件

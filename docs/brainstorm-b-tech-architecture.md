# 头脑风暴 B：上下文压缩 — 技术架构方案

> 日期: 2026-02-27
> 角色: 技术架构探索
> 状态: 草案

---

## 1. 压缩算法对比分析

### 1.1 方案 A：简单截断（Sliding Window）

**原理**: 保留最近 N 条消息，丢弃更早的消息。

```
消息历史: [m1, m2, m3, m4, m5, m6, m7, m8, m9, m10]
窗口大小: 6
发送给 AI: [m5, m6, m7, m8, m9, m10]
```

| 维度 | 评估 |
|------|------|
| Token 成本 | 0（无额外 AI 调用） |
| 实现复杂度 | 极低（一行 slice） |
| 信息保留 | 差 — 早期决策、偏好、上下文全部丢失 |
| 延迟 | 0ms |
| 适用场景 | 闲聊、无状态问答 |

### 1.2 方案 B：AI 摘要压缩

**原理**: 用 AI 将早期消息压缩为摘要，替换原始消息。

```
消息历史: [m1, m2, m3, m4, m5, m6, m7, m8, m9, m10]
压缩范围: [m1..m4] → summary_msg
发送给 AI: [summary_msg, m5, m6, m7, m8, m9, m10]
```

| 维度 | 评估 |
|------|------|
| Token 成本 | 输入 ~2k-8k tokens + 输出 ~500-1k tokens（每次压缩） |
| 实现复杂度 | 中等 — 需要额外 AI 调用、错误处理、状态管理 |
| 信息保留 | 好 — 关键决策和上下文被保留在摘要中 |
| 延迟 | 2-8s（取决于模型和待压缩内容量） |
| 适用场景 | 编程助手（需要保留项目上下文和决策历史） |

### 1.3 方案 C：混合方案（推荐）

**原理**: AI 摘要为主，简单截断为兜底。

```
正常路径: AI 摘要压缩（方案 B）
降级路径: AI 调用失败 → 回退到简单截断（方案 A）
优化: tool call 的 input/output 在压缩前先截断大文本块
```

| 维度 | 评估 |
|------|------|
| Token 成本 | 正常 ~3k-5k tokens/次，失败时 0 |
| 实现复杂度 | 中等偏高 |
| 信息保留 | 最优 — 正常时保留摘要，异常时至少保留近期消息 |
| 可靠性 | 高 — 有降级路径，不会阻塞用户发消息 |

**推荐方案 C**，理由：
1. 编程助手场景下，早期上下文（项目结构、技术决策）非常重要
2. 压缩成本相对于整个对话的 token 消耗来说很小（~3%）
3. 降级路径保证了可靠性

---

## 2. Schema 变更

### 2.1 messages 表新增字段

现有 `messages` 表（`src/main/db/schema.ts:21-33`）需要新增两个字段：

```typescript
// src/main/db/schema.ts — messages 表新增
compressed: integer('compressed', { mode: 'boolean' }).default(false),
summaryOf: text('summary_of'),  // JSON string: 被压缩的消息 ID 数组
```

**字段说明：**
- `compressed` — 标记该消息是否已被压缩（即不再发送给 AI）。默认 `false`，旧数据兼容。
- `summaryOf` — 仅摘要消息有值，存储被压缩的原始消息 ID 列表（JSON 数组字符串）。用于 UI 展示"已压缩 N 条消息"和未来的恢复功能。

### 2.2 conversations 表新增字段（可选，P1）

```typescript
// 可选：记录对话级压缩状态
compressionCount: integer('compression_count').default(0),
```

P0 不需要，可以从 messages 表动态计算。

### 2.3 迁移逻辑

在 `src/main/db/index.ts` 的 `runSchemaMigrations()` 中追加：

```typescript
// 上下文压缩：messages 表新增 compressed 和 summary_of 字段
const msgCols = sqlite.pragma('table_info(messages)') as { name: string }[]
const hasCompressed = msgCols.some(col => col.name === 'compressed')

if (!hasCompressed) {
  console.log('📦 Adding context compression columns to messages table...')
  sqlite.exec(
    'ALTER TABLE messages ADD COLUMN compressed INTEGER DEFAULT 0'
  )
  sqlite.exec('ALTER TABLE messages ADD COLUMN summary_of TEXT')
  console.log('✅ Added context compression columns')
}
```

**迁移策略：** 与现有模式一致 — `ALTER TABLE ADD COLUMN`，单向不可回滚，默认值保证旧数据兼容。

---

## 3. API 端点设计

### 3.1 新增 Hono 路由：`POST /api/chat/compress`

压缩逻辑放在 API 层（与 MemoryExtractor 同层），因为需要调用 AI 生成摘要。

**文件**: `src/api/routes/chat.ts`

```typescript
interface CompressRequest {
  provider: string
  messages: AIMessage[]  // 待压缩的消息（已从 Renderer 筛选好）
  config: AIConfig
}

interface CompressResponse {
  summary: string        // AI 生成的摘要文本
}
```

**路由伪代码：**

```typescript
app.post('/chat/compress', async c => {
  const { provider, messages, config } = await c.req.json<CompressRequest>()

  // 校验
  if (!provider || !messages?.length || !config) {
    return c.json({ error: 'Missing required fields' }, 400)
  }

  // 构建压缩 prompt
  const compressMessages: AIMessage[] = [
    { role: 'system', content: COMPRESSION_SYSTEM_PROMPT },
    { role: 'user', content: formatMessagesForCompression(messages) },
  ]

  // 非流式调用，低温度
  const compressConfig = { ...config, temperature: 0.2 }
  const summary = await aiManager.sendMessage(
    provider, compressMessages, compressConfig
  )

  return c.json({ summary })
})
```

### 3.2 为什么不复用 `/chat` 端点

- 压缩是内部操作，不需要 tool calling、权限检查
- 需要独立的超时控制（30s）
- 便于监控和计费统计

---

## 4. chatStore 改造分析

### 4.1 sendMessage() 改动点

当前 `sendMessage()`（`src/renderer/src/stores/chatStore.ts:171-598`）的核心流程：

```
1. 创建 user message → 持久化 DB
2. 获取 conversation.messages → 构建 historyMessages
3. 构建 system prompt（含 memory 注入）
4. 调用 apiClient.sendMessageStream()
5. 流式更新 assistant message
6. 持久化 assistant message → 触发 memory 提取
```

**需要在步骤 2 和 3 之间插入压缩检测逻辑：**

```
1. 创建 user message → 持久化 DB
2. 获取 conversation.messages
   ┌─ 2.5 压缩检测 ─────────────────────────────┐
   │ a. 读取 lastInputTokens + contextLength     │
   │ b. 计算 ratio，判断是否超过阈值             │
   │ c. 如果需要压缩：                           │
   │    - 筛选待压缩消息（排除已压缩的）          │
   │    - 调用 /api/chat/compress 获取摘要        │
   │    - 标记原始消息 compressed=true（DB+内存）  │
   │    - 创建摘要消息（DB+内存）                 │
   │    - 如果 AI 调用失败，跳过压缩（降级）      │
   └─────────────────────────────────────────────┘
3. 构建 historyMessages（过滤 compressed=true 的消息）
4. 构建 system prompt
5. 调用 apiClient.sendMessageStream()
...
```

### 4.2 压缩逻辑放在哪一层

**对比三个候选位置：**

| 位置 | 优点 | 缺点 |
|------|------|------|
| chatStore（Renderer） | 可以直接操作内存状态、控制 UI 反馈 | 需要通过 HTTP 调用 AI，跨层 |
| API 层（Hono route） | 与 AI 调用同层，天然适合 | 无法直接操作 DB 和内存状态 |
| Main Process（IPC） | 可以直接操作 DB | 需要跨层调用 AI API |

**推荐：chatStore 编排 + API 层执行摘要生成**

理由：
- chatStore 已经是 `sendMessage` 的编排中心，压缩是发送前的预处理步骤
- 摘要生成通过 HTTP 调用 API 层（复用 MemoryExtractor 的模式）
- DB 操作通过 IPC 调用 Main Process（复用现有 dbClient 模式）
- 内存状态直接在 chatStore 更新

这与 Memory 提取的模式一致：chatStore 触发 → IPC → Main Process 调用 API 层。

### 4.3 sendMessage 伪代码改动

```typescript
// chatStore.sendMessage() 内部，获取 conversation 之后

// --- 压缩检测 ---
const settingsState = useSettingsStore.getState()
const currentModel = settingsState.getCurrentModel()
const contextLength = currentModel?.contextLength

if (contextLength && settingsState.contextCompressionEnabled) {
  const lastAssistant = conversation.messages
    .filter(m => m.role === 'assistant' && m.inputTokens)
    .at(-1)

  const ratio = (lastAssistant?.inputTokens ?? 0) / contextLength
  const threshold = settingsState.contextCompressionThreshold

  if (ratio >= threshold) {
    await compressConversationContext(conversationId, conversation, config)
    // 重新获取 conversation（压缩后消息列表已变）
    conversation = useConversationStore.getState().getCurrentConversation()!
  }
}

// --- 构建 historyMessages 时过滤 ---
const historyMessages = await Promise.all(
  conversation.messages
    .filter(m => !m.compressed)  // 新增：过滤已压缩消息
    .map(async m => { /* 现有逻辑 */ })
)
```

---

## 5. IPC 通信设计

### 5.1 新增 IPC Handler

需要在 `src/main/index.ts` 新增两个 handler：

```typescript
// 批量标记消息为已压缩
ipcMain.handle(
  'messages:markCompressed',
  async (_, { messageIds }: { messageIds: string[] }) => {
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      throw new Error('messageIds must be a non-empty array')
    }
    await MessageService.markCompressed(messageIds)
  }
)

// 创建摘要消息
ipcMain.handle(
  'messages:createSummary',
  async (_, data: {
    id: string
    conversationId: string
    content: string
    summaryOf: string
    timestamp: number
  }) => {
    const err = validateInput(data, [
      'id', 'conversationId', 'content', 'summaryOf',
    ])
    if (err) throw new Error(err)
    return await MessageService.createSummary(data)
  }
)
```

### 5.2 Preload Bridge 扩展

`src/preload/index.ts` 需要暴露新接口：

```typescript
messages: {
  // ...现有方法
  markCompressed: (messageIds: string[]) =>
    ipcRenderer.invoke('messages:markCompressed', { messageIds }),
  createSummary: (data: {
    id: string
    conversationId: string
    content: string
    summaryOf: string
    timestamp: number
  }) => ipcRenderer.invoke('messages:createSummary', data),
}
```

### 5.3 MessageService 新增方法

`src/main/db/services/messageService.ts` 新增：

```typescript
// 批量标记消息为已压缩
static async markCompressed(messageIds: string[]) {
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
  summaryOf: string
  timestamp: number
}) {
  const db = getDatabase()
  await db.insert(messages).values({
    id: data.id,
    conversationId: data.conversationId,
    role: 'assistant',
    content: data.content,
    summaryOf: data.summaryOf,
    compressed: false,
    timestamp: new Date(data.timestamp),
  })
}
```

---

## 6. 与现有系统集成

### 6.1 ContextIndicator 触发压缩

当前 `ContextIndicator`（`src/renderer/src/components/chat/ContextIndicator.tsx`）是纯展示组件。有两种集成方式：

**方案 A：ContextIndicator 仅展示，chatStore 自动触发**（推荐）
- ContextIndicator 不变，继续做纯展示
- 压缩触发逻辑在 `chatStore.sendMessage()` 内部
- 用户无感知，发消息时自动检测并压缩

**方案 B：ContextIndicator 增加手动压缩按钮**（P1 增强）
- 在 critical 状态（>90%）时显示"压缩"按钮
- 点击后调用 `chatStore.compressContext()`
- 给用户主动控制权

P0 用方案 A，P1 可以加方案 B 作为增强。

### 6.2 Memory 系统配合

压缩与 Memory 系统的交互点：

1. **压缩前触发 Memory 提取**：压缩会丢失消息细节，应在压缩前对待压缩消息做一次 memory 提取，确保重要信息被持久化到 Memory 系统。
2. **摘要消息不参与 Memory 提取**：摘要消息的 content 以 `[Context Summary]` 开头，MemoryExtractor 应跳过这类消息（避免从摘要中提取"二手"记忆）。
3. **Memory 注入不受压缩影响**：Memory 注入在 system prompt 层面，与消息历史独立，压缩不影响 memory 检索。

### 6.3 conversationStore 集成

`loadConversation()`（`src/renderer/src/stores/conversationStore.ts:164-236`）需要映射新字段：

```typescript
// conversationStore.loadConversation() 的 mappedMessages 中新增
compressed: msg.compressed ?? false,
summaryOf: msg.summaryOf ? JSON.parse(msg.summaryOf) : undefined,
```

---

## 7. 性能考量

### 7.1 Token 成本控制

**压缩本身的 token 消耗：**

| 场景 | 待压缩消息量 | 输入 tokens | 输出 tokens | 成本占比 |
|------|-------------|------------|------------|---------|
| 首次压缩（~80% 上下文） | ~30 条消息 | ~4k-8k | ~500-1k | ~3-5% |
| 后续压缩（增量） | ~6-10 条消息 | ~2k-4k | ~300-500 | ~1-2% |

**控制策略：**

1. **压缩前预处理**：tool call 的 input/output 往往很大（文件内容、命令输出），压缩前先截断到 500 字符，只保留摘要信息
2. **使用小模型**：压缩任务不需要最强模型，可以用同 provider 的小模型（如 haiku 替代 opus）— P1 优化
3. **压缩频率控制**：每次压缩后至少保留 6 条消息（3 轮对话），避免频繁触发
4. **字符上限**：待压缩文本总量限制在 MAX_COMPRESSION_CHARS（如 12000 字符），超出部分直接截断

### 7.2 并发问题

**场景：用户快速连续发消息**

当前 `chatStore` 通过 `isLoading` 状态防止并发发送。压缩在 `sendMessage` 内部同步执行（await），所以不会出现并发压缩。

**场景：压缩与 Memory 提取并发**

Memory 提取是 fire-and-forget，压缩是同步 await。两者操作不同的字段（memory 操作 memories 表，压缩操作 messages 表的 compressed 字段），不会冲突。

**场景：压缩期间用户取消**

压缩在 `sendMessage` 的 try 块内，如果用户在压缩期间 abort：
- 压缩 AI 调用可能已完成或未完成
- 如果已完成但 DB 写入未完成 → 下次发消息会重新检测并压缩
- 如果 DB 写入已完成 → 压缩生效，abort 只影响后续的消息发送

**结论：** 不需要额外的并发控制机制。

### 7.3 延迟影响

压缩会在用户发消息时增加 2-8s 延迟。缓解策略：

1. **UI 反馈**：压缩期间显示"正在优化上下文..."提示
2. **超时控制**：压缩 AI 调用设置 30s 超时，超时则降级为截断
3. **频率控制**：不是每条消息都触发，只在超过阈值时触发

---

## 8. 数据完整性

### 8.1 压缩后原始消息处理

**原则：原始消息永远不删除。**

- `compressed=true` 的消息仍保留在 DB 中，只是不再发送给 AI
- UI 中默认隐藏已压缩消息，但可以通过摘要消息的展开按钮查看原始内容
- 摘要消息的 `summaryOf` 字段记录了被压缩的消息 ID，可以反向查找

### 8.2 可恢复性

**P0：不支持恢复**（压缩是单向操作）

**P1 可选恢复方案：**

```typescript
// 恢复压缩：将 summaryOf 中的消息标记回 compressed=false，删除摘要消息
async function uncompressMessages(summaryMessageId: string) {
  const summaryMsg = await MessageService.getById(summaryMessageId)
  if (!summaryMsg?.summaryOf) return

  const originalIds = JSON.parse(summaryMsg.summaryOf) as string[]
  await MessageService.markUncompressed(originalIds)
  await MessageService.delete(summaryMessageId)
}
```

恢复后 AI 会重新看到完整历史，但下次发消息可能又触发压缩。实用性有限，P1 再评估。

### 8.3 数据一致性

压缩操作涉及三步写入：

1. 标记原始消息 `compressed=true`（IPC → DB）
2. 创建摘要消息（IPC → DB）
3. 更新内存中的消息列表（Zustand state）

**风险：** 步骤 1 成功但步骤 2 失败 → 消息被标记为压缩但没有摘要。

**缓解：** 调整执行顺序为 2 → 1 → 3（先创建摘要，再标记压缩）。如果步骤 1 失败，摘要消息多余但无害（下次压缩会跳过已有摘要的范围）。

---

## 9. 渐进式实现计划

### 9.1 P0：最小可用方案

目标：上下文超过阈值时自动压缩，用户无感知。

**改动范围（7 个文件）：**

| 文件 | 改动 |
|------|------|
| `src/main/db/schema.ts` | messages 表加 `compressed`、`summaryOf` 字段 |
| `src/main/db/index.ts` | `runSchemaMigrations()` 加迁移逻辑 |
| `src/main/db/services/messageService.ts` | 加 `markCompressed()`、`createSummary()` |
| `src/shared/types/conversation.ts` | Message 接口加 `compressed`、`summaryOf` |
| `src/api/routes/chat.ts` | 加 `POST /chat/compress` 端点 |
| `src/renderer/src/stores/chatStore.ts` | sendMessage 加压缩检测、过滤逻辑 |
| `src/renderer/src/stores/conversationStore.ts` | loadConversation 映射新字段 |

**P0 不包含：**
- Settings UI（压缩开关/阈值）— 硬编码默认值
- CompressedSummary UI 组件 — 摘要消息用普通消息样式显示
- 手动压缩按钮
- Preload bridge 扩展（P0 可以通过 dbClient 现有模式操作）

### 9.2 P1：完整体验

| 功能 | 文件 |
|------|------|
| Settings UI 压缩开关/阈值 | `settingsStore.ts`, `Settings.tsx` |
| CompressedSummary 组件 | 新增 `CompressedSummary.tsx` |
| ContextIndicator 手动压缩按钮 | `ContextIndicator.tsx` |
| Preload bridge 正式扩展 | `preload/index.ts` |
| 压缩前触发 Memory 提取 | `chatStore.ts` |
| 压缩使用小模型优化 | `settingsStore.ts`, `chatStore.ts` |

### 9.3 P2：高级功能

- 压缩恢复（uncompress）
- 多级压缩（摘要的摘要）
- 压缩统计面板（节省了多少 token）
- 自定义压缩 prompt

---

## 10. 压缩 Prompt 设计

### 10.1 System Prompt

```typescript
const COMPRESSION_SYSTEM_PROMPT = `你是一个对话压缩助手。你的任务是将一段对话历史压缩为简洁的摘要。

要求：
1. 保留所有关键信息：技术决策、代码变更、文件路径、错误信息、用户偏好
2. 保留因果关系：为什么做了某个决策，问题的根因是什么
3. 用第三人称描述（"用户要求..."、"助手建议..."）
4. 对于代码相关内容，保留文件名和关键代码片段
5. 对于 tool call 结果，只保留关键输出（成功/失败、关键数据）
6. 输出纯文本，不要用 markdown 格式
7. 控制在 500 字以内`
```

### 10.2 消息格式化函数

```typescript
function formatMessagesForCompression(messages: AIMessage[]): string {
  const MAX_TOOL_OUTPUT = 500

  return messages
    .map(m => {
      const role = m.role === 'user' ? 'User' : 'Assistant'
      const text = getTextContent(m.content)
      // 截断过长的 tool output
      const truncated =
        text.length > MAX_TOOL_OUTPUT
          ? text.slice(0, MAX_TOOL_OUTPUT) + '...[truncated]'
          : text
      return `[${role}]: ${truncated}`
    })
    .join('\n\n')
}
```

---

## 11. 完整压缩流程伪代码

```typescript
/**
 * 上下文压缩核心函数
 * 在 chatStore.sendMessage() 内部调用
 */
async function compressConversationContext(
  conversationId: string,
  conversation: Conversation,
  providerType: string,
  config: AIConfig
): Promise<void> {
  const KEEP_RECENT = 6 // 保留最近 6 条消息（3 轮对话）
  const MAX_COMPRESSION_CHARS = 12000

  // 1. 筛选未压缩的消息
  const activeMessages = conversation.messages.filter(m => !m.compressed)

  // 2. 消息太少，不压缩
  if (activeMessages.length <= KEEP_RECENT + 1) return

  // 3. 分割：待压缩 vs 保留
  const toCompress = activeMessages.slice(
    0,
    activeMessages.length - KEEP_RECENT
  )
  const compressedIds = toCompress.map(m => m.id)
```

```typescript
  // 4. 格式化待压缩消息（截断大文本）
  const aiMessages: AIMessage[] = toCompress.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  let summaryText: string

  try {
    // 5. 调用 AI 生成摘要（非流式，30s 超时）
    const response = await apiClient.compress(
      providerType,
      aiMessages,
      { ...config, temperature: 0.2 }
    )
    summaryText = response.summary
  } catch (error) {
    // 6. 降级：AI 调用失败，回退到简单截断
    console.error('Compression AI call failed, falling back:', error)
    summaryText = toCompress
      .map(m => {
        const preview = m.content.slice(0, 100)
        return `[${m.role}]: ${preview}...`
      })
      .join('\n')
    summaryText = `[Truncated Summary]\n${summaryText}`
  }
```

```typescript
  // 7. 持久化：先创建摘要，再标记压缩（安全顺序）
  const summaryId = uuidv4()
  const summaryContent = `[Context Summary]\n\n${summaryText}`

  // 7a. 创建摘要消息
  await dbClient.messages.createSummary({
    id: summaryId,
    conversationId,
    content: summaryContent,
    summaryOf: JSON.stringify(compressedIds),
    timestamp: toCompress[0].timestamp,
  })

  // 7b. 标记原始消息为已压缩
  await dbClient.messages.markCompressed(compressedIds)
```

```typescript
  // 8. 更新内存状态
  const summaryMessage: Message = {
    id: summaryId,
    role: 'assistant',
    content: summaryContent,
    timestamp: toCompress[0].timestamp,
    compressed: false,
    summaryOf: compressedIds,
  }

  // 更新 conversationStore：标记压缩 + 插入摘要
  useConversationStore.getState().updateConversation(conversationId, {
    messages: [
      summaryMessage,
      ...conversation.messages
        .filter(m => !compressedIds.includes(m.id))
        .map(m =>
          compressedIds.includes(m.id)
            ? { ...m, compressed: true }
            : m
        ),
    ],
  })
}
```

---

## 12. 类型变更汇总

### 12.1 `src/shared/types/conversation.ts`

```typescript
export interface Message {
  // ...现有字段
  compressed?: boolean       // 是否已被压缩
  summaryOf?: string[]       // 被压缩的消息 ID 列表
}
```

### 12.2 `src/renderer/src/stores/settingsStore.ts`

```typescript
// 新增 state 字段
contextCompressionEnabled: boolean  // 默认 true
contextCompressionThreshold: number // 默认 0.8（80%）
```

### 12.3 `src/main/db/schema.ts`

```typescript
// messages 表新增字段
compressed: integer('compressed', { mode: 'boolean' }).default(false),
summaryOf: text('summary_of'),
```

---

## 13. 与现有设计文档的差异分析

对比 `docs/2026-02-11-design-context-management.md` 中的设计：

| 维度 | 原设计 | 本方案建议 | 理由 |
|------|--------|-----------|------|
| 压缩触发位置 | chatStore 内部 | 同意 | chatStore 是编排中心 |
| AI 调用方式 | 直接在 Renderer 调用 apiClient | 通过 `/chat/compress` 端点 | 与 MemoryExtractor 模式一致，便于超时控制 |
| 降级策略 | 未提及 | AI 失败回退到截断 | 保证可靠性 |
| 数据写入顺序 | 先标记压缩再创建摘要 | 先创建摘要再标记压缩 | 避免中间状态不一致 |
| tool call 处理 | 未提及 | 压缩前截断大文本块 | 控制 token 成本 |
| Memory 配合 | 未提及 | 压缩前触发 Memory 提取 | 避免信息丢失 |
| 压缩 prompt | 中文 prompt | 中文 prompt + 编程场景优化 | 保留文件路径、代码片段 |

---

## 14. 风险与开放问题

### 14.1 已识别风险

1. **摘要质量不可控**：AI 可能遗漏关键信息（如特定文件路径、错误码）。缓解：压缩 prompt 明确要求保留这些信息。
2. **多次压缩的信息衰减**：长对话可能触发多次压缩，摘要的摘要会逐步丢失细节。缓解：P2 考虑"摘要合并"策略。
3. **不同模型的摘要质量差异**：小模型（如 deepseek-chat）的摘要质量可能不如大模型。缓解：P0 使用当前对话模型，P1 允许配置压缩专用模型。

### 14.2 开放问题

1. **KEEP_RECENT 的最优值？** 当前设计为 6（3 轮对话）。太少会丢失近期上下文，太多会导致压缩效果不明显。需要实际测试确定。
2. **阈值 0.8 是否合适？** 太低会频繁触发压缩（浪费 token），太高可能来不及压缩就超限。建议 P1 做成可配置。
3. **摘要消息的 role 应该是什么？** 当前设计为 `assistant`，但也可以用 `system`。`assistant` 的好处是不影响 system prompt 的结构。
4. **是否需要压缩 thinking 内容？** 当前 thinking 字段不发送给 AI（仅 UI 展示），所以不需要压缩。但如果未来 thinking 参与上下文，需要重新考虑。

---

## 15. 总结

### 核心技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 压缩算法 | 混合方案（AI 摘要 + 截断降级） | 信息保留最优，有可靠降级路径 |
| 架构分层 | chatStore 编排 + API 层生成摘要 | 与 Memory 提取模式一致 |
| 数据保留 | 原始消息不删除，标记 compressed | 可审计、可恢复 |
| 触发方式 | sendMessage 前自动检测 | 用户无感知，零配置 |
| 写入顺序 | 先创建摘要再标记压缩 | 避免中间状态不一致 |

### P0 改动量估算

- 新增代码：~200 行（压缩函数 + API 端点 + DB 方法 + 迁移）
- 修改代码：~30 行（chatStore 过滤 + conversationStore 映射）
- 新增文件：0（全部在现有文件中修改）
- 涉及文件：7 个

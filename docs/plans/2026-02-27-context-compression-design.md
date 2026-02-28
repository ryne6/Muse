# 上下文自动压缩 — 统一设计文档

> 日期: 2026-02-27
> 优先级: P0（自动压缩核心）/ P1（增强体验）
> 输入: brainstorm-a（产品视角）、brainstorm-b（技术架构）、design-context-management（原始设计）

---

## 1. 概述

当长对话的 token 使用量接近模型上下文上限时，系统自动用 AI 将早期消息压缩为摘要，替换原始消息发送给 AI，避免用户遇到"上下文超限"错误。原始消息保留在数据库中，UI 以折叠摘要卡片展示。压缩对用户近乎无感知，失败时静默降级。

---

## 2. P0 Scope

**包含：**
- messages 表新增 `compressed`、`summary_of` 字段 + 迁移
- Message 类型扩展
- `POST /api/chat/compress` 端点（AI 摘要生成）
- chatStore 压缩检测 + 过滤逻辑
- conversationStore 映射新字段
- CompressedSummary 折叠摘要卡片组件
- MessageItem 集成摘要渲染
- `/compact` 斜杠命令（手动触发压缩）
- Settings 单个 toggle 开关（阈值硬编码 0.8）
- 压缩过程 loading 提示
- AI 失败时降级为简单截断

**不包含：**
- ContextIndicator 手动压缩按钮
- 阈值/保留消息数可配置
- 查看原始消息功能
- 压缩前触发 Memory 提取（P1）
- 压缩专用小模型配置
- Preload bridge 正式扩展（P0 复用现有 dbClient 模式）

---

## 3. 触发机制

**时机：** `chatStore.sendMessage()` 发送 API 请求之前，同步阻塞检测。

**条件：**
```
contextLength = currentModel.contextLength
lastInputTokens = 上一条 assistant 消息的 inputTokens
ratio = lastInputTokens / contextLength

触发压缩当且仅当：
  1. contextCompressionEnabled === true
  2. contextLength 存在且 > 0
  3. lastInputTokens 存在
  4. ratio >= 0.8（硬编码阈值）
  5. 未压缩的活跃消息数 > KEEP_RECENT + 1（即 > 7）
```

**为什么 0.8 而非 0.9：** 压缩本身需要一次 AI 调用消耗 token，留 20% 余量确保压缩请求不会超限。

**手动触发：** 用户输入 `/compact` 时无视阈值条件，直接触发压缩（仍需满足活跃消息数 > KEEP_RECENT + 1）。复用 `handleMemoryCommand` 同级的 `handleCompactCommand` 处理，模式为 `~main/compact`。

**阈值联动（已有 ContextIndicator）：**

| 阈值 | 行为 |
|------|------|
| 70% | 橙色文字（已实现） |
| 80% | 触发自动压缩 |
| 90% | 红色进度条（已实现） |

---

## 4. 压缩流程

```
用户点击发送
  → chatStore.sendMessage()
    → 1. 创建 user message，持久化 DB
    → 2. 获取 conversation.messages
    → 3. 压缩检测：ratio >= 0.8？
      → YES:
        a. 筛选未压缩消息，排除最近 6 条（KEEP_RECENT）
        b. 格式化待压缩消息（tool output 截断到 500 字符）
        c. POST /api/chat/compress 获取 AI 摘要（30s 超时，temperature=0.2）
        d. 失败降级：生成截断摘要（每条消息取前 100 字符）
        e. 先创建摘要消息（DB）→ 再标记原始消息 compressed=true（DB）
        f. 更新 Zustand 内存状态
        g. 重新获取 conversation
      → NO: 跳过
    → 4. 构建 historyMessages（过滤 compressed=true）
    → 5. 构建 system prompt + 调用 AI 流式响应
    → 6. 持久化 assistant message
```

**写入顺序选择"先摘要后标记"：** 如果标记成功但摘要创建失败，会导致消息被标记为压缩却没有摘要。反过来，多余的摘要消息无害，下次压缩会跳过已有摘要的范围。两份方案一致采纳此顺序。

---

## 5. 数据模型变更

### 5.1 Schema 变更

`src/main/db/schema.ts` — messages 表新增：

```typescript
compressed: integer('compressed', { mode: 'boolean' }).default(false),
summaryOf: text('summary_of'), // JSON string: 被压缩的消息 ID 数组
```

### 5.2 迁移逻辑

`src/main/db/index.ts` — `runSchemaMigrations()` 追加：

```typescript
const msgCols = sqlite.pragma('table_info(messages)') as { name: string }[]
if (!msgCols.some(col => col.name === 'compressed')) {
  sqlite.exec('ALTER TABLE messages ADD COLUMN compressed INTEGER DEFAULT 0')
  sqlite.exec('ALTER TABLE messages ADD COLUMN summary_of TEXT')
}
```

### 5.3 类型扩展

`src/shared/types/conversation.ts` — Message 接口新增：

```typescript
compressed?: boolean
summaryOf?: string[] // 被压缩的消息 ID 列表
```

### 5.4 Settings 新增

`settingsStore` 新增 `contextCompressionEnabled: boolean`（默认 `true`），持久化到 settings 表。P0 不暴露阈值配置。

---

## 6. API 设计

### 新增端点：`POST /api/chat/compress`

**文件：** `src/api/routes/chat.ts`

**请求：**
```typescript
interface CompressRequest {
  provider: string
  messages: AIMessage[] // 待压缩的消息
  config: AIConfig
}
```

**响应：**
```typescript
interface CompressResponse {
  summary: string // AI 生成的摘要文本
}
```

**行为：**
- 非流式调用，`temperature: 0.2`
- 30s 超时
- 不需要 tool calling、权限检查
- 使用 `COMPRESSION_SYSTEM_PROMPT` 指导摘要生成（保留文件路径、技术决策、错误信息、因果关系，500 字以内）

**为什么独立端点而非复用 `/chat`：** 压缩是内部操作，不需要 tool calling 和权限检查，需要独立超时控制，便于监控。两份方案一致。

---

## 7. 前端改动

### 7.1 chatStore 改造

`src/renderer/src/stores/chatStore.ts` — `sendMessage()` 内部：

1. 步骤 2 和 3 之间插入压缩检测逻辑
2. 构建 `historyMessages` 时增加 `.filter(m => !m.compressed)`
3. 压缩期间复用 `isLoading` 状态，assistant 占位区显示"正在优化对话上下文..."

### 7.2 conversationStore 映射

`loadConversation()` 的 `mappedMessages` 新增：

```typescript
compressed: msg.compressed ?? false,
summaryOf: msg.summaryOf ? JSON.parse(msg.summaryOf) : undefined,
```

### 7.3 CompressedSummary 组件（新增）

`src/renderer/src/components/chat/CompressedSummary.tsx`

- 虚线边框 + muted 颜色，与正常消息视觉区分
- 折叠态：单行"已压缩 N 条早期消息"
- 展开态：显示 AI 摘要内容
- MessageItem 通过 `summaryOf` 字段识别摘要消息，渲染此组件

### 7.4 Settings UI

Memory 区域下方新增"上下文管理"区块，仅一个 toggle："自动压缩"（默认开启）。

---

## 8. 与现有系统集成

### ContextIndicator

P0 不改动，保持纯展示。压缩触发在 chatStore 内部，与 ContextIndicator 解耦。P1 可在 critical 状态增加手动压缩按钮。

### Memory 系统

- 摘要消息以 `[Context Summary]` 开头，MemoryExtractor 应跳过此类消息（避免从摘要提取"二手"记忆）
- Memory 注入在 system prompt 层面，与消息历史独立，压缩不影响 memory 检索
- P1 增强：压缩前对待压缩消息触发一次 Memory 提取（fire-and-forget），确保重要信息被持久化

### MessageService 新增方法

```typescript
static async markCompressed(messageIds: string[])  // 批量标记
static async createSummary(data: { id, conversationId, content, summaryOf, timestamp })
```

对应 IPC handler：`messages:markCompressed`、`messages:createSummary`。

---

## 9. 降级策略

| 失败场景 | 处理 |
|----------|------|
| 压缩 AI 调用失败 | 生成截断摘要（每条消息前 100 字符），前缀 `[Truncated Summary]` |
| 压缩 AI 调用超时（30s） | 同上，回退到截断 |
| 摘要创建成功但标记压缩失败 | 下次发消息重新检测，多余摘要无害 |
| 标记成功但摘要创建失败 | 不会发生（先创建摘要再标记） |
| 压缩后仍超限 | 正常发送，API 层返回错误，显示在 assistant 消息区域 |
| 模型无 contextLength | 不触发压缩 |
| 无 inputTokens 数据 | 不触发压缩 |

核心原则：压缩失败不阻塞用户发消息。

---

## 10. P1 增强项

| 功能 | 说明 |
|------|------|
| 手动压缩按钮 | ContextIndicator critical 态显示，点击触发压缩 |
| `/compact` 斜杠命令 | **已移入 P0** |
| 阈值/保留消息数可配置 | Settings slider + number input |
| 查看原始消息 | 摘要卡片底部链接，懒加载 DB 数据 |
| 压缩前 Memory 提取 | fire-and-forget，确保早期信息持久化 |
| 压缩专用小模型 | 同 provider 的小模型降低成本 |
| 超限警告 toast | 95%+ 且压缩后仍不够时提示开新对话 |
| Preload bridge 正式扩展 | 类型安全的 IPC 接口 |
| 压缩历史统计 | 对话信息面板显示压缩次数和节省 token 数 |

---

## 11. 风险和开放问题

**风险：**
1. 摘要质量不可控 — AI 可能遗漏关键文件路径或错误码。缓解：压缩 prompt 明确要求保留这些信息
2. 多次压缩信息衰减 — 摘要的摘要逐步丢失细节。缓解：P2 考虑摘要合并策略
3. 小模型摘要质量差 — P0 使用当前对话模型，P1 再评估专用模型

**开放问题：**
1. `KEEP_RECENT = 6` 是否最优？需实际测试，太少丢近期上下文，太多压缩效果不明显
2. 摘要消息 role 用 `assistant` 还是 `system`？当前选 `assistant`，不影响 system prompt 结构
3. thinking 内容是否需要压缩？当前 thinking 不发送给 AI，暂不处理
4. 压缩 2-8s 延迟的用户接受度？需要实际体验验证

---

## 附录：P0 改动文件清单

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `src/main/db/schema.ts` | 修改 | messages 表加 compressed、summaryOf |
| `src/main/db/index.ts` | 修改 | runSchemaMigrations 加迁移 |
| `src/main/db/services/messageService.ts` | 修改 | 加 markCompressed、createSummary |
| `src/main/index.ts` | 修改 | 加 IPC handler |
| `src/shared/types/conversation.ts` | 修改 | Message 接口扩展 |
| `src/api/routes/chat.ts` | 修改 | 加 POST /chat/compress |
| `src/renderer/src/stores/chatStore.ts` | 修改 | 压缩检测 + 过滤 |
| `src/renderer/src/stores/conversationStore.ts` | 修改 | loadConversation 映射 |
| `src/renderer/src/stores/settingsStore.ts` | 修改 | 加 contextCompressionEnabled |
| `src/renderer/src/components/chat/CompressedSummary.tsx` | **新增** | 摘要卡片组件 |
| `src/renderer/src/components/chat/MessageItem.tsx` | 修改 | 渲染 CompressedSummary |
| `src/renderer/src/components/settings/` | 修改 | 加压缩开关 |

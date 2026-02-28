# 上下文压缩实现 — Code Review 报告

> 审查人: Code Reviewer
> 日期: 2026-02-27
> 基于: 设计文档 + 实现计划 vs 实际代码

---

## 通过项

- **写入顺序正确**: chatStore 和 triggerCompression 都遵循"先创建摘要 → 再标记压缩"的顺序，与设计文档一致
- **降级策略完整**: AI 压缩失败时正确 fallback 到 `generateTruncatedSummary`，前缀 `[Truncated Summary]`
- **Schema + 迁移幂等**: `runSchemaMigrations` 用 `pragma table_info` 检测后条件执行，重复启动不报错
- **settingsStore 完整**: 接口声明、初始值、action、partialize、migrate 五处全部正确添加，默认 `true`
- **conversationStore 映射兼容**: `msg.summaryOf ?? msg.summary_of` 兼容 snake_case DB 返回
- **CompressedSummary 组件**: memo 包裹、折叠/展开、虚线边框视觉区分，符合设计
- **MessageItem 集成**: summaryOf 早期返回 + compressed 隐藏，逻辑清晰
- **IPC handler 输入校验**: markCompressed 校验数组类型、非空、上限 100；createSummary 校验必填字段和 summaryOf 类型
- **API 端点**: 独立超时、低温度、非流式调用，与设计一致
- **apiClient.compressMessages**: 30s AbortController 超时，正确清理 timeout
- **代码风格**: 无分号、单引号、2 空格缩进、中文注释、const 优先，符合项目规范

---

## 问题（按严重程度排序）

### Critical

无。

### Major

#### M1. chatStore 压缩逻辑与 triggerCompression 大量重复代码

**文件**: `src/renderer/src/stores/chatStore.ts:322-401` 和 `85-152`

**描述**: `sendMessage()` 内部的自动压缩逻辑和 `triggerCompression()` 函数几乎完全相同（约 50 行重复），违反 DRY 原则。未来修改压缩逻辑需要同步两处，容易遗漏导致行为不一致。

**严重程度**: Major

**建议修复**: 将 `sendMessage()` 内部的压缩执行逻辑提取为内部函数（如 `executeCompression`），让 `sendMessage` 和 `triggerCompression` 都调用它。

```typescript
// 提取公共压缩执行逻辑
async function executeCompression(
  conversationId: string,
  messages: Message[],
  providerType: string,
  config: AIConfig
): Promise<{ summaryId: string; compressedIds: string[] } | null> {
  const activeMessages = messages.filter(m => !m.compressed)
  if (activeMessages.length <= KEEP_RECENT + 1) return null

  const toCompress = activeMessages.slice(0, -KEEP_RECENT)
  const toCompressIds = toCompress.map(m => m.id)
  // ... 共用逻辑
}
```

---

#### M2. createSummary IPC handler 未校验 timestamp 字段

**文件**: `src/main/index.ts:359-372`

**描述**: handler 校验了 `id`、`conversationId`、`content`、`summaryOf`，但未校验 `timestamp`。如果 `data.timestamp` 为 `undefined`，`new Date(undefined)` 会产生 `Invalid Date`，写入 DB 后可能导致排序异常。

**严重程度**: Major

**建议修复**:

```typescript
if (!data.timestamp || typeof data.timestamp !== 'number') {
  throw new Error('timestamp must be a valid number')
}
```

---

#### M3. markCompressed 未校验数组元素类型

**文件**: `src/main/index.ts:347-356`

**描述**: 校验了 `messageIds` 是数组且非空，但未校验每个元素是否为 string。如果传入 `[null, 123]`，会直接传给 `MessageService.markCompressed`，可能导致 SQL 异常或静默失败。

**严重程度**: Major

**建议修复**:

```typescript
if (!messageIds.every((id: unknown) => typeof id === 'string' && id.length > 0)) {
  throw new Error('messageIds must contain only non-empty strings')
}
```

---

#### M4. 压缩端点传递了客户端的 apiKey

**文件**: `src/renderer/src/stores/chatStore.ts:353-357` 和 `src/api/routes/chat.ts:253-295`

**描述**: `compressMessages` 将 `config`（含 `apiKey`）通过 HTTP 发送到 API 层。虽然是 localhost 通信，但与项目安全边界设计（"API Key 在 Main Process 从 DB 解密，永远不通过 IPC 传递给 Renderer"）存在张力。当前 `/chat/stream` 也是这个模式所以不是新引入的问题，但值得在 P1 中统一改进。

**严重程度**: Major（设计层面，非新引入）

**建议修复**: P1 阶段考虑让压缩端点也走 Main Process 解密凭证的模式，与 memory:extract 一致。当前可接受但应记录为技术债。

---

### Minor

#### m1. chatStore 中 `console.log` 违反项目规范

**文件**: `src/renderer/src/stores/chatStore.ts:61-64`

**描述**: `triggerMemoryExtraction` 中使用了 `console.log`，项目规范要求只允许 `console.warn` 和 `console.error`。这不是本次新增代码，但在同一文件中。

**严重程度**: Minor（非本次引入）

**建议修复**: 不在本次 PR 范围内，可忽略。

---

#### m2. summaryOf JSON.parse 缺少 try-catch

**文件**: `src/renderer/src/stores/conversationStore.ts:224-227`

**描述**: `JSON.parse(msg.summaryOf ?? msg.summary_of)` 如果 DB 中存储了非法 JSON，会抛异常导致整个对话加载失败。

**严重程度**: Minor

**建议修复**:

```typescript
summaryOf: (() => {
  const raw = msg.summaryOf ?? msg.summary_of
  if (!raw) return undefined
  try { return JSON.parse(raw) } catch { return undefined }
})(),
```

---

#### m3. 压缩期间无 loading 提示

**文件**: `src/renderer/src/stores/chatStore.ts:322-401`

**描述**: 设计文档 7.1 提到"压缩期间复用 `isLoading` 状态，assistant 占位区显示'正在优化对话上下文...'"，但实际实现中压缩发生在 `sendMessage` 内部、assistant 占位消息创建之前，用户看不到任何压缩进度提示。自动压缩可能需要 2-8 秒，期间 UI 无反馈。

**严重程度**: Minor

**建议修复**: 在压缩开始前设置一个临时状态（如 `set({ isCompressing: true })`），或在 assistant 占位消息中显示压缩提示文本。

---

#### m4. compressPayload 过滤了 system 角色消息但未处理 tool 相关消息

**文件**: `src/renderer/src/stores/chatStore.ts:343-349`

**描述**: `toCompress.map(m => ({ role: m.role as 'user' | 'assistant', ... }))` 强制将 role 转为 user/assistant，但如果消息列表中包含 tool call/result 相关的消息，这些上下文会丢失。设计文档提到"tool output 截断到 500 字符"，但实际实现只截断了 content，没有包含 tool 信息。

**严重程度**: Minor

**建议修复**: 对于有 toolCalls 的消息，可以在 content 中附加 tool 调用摘要，确保 AI 摘要时能看到工具使用上下文。

---

### Nit

#### n1. COMPRESSION_SYSTEM_PROMPT 硬编码中文

**文件**: `src/api/routes/chat.ts:242-250`

**描述**: prompt 中"请将以下对话历史压缩为简洁的摘要"和要求列表是中文，但设计文档要求"使用与原始对话相同的语言"。如果用户用英文对话，中文 system prompt 可能导致 AI 输出中文摘要。

**严重程度**: Nit

**建议修复**: 将 system prompt 改为英文（AI 会根据对话内容自动匹配语言），或在 prompt 中更强调"match the language of the original conversation"。

---

#### n2. CompressedSummary 硬编码中文文案

**文件**: `src/renderer/src/components/chat/CompressedSummary.tsx:25`

**描述**: "已压缩 {compressedCount} 条早期消息" 硬编码中文。如果未来需要 i18n 支持会需要改动。当前项目 UI 是中文所以可接受。

**严重程度**: Nit

---

#### n3. MessageService.markCompressed 逐条 UPDATE 效率低

**文件**: `src/main/db/services/messageService.ts:111-120`

**描述**: 用 for 循环逐条 `db.update`，当压缩 50+ 条消息时会产生 50+ 次 DB 写入。可以用 `inArray` 批量更新。

**严重程度**: Nit

**建议修复**:

```typescript
import { inArray } from 'drizzle-orm'

static async markCompressed(messageIds: string[]) {
  if (messageIds.length === 0) return
  const db = getDatabase()
  await db
    .update(messages)
    .set({ compressed: true })
    .where(inArray(messages.id, messageIds))
}
```

---

## 总结

实现整体符合设计文档和实现计划，核心流程（触发检测 → AI 压缩 → 降级 → 持久化 → UI 渲染）完整正确。

- **Critical**: 0 个
- **Major**: 4 个（M1 代码重复、M2 timestamp 校验、M3 元素类型校验、M4 apiKey 传递模式）
- **Minor**: 4 个
- **Nit**: 3 个

**合并建议**: 可以合并。M2 和 M3 建议在合并前修复（输入校验缺失可能导致运行时异常）。M1 和 M4 可作为 follow-up 处理。

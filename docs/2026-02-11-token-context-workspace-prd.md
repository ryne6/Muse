# PRD: Token 统计 / 上下文管理 / 工作区优化

> 日期: 2026-02-11
> 状态: Draft

---

## 功能一: Token 消耗统计

### 1.1 每条消息的 Token 显示

**位置**: 每条 assistant 消息底部（与耗时并排）

**显示格式**:
```
↑ 1,234 tokens  ↓ 856 tokens  ·  3.2s
```
- `↑` = input tokens（本次请求发送的）
- `↓` = output tokens（本次响应生成的）
- `·` 分隔符后显示总耗时（功能三）

**数据来源**: 从 AI provider API 响应中提取（Anthropic 的 `usage.input_tokens` / `usage.output_tokens`，OpenAI 的 `usage` 字段等）

### 1.2 Settings 中的 Token 总量统计

**入口**: Settings → 新增 "Usage" tab

**统计维度**:
- 按 Provider + Model 分组汇总（如 Claude Sonnet 共用了 120k tokens）
- 按时间段筛选（今天 / 本周 / 本月 / 全部）

**显示内容**:
- 每个模型的 input / output / total tokens
- 时间段内的总计

**不做**: 费用估算（后续迭代）

### 1.3 数据存储

**messages 表新增字段**:
```sql
input_tokens  INTEGER  -- 本次请求的 input token 数
output_tokens INTEGER  -- 本次响应的 output token 数
```

**新增 token_usage 汇总表**（可选，或直接从 messages 聚合查询）:
```sql
CREATE TABLE token_usage (
  id            TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  message_id    TEXT NOT NULL,
  provider      TEXT NOT NULL,
  model         TEXT NOT NULL,
  input_tokens  INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  duration_ms   INTEGER,          -- 功能三: 耗时
  created_at    INTEGER NOT NULL
);
```

### 1.4 实现要点

- 修改 `AIStreamChunk` 类型，在 `done: true` 的最终 chunk 中携带 `usage` 和 `durationMs`
- 各 provider 实现中提取 usage 信息（Claude: `message.usage`，OpenAI: `response.usage`）
- 前端 chatStore 接收到 done chunk 后，将 token 数据持久化到 DB
- MessageItem 组件底部渲染 token 信息

---

## 功能二: 上下文管理 & 自动压缩

### 2.1 Model 上下文大小配置

**现状**: models 表已有 `contextLength` 字段（nullable），但未使用。

**改动**:
- 模型配置 UI 中增加 context length 输入框
- 代码中维护内置模型的默认 contextLength 映射表，自定义模型必须手动填写
- 模型创建/导入时自动匹配默认值

**内置默认值表** (`src/shared/constants/modelDefaults.ts`):

| Model ID (匹配规则) | Context Length |
|---------------------|---------------|
| claude-sonnet-4-* | 200,000 |
| claude-opus-4-* | 200,000 |
| claude-haiku-3.5-* | 200,000 |
| gpt-4o* | 128,000 |
| gpt-4-turbo* | 128,000 |
| gpt-4.1* | 1,047,576 |
| o1* / o3* / o4* | 200,000 |
| gemini-2.0-* | 1,048,576 |
| gemini-2.5-* | 1,048,576 |
| deepseek-chat | 64,000 |
| deepseek-reasoner | 64,000 |
| moonshot-v1-8k | 8,000 |
| moonshot-v1-32k | 32,000 |
| moonshot-v1-128k | 128,000 |

> 匹配逻辑: modelId 前缀匹配，优先精确匹配。自定义模型无匹配时 contextLength 为必填。

### 2.2 上下文使用量显示

**位置**: 聊天输入框工具栏区域（与 Model Selector、Workspace 等并排）

**显示形式 — 自适应**:
- 正常状态: 纯文字 `12k / 200k`
- 使用量 > 70%: 文字变为警告色（橙色）
- 使用量 > 90%: 显示进度条 + 红色警告

**数据来源**: 基于上一次 API 返回的 `input_tokens`，加上新输入消息的估算

### 2.3 自动压缩上下文

**策略**: AI 摘要替换早期消息

**触发条件**: 当上下文使用量达到 contextLength 的 80% 时

**压缩流程**:
1. 检测到上下文即将超限
2. 选取最早的 N 条消息（保留 system prompt 和最近的消息）
3. 调用 AI 生成摘要: "请将以下对话历史压缩为简洁摘要，保留关键信息和决策"
4. 用一条 `[context_summary]` 类型的消息替换被压缩的消息
5. UI 中显示 "已压缩 N 条早期消息" 的提示，可展开查看摘要

**用户控制**:
- Settings 中可开关自动压缩
- 压缩阈值可配置（默认 80%）
- 压缩后原始消息保留在 DB 中（标记为 compressed），不物理删除

### 2.4 数据存储

**messages 表新增字段**:
```sql
compressed    INTEGER DEFAULT 0  -- 是否已被压缩（0=正常, 1=已压缩不发送给AI）
summary_of    TEXT               -- 如果是摘要消息，记录被压缩的消息ID列表(JSON)
```

**settings 新增配置项**:
- `contextCompressionEnabled`: boolean, 默认 true
- `contextCompressionThreshold`: number, 默认 0.8

---

## 功能三: 调用耗时显示

### 3.1 显示位置

与 Token 信息并排，在每条 assistant 消息底部:
```
↑ 1,234  ↓ 856 tokens  ·  3.2s
```

### 3.2 计时方式

- 前端记录: 发送请求时记录 `startTime`
- 收到 `done: true` 时计算 `Date.now() - startTime`
- 存入 messages 表的 `duration_ms` 字段（或 token_usage 表）

### 3.3 显示格式

- < 1s: `0.8s`
- 1-60s: `3.2s`
- \> 60s: `1m 12s`

### 3.4 数据存储

**messages 表新增字段**:
```sql
duration_ms  INTEGER  -- 本次调用总耗时（毫秒）
```

---

## 功能四: 工作区管理优化

### 4.1 现状

- ✅ 全局工作区选择（workspaceStore）
- ✅ 每个对话可绑定独立工作区（conversations.workspace）
- ✅ WorkspaceDropdown 组件可切换/清除工作区
- ❌ 新对话无默认工作区
- ❌ 无孤立目录清理

### 4.2 新对话自动创建默认工作区

**规则**:
- 新对话创建时，自动在 `~/.Muse/workspaces/{conversation-id}/` 下创建目录
- 将该路径设为对话的默认工作区
- 用户可随时通过 WorkspaceDropdown 切换到其他目录

**目录结构**:
```
~/.Muse/
  workspaces/
    {conv-id-1}/    ← 对话1的默认工作区
    {conv-id-2}/    ← 对话2的默认工作区
```

### 4.3 孤立目录自动清理

**触发时机**: 对话被删除时

**清理逻辑**:
1. 对话删除时，检查其 workspace 是否在 `~/.Muse/workspaces/` 下
2. 如果是，且目录为空或只有 AI 生成的文件，提示用户是否删除
3. 如果目录包含用户文件，仅提示但不自动删除

**应用启动时清理**:
- 扫描 `~/.Muse/workspaces/` 下的目录
- 对比 conversations 表，找出无对应对话的孤立目录
- 空目录直接删除，非空目录标记提醒

### 4.4 实现要点

- `createConversation()` 中增加自动创建目录 + 设置 workspace 的逻辑
- 对话删除的 IPC handler 中增加清理逻辑
- 新增 IPC: `workspace:cleanup-orphans` 用于启动时清理

---

## 实现优先级

| 优先级 | 功能 | 复杂度 | 说明 |
|--------|------|--------|------|
| P0 | Token 统计 + 耗时显示 | 中 | 需改 streaming 链路 + DB schema + UI |
| P0 | 工作区默认目录 + 清理 | 低 | 主要是 createConversation 和删除逻辑 |
| P1 | 上下文使用量显示 | 中 | 依赖 Token 统计的数据 |
| P2 | 上下文自动压缩 | 高 | 需要额外 AI 调用 + 消息状态管理 |
| P2 | Settings Usage 统计页 | 中 | 聚合查询 + 图表 UI |

---

## 涉及文件预估

**后端 (数据层)**:
- `src/main/db/schema.ts` — 新增字段
- `src/main/db/services/messageService.ts` — token/duration 存取
- `src/main/index.ts` — 新增 IPC handlers

**API 层 (streaming)**:
- `src/shared/types/ai.ts` — AIStreamChunk 增加 usage/duration
- `src/api/services/ai/providers/claude.ts` — 提取 usage
- `src/api/services/ai/providers/openai.ts` — 提取 usage
- `src/api/services/ai/providers/base.ts` — 基类接口
- `src/api/routes/chat.ts` — 传递 usage 数据

**前端 (UI)**:
- `src/renderer/src/components/chat/MessageItem.tsx` — 底部 token + 耗时
- `src/renderer/src/components/chat/ChatInput.tsx` — 上下文进度条
- `src/renderer/src/components/settings/UsageStats.tsx` — 新增统计页
- `src/renderer/src/stores/chatStore.ts` — 计时 + token 持久化
- `src/renderer/src/stores/conversationStore.ts` — 创建时自动设工作区

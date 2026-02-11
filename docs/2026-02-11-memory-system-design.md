# Muse 记忆系统设计文档

> Design Document
> Version: 1.0
> Date: 2026-02-11

---

## 1. 概述

为 Muse 添加跨对话记忆能力，让 AI 能记住用户偏好、项目知识和历史对话中的关键信息。

### 1.1 核心特性

- **三层记忆**：用户级、项目级、对话级
- **混合存储**：Markdown 文件（用户可编辑）+ SQLite（搜索索引）
- **双模式提取**：自动提取 + 手动 `/remember` 命令
- **全局开关**：记忆功能默认关闭，用户在设置中开启后才生效

### 1.2 设计原则

- 用户完全控制：开关、可编辑、可删除
- 透明可见：Markdown 文件可直接查看和 git 追踪
- 隐私优先：默认关闭，不自动收集
- 轻量注入：控制 token 预算，不挤占对话上下文

---

## 2. 架构

```
┌─────────────────────────────────────────────────┐
│                  Memory System                   │
├─────────────────┬───────────────┬───────────────┤
│  User Memory    │ Project Memory│ Conversation  │
│  ~/.muse/memory │ .muse/memory  │   Memory      │
│  (Markdown)     │  (Markdown)   │  (SQLite)     │
├─────────────────┼───────────────┼───────────────┤
│ • 编码偏好      │ • 项目架构    │ • 关键事实    │
│ • 工具习惯      │ • 技术约定    │ • 技术决策    │
│ • 语言偏好      │ • 关键文件    │ • 对话摘要    │
│ • 工作流程      │ • 技术栈      │ • 重复模式    │
├─────────────────┴───────────────┴───────────────┤
│           Search Index (SQLite FTS5)             │
│           全文搜索 + 标签过滤                     │
├─────────────────────────────────────────────────┤
│           Memory Toggle (settingsStore)          │
│           memoryEnabled: boolean (默认 false)     │
└─────────────────────────────────────────────────┘
```

### 2.1 全局开关

- 存储位置：`settingsStore.memoryEnabled`（持久化到 localStorage）
- 默认值：`false`（关闭）
- 影响范围：
  - `false` 时：不加载记忆、不注入 systemPrompt、不自动提取、`/remember` 命令提示未开启
  - `true` 时：完整记忆功能生效

### 2.2 开关检查点

| 路径 | 检查位置 | 行为（关闭时） |
|------|----------|----------------|
| 系统提示词构建 | `chatStore.ts` sendMessage | 跳过 MemoryManager.getRelevantMemories() |
| 自动提取 | `chatStore.ts` 对话结束回调 | 跳过 MemoryExtractor.extract() |
| `/remember` 命令 | `ChatInput.tsx` 命令解析 | 返回提示"记忆功能未开启，请在设置中开启" |
| `/forget` 命令 | `ChatInput.tsx` 命令解析 | 同上 |
| 记忆管理 UI | `MemorySettings.tsx` | 显示开关 + 关闭时显示说明文字 |

---

## 3. 数据模型

### 3.1 Markdown 文件结构

```
~/.muse/memory/                  # 用户级记忆
├── preferences.md               # 编码偏好、工具习惯
├── patterns.md                  # 常用模式和约定
└── notes.md                     # 自由笔记

<workspace>/.muse/memory/        # 项目级记忆
├── architecture.md              # 项目架构概览
├── conventions.md               # 项目约定和规范
├── decisions.md                 # 关键技术决策
└── context.md                   # 重要上下文信息
```

Markdown 文件格式：

```markdown
---
type: preference
tags: [typescript, testing]
updatedAt: 2026-02-11
source: auto
---

## 测试偏好

- 使用 vitest 而非 jest
- 偏好 describe/it 风格
- 测试文件放在 __tests__/ 目录下
```

### 3.2 SQLite Schema

```sql
-- 记忆表
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,           -- 'user' | 'project' | 'conversation'
  category TEXT NOT NULL,       -- 'preference' | 'knowledge' | 'decision' | 'pattern'
  content TEXT NOT NULL,        -- 记忆内容
  tags TEXT,                    -- JSON 数组 '["typescript","testing"]'
  source TEXT NOT NULL,         -- 'auto' | 'manual'
  conversationId TEXT,          -- 关联对话 ID（对话记忆用）
  filePath TEXT,                -- 关联的 .md 文件路径（文件记忆用）
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE SET NULL
);

-- FTS5 全文搜索索引
CREATE VIRTUAL TABLE memories_fts USING fts5(
  content,
  tags,
  content=memories,
  content_rowid=rowid
);

-- 触发器：同步 FTS 索引
CREATE TRIGGER memories_ai AFTER INSERT ON memories BEGIN
  INSERT INTO memories_fts(rowid, content, tags)
  VALUES (new.rowid, new.content, new.tags);
END;

CREATE TRIGGER memories_ad AFTER DELETE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content, tags)
  VALUES ('delete', old.rowid, old.content, old.tags);
END;

CREATE TRIGGER memories_au AFTER UPDATE ON memories BEGIN
  INSERT INTO memories_fts(memories_fts, rowid, content, tags)
  VALUES ('delete', old.rowid, old.content, old.tags);
  INSERT INTO memories_fts(rowid, content, tags)
  VALUES (new.rowid, new.content, new.tags);
END;
```

### 3.3 Drizzle Schema

```typescript
// src/main/db/schema.ts 新增

export const memories = sqliteTable('memories', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),           // 'user' | 'project' | 'conversation'
  category: text('category').notNull(),   // 'preference' | 'knowledge' | 'decision' | 'pattern'
  content: text('content').notNull(),
  tags: text('tags'),                     // JSON array string
  source: text('source').notNull(),       // 'auto' | 'manual'
  conversationId: text('conversation_id')
    .references(() => conversations.id, { onDelete: 'set null' }),
  filePath: text('file_path'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})
```

---

## 4. 记忆提取

### 4.1 自动提取

触发时机：
- 对话切换时（用户切换到另一个对话）
- 对话超过 5 轮时，每 5 轮提取一次
- 窗口关闭前

提取流程：

```
触发提取
  │
  ▼
检查 memoryEnabled === true
  │ false → 跳过
  │ true ↓
  ▼
MemoryExtractor.extract(messages)
  │ 用轻量 prompt 分析最近 N 条消息
  │ 提取：偏好、知识、决策、模式
  │
  ▼
去重检查（FTS5 搜索已有记忆）
  │ 相似度高 → 合并更新
  │ 新记忆 → 插入
  │
  ▼
写入 SQLite memories 表
  │
  ▼
同步更新对应 .md 文件
```

提取 Prompt 模板：

```
分析以下对话，提取值得记住的信息。只提取明确的事实，不要推测。

分类：
- preference: 用户明确表达的偏好（如"我喜欢用 pnpm"）
- knowledge: 项目相关的事实（如"项目使用 Electron + React"）
- decision: 技术决策（如"选择 Zustand 而非 Redux"）
- pattern: 重复出现的模式（如"每次都要求写测试"）

输出 JSON 数组，每项包含 category、content、tags。
如果没有值得记住的信息，返回空数组 []。
```

### 4.2 手动命令

| 命令 | 说明 | 存储位置 |
|------|------|----------|
| `/remember <内容>` | 保存到用户级记忆 | `~/.muse/memory/notes.md` + SQLite |
| `/remember-project <内容>` | 保存到项目级记忆 | `.muse/memory/context.md` + SQLite |
| `/forget <关键词>` | 搜索并删除匹配的记忆 | 删除 SQLite 记录 + 更新 .md |
| `/memories` | 列出当前生效的记忆摘要 | 只读展示 |

---

## 5. 记忆注入

### 5.1 注入流程

```
chatStore.sendMessage()
  │
  ▼
检查 memoryEnabled === true
  │ false → 跳过，使用原有 systemPrompt
  │ true ↓
  ▼
MemoryManager.getRelevantMemories(workspacePath, userMessage)
  │
  ├─ 加载 ~/.muse/memory/*.md（用户级，全部）
  ├─ 加载 .muse/memory/*.md（项目级，全部）
  └─ FTS5 搜索相关对话记忆（按相关性取 top-10）
  │
  ▼
合并 + 截断（≤ 2000 tokens）
  │ 优先级：用户偏好 > 项目知识 > 对话记忆
  │
  ▼
注入到 systemPrompt:

## Memory

### User Preferences
- 使用 vitest 而非 jest
- 偏好 TypeScript strict mode

### Project Knowledge
- Electron + React + Zustand 架构
- 数据库使用 better-sqlite3 + Drizzle ORM

### Relevant Context
- 上次讨论了权限系统升级方案
```

### 5.2 Token 预算控制

- 总预算：2000 tokens
- 分配：用户级 600 + 项目级 800 + 对话级 600
- 超出时按优先级截断：先砍对话级，再砍项目级
- 使用简单的字符数估算（1 token ≈ 4 字符中文 / 4 字符英文）

---

## 6. 实现计划

### P0 — 基础记忆能力

| # | 任务 | 文件 | 类型 |
|---|------|------|------|
| 1 | memories 表 + FTS5 索引 | `src/main/db/schema.ts` | 修改 |
| 2 | MemoryService (CRUD + 搜索) | `src/main/db/services/memoryService.ts` | 新增 |
| 3 | MemoryFileService (读写 .md) | `src/main/services/memoryFileService.ts` | 新增 |
| 4 | MemoryManager (加载 + 注入) | `src/main/services/memoryManager.ts` | 新增 |
| 5 | IPC handlers (memory:*) | `src/main/index.ts` | 修改 |
| 6 | Preload API | `src/preload/index.ts` | 修改 |
| 7 | settingsStore 新增 memoryEnabled | `src/renderer/src/stores/settingsStore.ts` | 修改 |
| 8 | 系统提示词注入记忆 | `src/renderer/src/stores/chatStore.ts` | 修改 |
| 9 | `/remember` 命令解析 | `src/renderer/src/components/chat/ChatInput.tsx` | 修改 |
| 10 | 记忆设置 UI（开关 + 管理） | `src/renderer/src/components/settings/MemorySettings.tsx` | 新增 |

### P1 — 自动提取

| # | 任务 | 文件 | 类型 |
|---|------|------|------|
| 11 | MemoryExtractor (AI 提取) | `src/api/services/memory/extractor.ts` | 新增 |
| 12 | 提取触发器 | `src/renderer/src/stores/chatStore.ts` | 修改 |
| 13 | 记忆去重 (FTS5 相似度) | `src/main/db/services/memoryService.ts` | 修改 |
| 14 | .md 文件自动同步 | `src/main/services/memoryFileService.ts` | 修改 |

### P2 — 高级能力

| # | 任务 | 说明 |
|---|------|------|
| 15 | 记忆管理面板 | 查看、编辑、删除、搜索记忆 |
| 16 | 记忆衰减 | 长期未命中的记忆降低优先级 |
| 17 | 向量搜索 | 替换 FTS5 为 embedding 检索 |
| 18 | 记忆导入/导出 | 支持从其他工具迁移记忆 |

---

## 7. 向后兼容

- `memoryEnabled` 默认 `false`，不影响现有用户
- systemPrompt 构建逻辑仅在开关开启时追加 Memory 段落
- memories 表为新增表，不影响现有 schema
- `.muse/memory/` 目录按需创建，不影响现有 `.muse/` 内容

---

## 8. BDD 验收标准

### 8.1 全局开关

```gherkin
Feature: 记忆功能开关

  Scenario: 默认关闭
    Given 用户首次使用 Muse
    Then memoryEnabled 为 false
    And systemPrompt 不包含 "## Memory" 段落

  Scenario: 开启记忆
    Given memoryEnabled 为 false
    When 用户在设置中开启记忆功能
    Then memoryEnabled 变为 true
    And 下次发送消息时 systemPrompt 包含 "## Memory" 段落

  Scenario: 关闭时 /remember 不可用
    Given memoryEnabled 为 false
    When 用户输入 /remember 使用 pnpm
    Then 显示提示"记忆功能未开启，请在设置中开启"
    And 不写入任何记忆
```

### 8.2 手动记忆

```gherkin
Feature: /remember 命令

  Scenario: 保存用户级记忆
    Given memoryEnabled 为 true
    When 用户输入 /remember 总是使用 vitest
    Then SQLite memories 表新增一条记录 (type='user', source='manual')
    And ~/.muse/memory/notes.md 追加该内容

  Scenario: 保存项目级记忆
    Given memoryEnabled 为 true 且 workspace 已设置
    When 用户输入 /remember-project 使用 Drizzle ORM
    Then SQLite memories 表新增一条记录 (type='project', source='manual')
    And .muse/memory/context.md 追加该内容

  Scenario: 删除记忆
    Given 存在包含 "vitest" 的记忆
    When 用户输入 /forget vitest
    Then 匹配的记忆从 SQLite 删除
    And 对应 .md 文件中的内容被移除
```

### 8.3 记忆注入

```gherkin
Feature: 系统提示词注入

  Scenario: 注入用户和项目记忆
    Given memoryEnabled 为 true
    And ~/.muse/memory/preferences.md 包含 "使用 vitest"
    And .muse/memory/architecture.md 包含 "Electron + React"
    When 用户发送新消息
    Then systemPrompt 包含 "## Memory" 段落
    And 包含 "使用 vitest"
    And 包含 "Electron + React"

  Scenario: Token 预算控制
    Given 记忆总内容超过 2000 tokens
    When 构建 systemPrompt
    Then Memory 段落不超过 2000 tokens
    And 用户偏好优先保留
```

### 8.4 自动提取 (P1)

```gherkin
Feature: 自动记忆提取

  Scenario: 对话切换时提取
    Given memoryEnabled 为 true
    And 当前对话超过 5 轮
    When 用户切换到另一个对话
    Then MemoryExtractor 分析最近消息
    And 提取的记忆写入 SQLite

  Scenario: 关闭时不提取
    Given memoryEnabled 为 false
    When 用户切换对话
    Then 不触发 MemoryExtractor
```

---

> Design Document End
> 下一步：按 P0 → P1 → P2 顺序实现

# Muse - AI Desktop Coding Assistant

Electron + React + TypeScript 桌面 AI 编程助手，支持多 AI 供应商（Claude、OpenAI、Gemini、DeepSeek 等）。本地 SQLite 存储，Hono API 层，Zustand 状态管理。

---

## Working Rules

这些是在本项目中工作的行为规则，必须遵守：

**语言:**
- 代码注释用中文（业务逻辑和 UI 上下文）
- Commit message 用英文，格式 `type: lowercase imperative description`
- 变量名、函数名、类名用英文

**代码风格（Prettier + ESLint 强制）:**
- 无分号，单引号，2 空格缩进，80 字符行宽
- 尾逗号 ES5，箭头函数省略单参数括号
- 禁止 `any`（`@typescript-eslint/no-explicit-any: error`）
- 未使用变量加 `_` 前缀（`_event`、`_unused`）
- 只允许 `console.warn` 和 `console.error`，禁止 `console.log`
- `const` 优先，禁止 `var`
- 严格模式：`strict: true`、`noUnusedLocals`、`noUnusedParameters`

**开发习惯:**
- 改代码前先读代码，理解上下文
- 优先编辑已有文件，不随意创建新文件
- 不加多余的注释、docstring、type annotation（除非改动了那段代码）
- 不做超出需求的重构或"改进"
- 删除的代码直接删，不留注释标记
- `import type` 用于纯类型导入
- 写 UI 前先查看 Lobe UI 是否有现成组件，优先使用库里的实现

**Commit 类型:**
`feat:` | `fix:` | `docs:` | `refactor:` | `test:` | `chore:` | `perf:`
- 不加 scope 括号，小写祈使句，末尾无句号
- 提交前手动跑 `npm run lint` 和 `npm run format`

**测试:**
- 框架：Vitest
- 测试文件放在源码旁的 `__tests__/` 目录，命名 `*.test.ts(x)`
- Mock 工具在 `tests/mocks/`，fixtures 在 `tests/fixtures/`，helpers 在 `tests/utils/`
- 新功能需要写测试，bug fix 需要写回归测试

---

## Architecture

三层架构，通过 IPC Bridge 和 HTTP API 通信：

**Main Process**（`src/main/`）— Node.js 运行时
- 数据库操作（SQLite + Drizzle ORM）
- IPC 通信处理（含输入校验）
- 文件系统、工作区、Memory 管理
- 权限文件管理、窗口生命周期
- API 服务器初始化

**Renderer Process**（`src/renderer/src/`）— React UI
- 组件渲染、用户交互
- Zustand 状态管理
- 通过 `window.api.*` 调用 IPC

**API Layer**（`src/api/`）— Hono HTTP 服务
- AI 供应商管理和流式响应
- Tool 执行（含权限检查）
- Memory 提取、MCP 通信

**通信流:**
```
Renderer → window.api.* → IPC (preload bridge) → Main Process → Response
Renderer → HTTP → Hono API → AI Provider → Streaming Response
```

**安全边界:**
- `nodeIntegration: false`，`contextIsolation: true`，`sandbox: true`
- Preload 是唯一的 IPC 桥梁，Renderer 无法直接访问 Node.js
- API Key 用 AES-256-CBC 加密存储（`iv:encrypted` 格式），在 Main Process 从 DB 解密，永远不通过 IPC 传递给 Renderer
- 所有 IPC handler 校验输入（类型、范围、长度），白名单方式
- 文件操作有路径穿越保护（`isPathSafe()`）和文件写锁（`withFileLock()`）
- FTS5 查询需要消毒特殊字符、过滤关键词（AND/OR/NOT）、引号包裹 token
- 危险命令黑名单（`rm -rf /`、`dd`、`mkfs.` 等）

---

## Key File Map

| 领域 | 关键文件 |
|------|---------|
| 入口 + IPC handlers | `src/main/index.ts` |
| DB schema（12 张表） | `src/main/db/schema.ts` |
| DB 初始化 + FTS5 + 迁移 | `src/main/db/index.ts` |
| DB CRUD 服务 | `src/main/db/services/*.ts` |
| ID 生成 | `src/main/db/utils/idGenerator.ts` |
| Memory 检索 + prompt 注入 | `src/main/services/memoryManager.ts` |
| Memory .md 文件读写 | `src/main/services/memoryFileService.ts` |
| 权限规则管理 | `src/main/services/permissionFileService.ts` |
| 工作区管理 | `src/main/services/workspaceService.ts` |
| Preload 安全桥 | `src/preload/index.ts` |
| Hono 应用入口 | `src/api/index.ts` |
| Chat 路由 + Memory 提取端点 | `src/api/routes/chat.ts` |
| AI 供应商工厂 | `src/api/services/ai/factory.ts` |
| AI 供应商基类 | `src/api/services/ai/providers/base.ts` |
| AI 供应商实现 | `src/api/services/ai/providers/{claude,openai,gemini,deepseek,generic}.ts` |
| Tool 定义 + 执行器 | `src/api/services/ai/tools/{definitions,executor}.ts` |
| Memory AI 提取 | `src/api/services/memory/extractor.ts` |
| MCP 客户端 + 管理 | `src/api/services/mcp/{client,manager,init}.ts` |
| Chat UI 组件（22 个） | `src/renderer/src/components/chat/*.tsx` |
| Settings UI | `src/renderer/src/components/settings/*.tsx` |
| Zustand stores | `src/renderer/src/stores/*.ts` |
| 共享类型定义 | `src/shared/types/*.ts` |
| 权限类型 | `src/shared/types/toolPermissions.ts` |
| IPC 类型 + MemoryRecord | `src/shared/types/ipc.ts` |

**Path Aliases:**
- `@/` → `src/renderer/src/`
- `@shared/` → `src/shared/`
- `@main/` → `src/main/`

---

## Core Concepts

### 1. AI Provider System

工厂模式，所有供应商继承 `BaseAIProvider`，实现 `chat()` 和 `validateConfig()`。

```typescript
const provider = AIProviderFactory.createProvider(providerConfig)
```

新增供应商：在 `providers/` 创建文件 → 继承 `BaseAIProvider` → 注册到 `factory.ts` → 更新 `src/shared/types/ai.ts`

### 2. Chat 核心流程

```
用户输入 → chatStore.sendMessage()
  → 获取 memory（IPC memory:getRelevant → MemoryManager 注入 system prompt）
  → HTTP POST /api/chat（带 messages + tools + config）
  → Hono route → AIManager.chat() → Provider.chat()
  → SSE 流式响应 → Renderer 逐 token 渲染
  → Tool call → executor 检查权限 → 执行 → 结果回传 AI → 继续生成
  → 完成后触发 memory 提取（第 5 条消息起，fire-and-forget）
```

### 3. Database

12 张表，Drizzle ORM，Better-SQLite3。

**级联删除:** Provider → Models，Conversation → Messages → ToolCalls → ToolResults
**特殊处理:** Conversation 删除时 Memory 的 `conversationId` 置 NULL

**虚拟表:** `memories_fts`（FTS5 索引 `content` + `tags`，trigger 同步）

**迁移:** `src/main/db/index.ts` 的 `runSchemaMigrations`，用 `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN`，单向不可回滚。

**时间戳:** Unix epoch 整数，需要时转 Date。

### 4. Memory System

三层存储：
- **SQLite**（`memories` 表）— 结构化记录，FTS5 搜索，去重
- **Markdown 文件** — `~/.muse/memory/*.md`（用户级），`{workspace}/.muse/memory/*.md`（项目级）
- **对话记忆** — 自动提取，仅存 SQLite

类型：`user` | `project` | `conversation`
分类：`preference` | `knowledge` | `decision` | `pattern`
来源：`auto`（AI 提取）| `manual`（斜杠命令）

**自动提取流程:**
```
第 5 条消息 → chatStore fire-and-forget → IPC memory:extract
→ Main Process 从 DB 解密 provider 凭证 → MemoryExtractor.extract()（30s 超时）
→ MemoryService.upsertMemory()（去重）→ MemoryFileService.syncMemoryToFile()
```

**检索流程（每条消息）:**
```
chatStore.sendMessage() → IPC memory:getRelevant → MemoryManager
  → 用户 .md 文件（600 token 预算）
  → 项目 .md 文件（800 token 预算）
  → FTS5 搜索对话记忆（600 token 预算，decay 衰减排序）
→ 格式化 markdown 注入 system prompt
```

**斜杠命令**（`ChatInput.tsx` 处理）：
- `/remember <content>` — 保存用户记忆
- `/remember-project <content>` — 保存项目记忆
- `/forget <keyword>` — 删除匹配记忆（先删 .md 再删 DB）
- `/memories` — 列出当前记忆

### 5. State Management (Zustand)

关键 stores：
- `chatStore` — 聊天状态、发消息、memory 提取触发
- `conversationStore` — 对话 CRUD、工作区关联
- `settingsStore` — 供应商/模型设置、memory 开关
- `workspaceStore` — 工作区路径
- `searchStore` — 对话搜索
- `loadingStore` — 全局加载状态

规则：
- `persist` + `partialize` — 只持久化用户偏好，不持久化缓存数据
- 跨 store 访问用 `useOtherStore.getState()`（不用 hooks）
- 后台异步用 `.catch(err => console.error(...))`

### 6. Tool Calling + Permission

Tool 定义在 `definitions.ts`（文件读写、命令执行、Web 搜索），执行在 `executor.ts`。

权限系统（`toolPermissions.ts` + `permissionFileService.ts`）：
- Classifier 判断工具风险等级
- Engine 评估规则
- Approval scopes 控制自动批准行为

### 7. MCP Integration

`src/api/services/mcp/` — client（协议客户端）、manager（生命周期）、init（启动初始化）。
通过 `mcpServers` 表配置，Settings UI 管理。

---

## Development Patterns

### Service Class

```typescript
export class EntityService {
  static async getAll() { ... }
  static async getById(id: string) {
    const result = await db.select().from(table).where(eq(table.id, id)).limit(1)
    return result[0] || null  // 找不到返回 null，不抛异常
  }
  static async create(data) { ... }
  static async update(id: string, data) {
    await db.update(table).set({ ...data, updatedAt: new Date() }).where(...)
    return this.getById(id)  // 返回更新后的实体
  }
  static async delete(id: string) { ... }  // 返回 void
}
```

- 全部 `static async`
- ID 用 `generateId()`（`db/utils/idGenerator`）
- toggle/mutation 方法先检查存在性，不存在返回 `null`

### IPC Handler

```typescript
// 读操作：出错返回空值
ipcMain.handle('entity:getAll', async () => {
  try { return await EntityService.getAll() }
  catch (error) { console.error('entity:getAll failed:', error); return [] }
})

// 写操作：校验输入，出错抛异常
ipcMain.handle('entity:create', async (_, data) => {
  const err = validateInput(data, ['requiredField'])
  if (err) throw new Error(err)
  return await EntityService.create(data)
})
```

- 读 handler 出错返回空数组/null（优雅降级）
- 写 handler 抛异常（客户端需要知道失败）
- 永远不从 Renderer 接收 API Key — 在 Main Process 从 DB 解析

### React Component

```typescript
interface MyComponentProps {
  data: SomeType
  onAction?: () => void
}

export function MyComponent({ data, onAction }: MyComponentProps) {
  // 1. Local state → 2. Store hooks（只解构需要的）→ 3. Effects → 4. Handlers（useCallback）→ 5. Render
  const { sendMessage, isLoading } = useChatStore()

  const handleSubmit = useCallback(() => { ... }, [deps])

  return <div>...</div>
}
```

- 只用函数组件
- `useCallback` 用于传给子组件的 handler
- `React.memo` 用于昂贵组件（设置面板、列表）
- 解构 store hooks 减少重渲染

### Error Handling

三层错误系统：
1. **API 层** — `AIError`（`code`、`retryable`、`httpStatus`），`AIError.fromUnknown()` 转换
2. **客户端层** — `APIClientError` 包装 API 错误
3. **Store 层** — `set({ error, lastError, retryable })`，`clearError()` 重置

### Import Order

1. React / 外部库
2. Lucide icons
3. 本地组件
4. Stores
5. Services
6. Utils
7. Shared types（用 `import type`）

### Naming

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase | `ChatView.tsx` |
| 服务文件 | camelCase | `memoryService.ts` |
| 函数 | camelCase | `handleSubmit` |
| 类 | PascalCase | `BaseAIProvider` |
| 常量 | UPPER_SNAKE_CASE | `MAX_CONVERSATION_CHARS` |
| 接口/类型 | PascalCase | `MemoryRecord` |

---

## Common Tasks

### 新增 AI 供应商
1. `src/api/services/ai/providers/` 创建文件，继承 `BaseAIProvider`
2. 实现 `chat()` + `validateConfig()`
3. 注册到 `factory.ts`
4. 更新 `src/shared/types/ai.ts`

### 新增数据库表
1. `schema.ts` 定义表 → `db/index.ts` 加迁移逻辑
2. `db/services/` 创建 Service
3. `main/index.ts` 加 IPC handler（含校验）
4. `preload/index.ts` 暴露接口
5. `shared/types/ipc.ts` 加类型

### 新增 IPC Handler
1. `main/index.ts` 加 handler（含校验）→ `preload/index.ts` 暴露 → `shared/types/ipc.ts` 加类型
2. Renderer 调用：`await window.api.myAction(arg)`

### 新增 Memory 分类
1. IPC handler 校验常量加新分类
2. `MemoryFileService.resolveFilePath()` 加文件映射
3. `MemoryExtractor` 更新提取 prompt
4. `MemorySettings.tsx` 更新 UI 过滤器

---

## Known Issues

**TypeScript 预存错误**（`tsc --noEmit` 会报错，但不影响运行）：
- `searchService.ts` — 类型不匹配
- `attachmentService.ts` — 类型不匹配
- `AppLayout.tsx` — props 类型
- `ConversationItem.tsx` — props 类型

这些是历史遗留问题，不要因为看到 tsc 报错就去"修复"不相关的文件。

**架构待改进项:**
- Memory 的 SQLite ↔ .md 双写没有全局事务保证，删除顺序是先 .md 后 DB
- Token budget（用户 600 + 项目 800 + 对话 600）没有全局上限
- `MemoryExtractor` 在 `src/api/` 但被 `src/main/` 动态 import，跨层依赖
- .md 文件来源的 memory 没有 decay 衰减机制
- Preload 的 memory 绑定用了 `any` 类型

---

## Scripts

```bash
npm run dev          # 开发模式（热重载）
npm run build        # 生产构建
npm run test         # 跑测试
npm run test:coverage # 覆盖率报告
npm run lint         # ESLint 检查
npm run format       # Prettier 格式化
```

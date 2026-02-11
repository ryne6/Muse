# Muse 权限系统升级 PRD

> Product Requirements Document
> Version: 1.0
> Date: 2026-02-11
> Author: designer (Permission System Team)

---

## 目录

1. [背景与现状分析](#1-背景与现状分析)
2. [设计目标与优先级](#2-设计目标与优先级)
3. [P0 — 基础能力补齐](#3-p0--基础能力补齐)
4. [P1 — 规则系统](#4-p1--规则系统)
5. [P2 — 高级能力](#5-p2--高级能力)
6. [数据模型设计](#6-数据模型设计)
7. [兼容性策略](#7-兼容性策略)
8. [BDD 验收标准](#8-bdd-验收标准)

---

## 1. 背景与现状分析

### 1.1 当前架构

Muse 现有权限系统由以下模块组成：

| 文件 | 职责 | 问题 |
|------|------|------|
| `src/shared/types/toolPermissions.ts` | 硬编码 `DANGEROUS_TOOLS` 列表（Bash, Write, Edit, GitCommit, GitPush, GitCheckout） | 粒度粗，无法区分安全/危险的 Bash 命令 |
| `src/api/services/ai/tools/executor.ts` | 权限检查：`isDangerous && !allowAll && !allowOnce` 则返回 permission_request | 仅支持 allowAll（全局放行）和 allowOnce（单次放行）两级 |
| `src/renderer/src/stores/settingsStore.ts` | `toolPermissionsByWorkspace` 持久化 `{ allowAll: boolean }` | 仅 workspace 级 allowAll，无细粒度规则 |
| `src/renderer/src/stores/chatStore.ts` | `approveToolCall` 发送审批消息，支持 `allowAll` 参数 | deny 时无反馈给 AI，AI 会卡住 |
| `src/renderer/src/components/chat/ToolCallCard.tsx` | 审批 UI：允许 / 允许所有 / 拒绝 三个按钮 | 拒绝仅前端状态变更，不通知 AI |
| `src/api/routes/chat.ts` | API 层传递 `toolPermissions` 和 `allowOnceTools` | 无规则匹配能力 |

### 1.2 当前权限检查流程

```
AI 请求工具调用
  → executor.execute(toolName, input, options)
    → 检查 DANGEROUS_TOOLS.includes(toolName)
      → 是危险工具 && !allowAll && !allowOnce
        → 返回 __tool_permission__:{...} 特殊前缀字符串
        → 前端 ToolCallCard 解析并显示审批按钮
        → 用户点击"允许" → approveToolCall → 发送新消息重新触发
        → 用户点击"允许所有" → setToolAllowAll(workspace, true) + 发送新消息
        → 用户点击"拒绝" → 仅设置前端 approvalStatus='denied'，AI 无感知
```

### 1.3 核心问题

1. **Bash 命令一刀切**：`ls`、`cat`、`git status` 等安全命令也需要审批
2. **审批粒度不足**：只有 once 和 all 两级，缺少 session 和 project 级别
3. **拒绝无反馈**：deny 后 AI 不知道被拒绝，无法调整策略
4. **无规则系统**：不支持 pattern-based 的 allow/deny 规则
5. **无配置分层**：没有 project 级和 user 级配置文件
6. **无 Hooks 机制**：无法在工具执行前后插入自定义逻辑

---

## 2. 设计目标与优先级

| 优先级 | 功能 | 目标 |
|--------|------|------|
| P0 | 工具分类细化 | Bash 命令按安全性细分，安全命令自动放行 |
| P0 | 审批粒度扩展 | 从 2 级扩展到 4 级（once/session/project/global） |
| P0 | 拒绝反馈 | deny 时将原因传回 AI |
| P1 | Pattern-based 规则 | 支持 glob 路径匹配和命令前缀匹配 |
| P1 | 配置分层 | project 级 + user 级配置文件 |
| P2 | Hooks 系统 | PreToolUse / PostToolUse 可编程拦截点 |
| P2 | 沙箱探索 | OS 级沙箱隔离概念设计 |

### 设计原则

参考 Claude Code 和 Codex CLI 的理念：

- **最小权限原则**：默认拒绝，显式授权
- **deny 优先于 allow**：当 deny 和 allow 规则冲突时，deny 胜出
- **read-only 自动放行**：只读操作不应打断用户流程
- **渐进式信任**：从 once → session → project → global 逐步放宽
- **AI 感知拒绝**：拒绝不是死胡同，AI 应能调整策略

---

## 3. P0 — 基础能力补齐

### 3.1 工具分类细化

#### 3.1.1 工具危险等级分类

将所有工具从当前的二元分类（dangerous / safe）升级为三级分类：

| 等级 | 名称 | 行为 | 工具示例 |
|------|------|------|----------|
| `safe` | 安全 | 自动放行，无需审批 | Read, LS, Glob, Grep, GitStatus, GitDiff, GitLog, WebFetch, WebSearch, TodoWrite |
| `moderate` | 中等 | 需要审批，但可通过规则自动放行 | Write, Edit, Bash(安全命令) |
| `dangerous` | 危险 | 默认需要审批，deny 规则优先 | Bash(危险命令), GitCommit, GitPush, GitCheckout |

#### 3.1.2 Bash 命令细分

Bash 工具不再作为整体归类，而是根据实际执行的命令进行动态分类：

**安全命令白名单（自动放行）：**

```typescript
const SAFE_BASH_PREFIXES = [
  // 文件查看
  'cat ', 'head ', 'tail ', 'less ', 'wc ',
  // 目录浏览
  'ls', 'pwd', 'find ', 'tree ',
  // 搜索
  'grep ', 'rg ', 'ag ', 'ack ',
  // Git 只读
  'git status', 'git log', 'git diff', 'git branch',
  'git show', 'git blame', 'git stash list',
  // 包管理只读
  'npm list', 'npm ls', 'npm outdated', 'npm view',
  'yarn list', 'yarn info', 'yarn why',
  'pnpm list', 'pnpm ls', 'pnpm why',
  'bun pm ls',
  // 构建/测试
  'npm test', 'npm run test', 'npm run lint', 'npm run check',
  'yarn test', 'yarn lint', 'pnpm test', 'bun test',
  'npx tsc --noEmit', 'npx eslint',
  // 系统信息
  'which ', 'where ', 'whoami', 'uname', 'env',
  'node --version', 'npm --version', 'python --version',
  // 文本处理（只读）
  'echo ', 'printf ', 'sort ', 'uniq ', 'cut ', 'tr ',
  'awk ', 'sed -n', 'jq ',
]

const SAFE_BASH_EXACT = [
  'ls', 'pwd', 'whoami', 'date', 'uname',
  'git status', 'git branch', 'git log',
]
```

**危险命令黑名单（始终需要审批）：**

```typescript
const DANGEROUS_BASH_PATTERNS = [
  // 删除操作
  /\brm\s/, /\brmdir\s/,
  // 权限修改
  /\bchmod\s/, /\bchown\s/,
  // 系统操作
  /\bsudo\s/, /\bsu\s/,
  // 网络操作
  /\bcurl\s.*(-X|--request)\s*(POST|PUT|DELETE|PATCH)/,
  /\bwget\s/,
  // 进程操作
  /\bkill\s/, /\bkillall\s/,
  // 包安装
  /\bnpm install/, /\bnpm i\s/, /\byarn add/, /\bpnpm add/, /\bbun add/,
  /\bpip install/, /\bbrew install/,
  // Git 写操作
  /\bgit push/, /\bgit commit/, /\bgit checkout/,
  /\bgit reset/, /\bgit rebase/, /\bgit merge/,
  /\bgit stash (drop|pop|clear)/,
  // 危险重定向
  />\s*\//, // 写入绝对路径
  /\|\s*tee\s/,
]
```

**分类逻辑：**

```
classifyBashCommand(command: string): ToolRiskLevel
  1. 先检查 DANGEROUS_BASH_PATTERNS → 匹配则返回 'dangerous'
  2. 再检查 SAFE_BASH_PREFIXES / SAFE_BASH_EXACT → 匹配则返回 'safe'
  3. 默认返回 'moderate'（需要审批，但可被规则覆盖）
```

#### 3.1.3 对现有代码的影响

**`src/shared/types/toolPermissions.ts`** — 重构：

```typescript
// 替换 DANGEROUS_TOOLS 硬编码列表
export type ToolRiskLevel = 'safe' | 'moderate' | 'dangerous'

export interface ToolClassification {
  tool: string
  level: ToolRiskLevel
  // Bash 工具的动态分类需要 input
  classifyWithInput?: (input: Record<string, any>) => ToolRiskLevel
}

export const TOOL_CLASSIFICATIONS: ToolClassification[] = [
  // Safe tools — 自动放行
  { tool: 'Read', level: 'safe' },
  { tool: 'LS', level: 'safe' },
  { tool: 'Glob', level: 'safe' },
  { tool: 'Grep', level: 'safe' },
  { tool: 'GitStatus', level: 'safe' },
  { tool: 'GitDiff', level: 'safe' },
  { tool: 'GitLog', level: 'safe' },
  { tool: 'WebFetch', level: 'safe' },
  { tool: 'WebSearch', level: 'safe' },
  { tool: 'TodoWrite', level: 'safe' },

  // Moderate tools — 需要审批，可被规则覆盖
  { tool: 'Write', level: 'moderate' },
  { tool: 'Edit', level: 'moderate' },

  // Dangerous tools — 默认需要审批
  { tool: 'GitCommit', level: 'dangerous' },
  { tool: 'GitPush', level: 'dangerous' },
  { tool: 'GitCheckout', level: 'dangerous' },

  // Bash — 动态分类
  {
    tool: 'Bash',
    level: 'moderate', // 默认等级
    classifyWithInput: (input) => classifyBashCommand(input.command || ''),
  },
]
```

**`src/api/services/ai/tools/executor.ts`** — 修改权限检查逻辑：

```typescript
// 旧逻辑
const isDangerous = DANGEROUS_TOOLS.includes(toolName as any)
if (isDangerous && !allowAll && !allowOnce) { ... }

// 新逻辑
const riskLevel = classifyTool(toolName, input)
if (riskLevel === 'safe') {
  // 直接执行
} else {
  // 检查规则系统 → 审批流程
}
```

### 3.2 审批粒度扩展

#### 3.2.1 四级审批范围

从当前的 2 级（once / all）扩展为 4 级：

| 级别 | 名称 | 生命周期 | 存储位置 | 说明 |
|------|------|----------|----------|------|
| `once` | 单次 | 本次工具调用 | 内存（不持久化） | 仅允许当前这一次调用 |
| `session` | 会话 | 当前对话 | 内存（conversationId 维度） | 在当前对话中允许该工具 |
| `project` | 项目 | 当前 workspace | `.muse/permissions.json` | 项目级持久化规则 |
| `global` | 全局 | 所有 workspace | `~/.muse/permissions.json` | 用户级持久化规则 |

#### 3.2.2 审批 UI 变化

**当前 UI（3 个按钮）：**
```
[允许] [允许所有] [拒绝]
```

**新 UI（下拉菜单 + 拒绝）：**
```
[允许 ▾] [拒绝]
```

点击"允许 ▾"展开下拉菜单：
```
┌─────────────────────────┐
│ 允许本次                 │
│ 允许本次对话              │
│ 允许此项目 (workspace)   │
│ 允许全局                 │
└─────────────────────────┘
```

点击"拒绝"展开输入框（可选填原因）：
```
┌─────────────────────────────────┐
│ 拒绝原因（可选）：               │
│ ┌─────────────────────────────┐ │
│ │ 不要修改这个文件...          │ │
│ └─────────────────────────────┘ │
│ [确认拒绝]                      │
└─────────────────────────────────┘
```

#### 3.2.3 审批状态存储

**内存级（once / session）：**

```typescript
// 在 executor 的 options 中传递
interface ToolExecutionOptions {
  toolCallId?: string
  toolPermissions?: ToolPermissionState
  // 新增：session 级已授权工具
  sessionApprovedTools?: Set<string>
  // 保留：单次授权
  allowOnceTools?: string[]
}
```

session 级授权存储在 `chatStore` 中，以 `conversationId` 为 key：

```typescript
// chatStore 新增状态
sessionApprovals: Record<string, Set<string>>
// key = conversationId, value = 已授权的工具名集合
```

**持久化级（project / global）：**

通过规则系统实现（见 P1 章节），写入 `.muse/permissions.json` 或 `~/.muse/permissions.json`。

#### 3.2.4 审批决策流程

```
工具调用请求 (toolName, input)
  │
  ├─ 1. classifyTool(toolName, input) → riskLevel
  │     └─ safe → 直接执行 ✅
  │
  ├─ 2. 检查 deny 规则（P1，deny 优先）
  │     └─ 匹配 deny → 拒绝执行 ❌
  │
  ├─ 3. 检查 allow 规则（P1）
  │     └─ 匹配 allow → 直接执行 ✅
  │
  ├─ 4. 检查 session 级授权
  │     └─ sessionApprovals[convId].has(toolName) → 直接执行 ✅
  │
  ├─ 5. 检查 allowAll（向后兼容）
  │     └─ allowAll === true → 直接执行 ✅
  │
  └─ 6. 返回 permission_request → 等待用户审批
```

#### 3.2.5 对现有代码的影响

**`src/renderer/src/components/chat/ToolCallCard.tsx`：**
- 替换三按钮为下拉菜单 + 拒绝按钮
- 拒绝按钮增加可选原因输入

**`src/renderer/src/stores/chatStore.ts`：**
- `approveToolCall` 增加 `scope` 参数：`'once' | 'session' | 'project' | 'global'`
- 新增 `sessionApprovals` 状态
- 新增 `denyToolCall` action

**`src/renderer/src/stores/settingsStore.ts`：**
- `toolPermissionsByWorkspace` 保留向后兼容
- 新增 `addPermissionRule(scope, rule)` action

### 3.3 拒绝反馈

#### 3.3.1 问题描述

当前拒绝流程：
1. 用户点击"拒绝"
2. 前端设置 `approvalStatus = 'denied'`
3. AI 完全不知道被拒绝，对话卡住

#### 3.3.2 设计方案

拒绝时向 AI 发送一条特殊的用户消息，包含拒绝信息和可选原因：

```typescript
// chatStore 新增 denyToolCall action
denyToolCall: async (conversationId, toolName, toolCallId, reason?) => {
  const denyMessage = reason
    ? `[Tool Denied] The user denied the "${toolName}" tool call. Reason: ${reason}. Please adjust your approach.`
    : `[Tool Denied] The user denied the "${toolName}" tool call. Please try a different approach or ask the user for guidance.`

  // 发送 deny 消息作为用户消息，触发 AI 继续对话
  await get().sendMessage(conversationId, denyMessage, ...)
}
```

#### 3.3.3 AI 系统提示词补充

在 `chatStore.ts` 的 systemPrompt 中增加：

```
## Tool Permission Handling
- When a tool call is denied, you will receive a [Tool Denied] message
- Read the denial reason carefully and adjust your strategy
- Suggest alternative approaches to the user
- Do NOT retry the same tool call that was denied
- If you need the denied operation, explain why and ask the user to reconsider
```

#### 3.3.4 对现有代码的影响

**`src/renderer/src/stores/chatStore.ts`：**
- 新增 `denyToolCall(conversationId, toolName, toolCallId, reason?)` action
- deny 消息作为 user role 发送，触发 AI 继续响应

**`src/renderer/src/components/chat/ToolCallCard.tsx`：**
- "拒绝"按钮点击后展开原因输入框
- 确认拒绝后调用 `denyToolCall`

**`src/api/services/ai/tools/executor.ts`：**
- 无需修改，deny 通过消息流传递

---

## 4. P1 — 规则系统

### 4.1 Pattern-based Allow/Deny 规则

#### 4.1.1 规则格式

参考 Claude Code 的规则语法，设计统一的规则格式：

```typescript
export interface PermissionRule {
  /** 规则唯一 ID */
  id: string
  /** allow 或 deny */
  action: 'allow' | 'deny'
  /** 工具名称，支持通配符 */
  tool: string
  /** 可选：匹配条件 */
  match?: {
    /** Bash 命令前缀匹配 */
    commandPrefix?: string
    /** 文件路径 glob 匹配（用于 Read/Write/Edit） */
    pathGlob?: string
  }
  /** 规则来源 */
  source: 'project' | 'global'
  /** 可选：规则描述 */
  description?: string
}
```

#### 4.1.2 规则示例

```json
{
  "rules": [
    {
      "id": "allow-npm-test",
      "action": "allow",
      "tool": "Bash",
      "match": { "commandPrefix": "npm test" },
      "description": "Allow running npm test without approval"
    },
    {
      "id": "allow-edit-src",
      "action": "allow",
      "tool": "Edit",
      "match": { "pathGlob": "src/**/*.ts" },
      "description": "Allow editing TypeScript files in src/"
    },
    {
      "id": "deny-edit-config",
      "action": "deny",
      "tool": "Edit",
      "match": { "pathGlob": "*.config.*" },
      "description": "Never edit config files without explicit approval"
    },
    {
      "id": "deny-rm-rf",
      "action": "deny",
      "tool": "Bash",
      "match": { "commandPrefix": "rm -rf" },
      "description": "Never allow rm -rf"
    },
    {
      "id": "allow-all-write",
      "action": "allow",
      "tool": "Write",
      "description": "Allow all file writes in this project"
    }
  ]
}
```

#### 4.1.3 规则匹配逻辑

```
matchRule(toolName, input, rules): 'allow' | 'deny' | null
  1. 过滤出匹配 toolName 的规则（支持 '*' 通配符）
  2. 对每条规�检查 match 条件：
     - commandPrefix: input.command.startsWith(rule.match.commandPrefix)
     - pathGlob: minimatch(input.path, rule.match.pathGlob)
     - 无 match: 匹配该工具的所有调用
  3. deny 优先：如果有任何 deny 规则匹配 → 返回 'deny'
  4. 如果有 allow 规则匹配 → 返回 'allow'
  5. 无匹配 → 返回 null（走默认审批流程）
```

**deny 优先原则**：当同一个工具调用同时匹配 allow 和 deny 规则时，deny 胜出。这确保安全边界不会被意外放宽。

### 4.2 配置分层

#### 4.2.1 两级配置文件

| 级别 | 路径 | 优先级 | 说明 |
|------|------|--------|------|
| Project | `<workspace>/.muse/permissions.json` | 高 | 项目级规则，可提交到 Git |
| Global | `~/.muse/permissions.json` | 低 | 用户级规则，跨项目生效 |

**合并策略**：
- 两级规则合并为一个列表
- deny 规则始终优先，不论来源
- 同级别内，project 规则优先于 global 规则
- 规则按 `source` 字段标记来源

#### 4.2.2 配置文件格式

```json
// .muse/permissions.json (project 级)
{
  "version": 1,
  "rules": [
    {
      "id": "allow-npm-test",
      "action": "allow",
      "tool": "Bash",
      "match": { "commandPrefix": "npm test" }
    }
  ]
}
```

```json
// ~/.muse/permissions.json (global 级)
{
  "version": 1,
  "rules": [
    {
      "id": "deny-rm-rf-global",
      "action": "deny",
      "tool": "Bash",
      "match": { "commandPrefix": "rm -rf /" }
    }
  ]
}
```

#### 4.2.3 配置加载流程

```
应用启动 / workspace 切换
  → 加载 ~/.muse/permissions.json (global)
  → 加载 <workspace>/.muse/permissions.json (project)
  → 合并规则列表，标记 source
  → 缓存到 PermissionEngine 实例
  → 文件变更时自动重新加载（fs.watch）
```

#### 4.2.4 对现有代码的影响

**新增文件 `src/shared/permissions/engine.ts`：**
- `PermissionEngine` 类：规则加载、合并、匹配
- `classifyTool()` 函数：工具分类
- `matchRules()` 函数：规则匹配

**新增文件 `src/main/services/permissionFileService.ts`：**
- 读写 `.muse/permissions.json` 和 `~/.muse/permissions.json`
- 文件监听与热重载

**新增 IPC handler：**
- `permissions:load` — 加载合并后的规则
- `permissions:addRule` — 添加规则到指定级别
- `permissions:removeRule` — 删除规则

**`src/api/services/ai/tools/executor.ts`：**
- 注入 `PermissionEngine` 实例
- 权限检查逻辑替换为 engine.evaluate()

---

## 5. P2 — 高级能力

### 5.1 Hooks 系统

#### 5.1.1 概述

Hooks 允许用户在工具执行前后插入自定义 shell 脚本，实现可编程的拦截和扩展。参考 Claude Code 的 Hooks 设计。

#### 5.1.2 Hook 类型

| Hook | 触发时机 | 用途 |
|------|----------|------|
| `PreToolUse` | 工具执行前 | 拦截、修改参数、记录日志 |
| `PostToolUse` | 工具执行后 | 审计、通知、后处理 |

#### 5.1.3 Hook 配置格式

Hook 配置在 permissions.json 中定义：

```json
{
  "version": 1,
  "rules": [...],
  "hooks": {
    "PreToolUse": [
      {
        "id": "log-bash",
        "toolMatch": "Bash",
        "command": "echo \"[$(date)] Bash: $TOOL_INPUT_COMMAND\" >> ~/.muse/audit.log",
        "timeout": 5000,
        "onFailure": "skip"
      },
      {
        "id": "lint-on-edit",
        "toolMatch": "Edit",
        "command": "echo 'proceed'",
        "timeout": 3000,
        "onFailure": "block"
      }
    ],
    "PostToolUse": [
      {
        "id": "notify-git-push",
        "toolMatch": "GitPush",
        "command": "osascript -e 'display notification \"Code pushed\" with title \"Muse\"'",
        "timeout": 5000,
        "onFailure": "skip"
      }
    ]
  }
}
```

#### 5.1.4 Hook 执行机制

**环境变量注入：**

Hook 脚本通过环境变量接收工具调用上下文：

| 变量 | 说明 |
|------|------|
| `TOOL_NAME` | 工具名称（如 `Bash`, `Edit`） |
| `TOOL_CALL_ID` | 工具调用 ID |
| `TOOL_INPUT_JSON` | 完整输入参数 JSON |
| `TOOL_INPUT_COMMAND` | Bash 工具的 command 参数 |
| `TOOL_INPUT_PATH` | 文件操作工具的 path 参数 |
| `TOOL_OUTPUT` | （仅 PostToolUse）工具执行结果 |
| `WORKSPACE_PATH` | 当前 workspace 路径 |

**PreToolUse 返回值约定：**
- exit code 0 → 继续执行工具
- exit code 非 0 → 根据 `onFailure` 决定行为
  - `"block"` → 阻止工具执行，返回 hook 的 stderr 作为错误信息
  - `"skip"` → 忽略 hook 失败，继续执行工具

**超时处理：**
- 每个 hook 有独立的 `timeout`（默认 5000ms）
- 超时视为失败，按 `onFailure` 策略处理

### 5.2 沙箱探索方向（概念设计）

#### 5.2.1 设计理念

参考 Codex CLI 的沙箱模式，Muse 可探索 OS 级隔离：

| 模式 | 文件系统 | 网络 | 适用场景 |
|------|----------|------|----------|
| `read-only` | 只读 | 允许 | 代码分析、问答 |
| `workspace-write` | workspace 内可写，其余只读 | 允许 | 日常开发 |
| `full-access` | 完全访问 | 完全访问 | 高信任场景 |

#### 5.2.2 实现路径（仅探索）

- macOS: 使用 `sandbox-exec` 或 App Sandbox entitlements
- Linux: 使用 `firejail` 或 `bubblewrap`
- Windows: 使用 Windows Sandbox API
- 跨平台: 考虑 Docker 容器隔离

**注意**：沙箱为 P2 探索方向，不在本次实现范围内。仅做概念设计，为后续迭代预留接口。

#### 5.2.3 预留接口

```typescript
// 在 ToolExecutionOptions 中预留沙箱模式字段
interface ToolExecutionOptions {
  // ... 现有字段
  sandboxMode?: 'read-only' | 'workspace-write' | 'full-access'
}
```

---

## 6. 数据模型设计

### 6.1 核心类型定义

```typescript
// src/shared/types/toolPermissions.ts — 重构后

/** 工具风险等级 */
export type ToolRiskLevel = 'safe' | 'moderate' | 'dangerous'

/** 审批范围 */
export type ApprovalScope = 'once' | 'session' | 'project' | 'global'

/** 规则动作 */
export type RuleAction = 'allow' | 'deny'

/** 规则来源 */
export type RuleSource = 'project' | 'global'
```

### 6.2 权限规则模型

```typescript
/** 匹配条件 */
export interface RuleMatch {
  commandPrefix?: string
  pathGlob?: string
}

/** 权限规则 */
export interface PermissionRule {
  id: string
  action: RuleAction
  tool: string
  match?: RuleMatch
  source: RuleSource
  description?: string
}

/** 权限配置文件格式 */
export interface PermissionConfig {
  version: number
  rules: Omit<PermissionRule, 'source'>[]
  hooks?: HooksConfig
}
```

### 6.3 Hook 模型

```typescript
/** Hook 定义 */
export interface HookDefinition {
  id: string
  toolMatch: string
  command: string
  timeout?: number
  onFailure: 'block' | 'skip'
}

/** Hooks 配置 */
export interface HooksConfig {
  PreToolUse?: HookDefinition[]
  PostToolUse?: HookDefinition[]
}
```

### 6.4 执行器选项模型（重构）

```typescript
/** 工具执行选项 — 替换现有 ToolExecutionOptions */
export interface ToolExecutionOptions {
  toolCallId?: string
  /** 向后兼容：旧的 allowAll 模式 */
  toolPermissions?: { allowAll: boolean }
  /** 单次授权工具列表 */
  allowOnceTools?: string[]
  /** session 级已授权工具（conversationId → Set<toolName>） */
  sessionApprovedTools?: Set<string>
  /** 合并后的权限规则 */
  permissionRules?: PermissionRule[]
  /** Hooks 配置 */
  hooks?: HooksConfig
  /** 沙箱模式（P2 预留） */
  sandboxMode?: 'read-only' | 'workspace-write' | 'full-access'
}
```

### 6.5 Permission Engine 核心接口

```typescript
/** 权限评估结果 */
export interface PermissionDecision {
  action: 'allow' | 'deny' | 'ask'
  reason?: string
  matchedRule?: PermissionRule
}

/** 权限引擎接口 */
export interface IPermissionEngine {
  evaluate(
    toolName: string,
    input: Record<string, any>,
    options: ToolExecutionOptions
  ): PermissionDecision

  loadRules(projectPath?: string): Promise<void>
  getRules(): PermissionRule[]
}
```

---

## 7. 兼容性策略

### 7.1 向后兼容原则

升级过程中必须保证现有功能不受影响：

| 现有功能 | 兼容策略 |
|----------|----------|
| `DANGEROUS_TOOLS` 列表 | 保留导出，标记 `@deprecated`，内部改用 `TOOL_CLASSIFICATIONS` |
| `allowAll: boolean` | 保留支持，`allowAll=true` 等价于跳过所有规则检查 |
| `allowOnceTools` | 保留支持，作为 `once` 级审批的实现 |
| `TOOL_PERMISSION_PREFIX` | 保留，permission_request 协议不变 |
| `toolPermissionsByWorkspace` | 保留 localStorage 持久化，新规则系统并行运行 |

### 7.2 迁移路径

**Phase 1（P0 实现）：**
- 新增 `classifyTool()` 函数，替代 `DANGEROUS_TOOLS.includes()`
- 新增 `sessionApprovals` 状态
- 新增 `denyToolCall` action
- UI 改为下拉菜单
- 旧的 `allowAll` 逻辑保留为 fallback

**Phase 2（P1 实现）：**
- 新增 `PermissionEngine` 类
- 新增配置文件读写服务
- executor 中注入 engine
- 当无配置文件时，行为与 Phase 1 一致

**Phase 3（P2 实现）：**
- 新增 Hooks 执行器
- 配置文件增加 hooks 字段
- 无 hooks 配置时，行为与 Phase 2 一致

### 7.3 数据迁移

无需数据库迁移。所有新增状态通过以下方式存储：
- 内存：`sessionApprovals`（随对话生命周期）
- 文件：`.muse/permissions.json`（新增文件，不影响现有数据）
- localStorage：`toolPermissionsByWorkspace` 保持不变

---

## 8. BDD 验收标准

### 8.1 P0 — 工具分类细化

```gherkin
Feature: 工具分类细化
  作为 Muse 用户
  我希望安全的工具自动执行，危险的工具需要审批
  以便减少不必要的审批打断

  Scenario: 安全工具自动放行
    Given 用户未设置 allowAll
    When AI 调用 Read 工具读取文件
    Then 工具直接执行，不弹出审批对话框

  Scenario: 安全工具列表覆盖
    Given 用户未设置 allowAll
    When AI 调用以下工具时：Read, LS, Glob, Grep, GitStatus, GitDiff, GitLog, WebFetch, WebSearch, TodoWrite
    Then 所有工具直接执行，无需审批

  Scenario: 安全 Bash 命令自动放行
    Given 用户未设置 allowAll
    When AI 调用 Bash 工具执行 "ls -la"
    Then 命令直接执行，不弹出审批对话框

  Scenario: 安全 Bash 命令 — git status
    Given 用户未设置 allowAll
    When AI 调用 Bash 工具执行 "git status"
    Then 命令直接执行，不弹出审批对话框

  Scenario: 安全 Bash 命令 — npm test
    Given 用户未设置 allowAll
    When AI 调用 Bash 工具执行 "npm test"
    Then 命令直接执行，不弹出审批对话框

  Scenario: 危险 Bash 命令需要审批
    Given 用户未设置 allowAll
    When AI 调用 Bash 工具执行 "rm -rf /tmp/test"
    Then 弹出审批对话框，等待用户决定

  Scenario: 未知 Bash 命令需要审批
    Given 用户未设置 allowAll
    When AI 调用 Bash 工具执行 "python3 script.py"
    Then 弹出审批对话框（moderate 级别默认需要审批）

  Scenario: Write 工具需要审批
    Given 用户未设置 allowAll
    When AI 调用 Write 工具创建文件
    Then 弹出审批对话框

  Scenario: allowAll 跳过所有审批
    Given 用户已设置 allowAll = true
    When AI 调用任何工具
    Then 所有工具直接执行，不弹出审批对话框
```

### 8.2 P0 — 审批粒度扩展

```gherkin
Feature: 四级审批范围
  作为 Muse 用户
  我希望能选择不同的审批范围
  以便在安全和便利之间取得平衡

  Scenario: 允许本次（once）
    Given AI 调用 Write 工具，弹出审批对话框
    When 用户点击"允许"下拉菜单，选择"允许本次"
    Then 本次工具调用执行
    And 下次 AI 再调用 Write 工具时，仍需审批

  Scenario: 允许本次对话（session）
    Given AI 调用 Edit 工具，弹出审批对话框
    When 用户点击"允许"下拉菜单，选择"允许本次对话"
    Then 本次工具调用执行
    And 在同一对话中，AI 再调用 Edit 工具时自动放行
    And 在新对话中，AI 调用 Edit 工具时仍需审批

  Scenario: 允许此项目（project）
    Given AI 调用 Bash 工具执行 "npm install"，弹出审批对话框
    When 用户点击"允许"下拉菜单，选择"允许此项目"
    Then 本次工具调用执行
    And 规则写入 .muse/permissions.json
    And 在同一 workspace 中，AI 再调用相同命令时自动放行

  Scenario: 允许全局（global）
    Given AI 调用 Edit 工具，弹出审批对话框
    When 用户点击"允许"下拉菜单，选择"允许全局"
    Then 本次工具调用执行
    And 规则写入 ~/.muse/permissions.json
    And 在任何 workspace 中，AI 调用 Edit 工具时自动放行
```

### 8.3 P0 — 拒绝反馈

```gherkin
Feature: 拒绝反馈给 AI
  作为 Muse 用户
  我希望拒绝工具调用时 AI 能感知并调整策略
  以便对话不会卡住

  Scenario: 拒绝无原因
    Given AI 调用 Bash 工具执行 "npm install lodash"，弹出审批对话框
    When 用户点击"拒绝"并直接确认（不填原因）
    Then 向 AI 发送 "[Tool Denied]" 消息
    And AI 收到拒绝通知，调整策略继续对话

  Scenario: 拒绝带原因
    Given AI 调用 Write 工具写入 config.json，弹出审批对话框
    When 用户点击"拒绝"并输入原因 "不要修改配置文件"
    Then 向 AI 发送包含原因的 "[Tool Denied]" 消息
    And AI 根据原因调整策略（如改用其他方式）

  Scenario: 拒绝后 AI 不重试相同调用
    Given AI 调用 Bash 工具被用户拒绝
    When AI 收到 "[Tool Denied]" 消息
    Then AI 不应重试完全相同的工具调用
    And AI 应提出替代方案或询问用户
```

### 8.4 P1 — Pattern-based 规则

```gherkin
Feature: Pattern-based Allow/Deny 规则
  作为 Muse 用户
  我希望通过规则自动管理工具权限
  以便不需要每次手动审批

  Scenario: 命令前缀 allow 规则
    Given .muse/permissions.json 包含规则 allow Bash match commandPrefix "npm test"
    When AI 调用 Bash 工具执行 "npm test -- --coverage"
    Then 命令自动放行，不弹出审批对话框

  Scenario: 路径 glob allow 规则
    Given .muse/permissions.json 包含规则 allow Edit match pathGlob "src/**/*.ts"
    When AI 调用 Edit 工具编辑 "src/utils/helper.ts"
    Then 工具自动放行

  Scenario: 路径 glob allow 规则不匹配
    Given .muse/permissions.json 包含规则 allow Edit match pathGlob "src/**/*.ts"
    When AI 调用 Edit 工具编辑 "package.json"
    Then 弹出审批对话框

  Scenario: deny 规则优先于 allow
    Given .muse/permissions.json 包含规则 allow Edit（无 match）
    And .muse/permissions.json 包含规则 deny Edit match pathGlob "*.config.*"
    When AI 调用 Edit 工具编辑 "vite.config.ts"
    Then 工具被拒绝执行，deny 规则优先

  Scenario: 无匹配规则走默认审批
    Given .muse/permissions.json 包含规则 allow Bash match commandPrefix "npm test"
    When AI 调用 Bash 工具执行 "python3 script.py"
    Then 弹出审批对话框（无规则匹配，走默认流程）
```

### 8.5 P1 — 配置分层

```gherkin
Feature: 配置分层
  作为 Muse 用户
  我希望项目级和全局级配置分开管理
  以便不同项目有不同的权限策略

  Scenario: 项目级配置生效
    Given workspace 为 /projects/myapp
    And /projects/myapp/.muse/permissions.json 包含 allow Edit
    When AI 在该 workspace 中调用 Edit 工具
    Then 工具自动放行

  Scenario: 全局配置生效
    Given ~/.muse/permissions.json 包含 deny Bash match commandPrefix "rm -rf"
    When AI 在任何 workspace 中调用 Bash 执行 "rm -rf /tmp"
    Then 工具被拒绝

  Scenario: 项目级 deny 覆盖全局 allow
    Given ~/.muse/permissions.json 包含 allow Edit
    And .muse/permissions.json 包含 deny Edit match pathGlob "*.lock"
    When AI 调用 Edit 工具编辑 "package-lock.json"
    Then 工具被拒绝（deny 优先）

  Scenario: 无配置文件时使用默认行为
    Given 不存在 .muse/permissions.json
    And 不存在 ~/.muse/permissions.json
    When AI 调用 Write 工具
    Then 行为与升级前一致（moderate 工具需要审批）
```

### 8.6 P2 — Hooks 系统

```gherkin
Feature: Hooks 系统
  作为 Muse 高级用户
  我希望在工具执行前后插入自定义脚本
  以便实现审计、拦截和自动化

  Scenario: PreToolUse hook 放行
    Given permissions.json 配置了 PreToolUse hook（exit 0）
    When AI 调用匹配的工具
    Then hook 脚本执行并返回 exit 0
    And 工具正常执行

  Scenario: PreToolUse hook 阻止（onFailure=block）
    Given permissions.json 配置了 PreToolUse hook（exit 1, onFailure=block）
    When AI 调用匹配的工具
    Then hook 脚本执行并返回 exit 1
    And 工具执行被阻止
    And hook 的 stderr 作为错误信息返回给 AI

  Scenario: PreToolUse hook 失败但跳过（onFailure=skip）
    Given permissions.json 配置了 PreToolUse hook（exit 1, onFailure=skip）
    When AI 调用匹配的工具
    Then hook 脚本执行并返回 exit 1
    And 工具仍然正常执行（hook 失败被忽略）

  Scenario: PostToolUse hook 执行
    Given permissions.json 配置了 PostToolUse hook
    When AI 调用匹配的工具并执行完成
    Then PostToolUse hook 脚本执行
    And hook 可通过 TOOL_OUTPUT 环境变量获取工具输出

  Scenario: Hook 超时处理
    Given permissions.json 配置了 PreToolUse hook（timeout=3000）
    When hook 脚本执行超过 3 秒
    Then hook 被终止，视为失败
    And 按 onFailure 策略处理
```

### 8.7 向后兼容

```gherkin
Feature: 向后兼容
  作为现有 Muse 用户
  我希望升级后现有行为不受影响
  以便平滑过渡到新权限系统

  Scenario: 旧 allowAll 设置继续生效
    Given 用户在升级前已设置 allowAll = true（存储在 localStorage）
    When 升级到新权限系统后
    Then allowAll 设置继续生效，所有工具自动放行

  Scenario: 无配置文件时行为不变
    Given 用户未创建任何 permissions.json 文件
    When AI 调用 Write 工具
    Then 行为与升级前完全一致（弹出审批对话框）

  Scenario: DANGEROUS_TOOLS 导出保持可用
    Given 外部代码引用了 DANGEROUS_TOOLS
    When 升级到新权限系统后
    Then DANGEROUS_TOOLS 仍然可以导入使用（标记 @deprecated）
```

---

## 附录：文件变更清单

### 新增文件

| 文件 | 说明 | 优先级 |
|------|------|--------|
| `src/shared/permissions/engine.ts` | PermissionEngine 核心逻辑 | P0/P1 |
| `src/shared/permissions/classifier.ts` | 工具分类与 Bash 命令分类 | P0 |
| `src/shared/permissions/rules.ts` | 规则匹配逻辑 | P1 |
| `src/main/services/permissionFileService.ts` | 配置文件读写与监听 | P1 |
| `src/shared/permissions/hooks.ts` | Hook 执行器 | P2 |

### 修改文件

| 文件 | 变更内容 | 优先级 |
|------|----------|--------|
| `src/shared/types/toolPermissions.ts` | 新增类型，保留旧导出（@deprecated） | P0 |
| `src/api/services/ai/tools/executor.ts` | 权限检查逻辑替换为 engine.evaluate() | P0 |
| `src/renderer/src/stores/chatStore.ts` | 新增 denyToolCall、sessionApprovals、scope 参数 | P0 |
| `src/renderer/src/stores/settingsStore.ts` | 新增 addPermissionRule action | P1 |
| `src/renderer/src/components/chat/ToolCallCard.tsx` | 审批 UI 改为下拉菜单 + 拒绝原因输入 | P0 |
| `src/main/index.ts` | 新增 permissions:* IPC handlers | P1 |
| `src/preload/index.ts` | 暴露 permissions API | P1 |

---

> PRD End
> 下一步：交由 reviewer 进行 Review 并生成详细设计文档

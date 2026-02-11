# Muse 权限系统升级 — 详细设计文档

> Detailed Design Document
> Version: 1.0
> Date: 2026-02-11
> Author: design-reviewer (Permission System Team)
> Based on: [PRD v1.0](./2026-02-11-permission-system-prd.md)

---

## 目录

1. [PRD Review 结论](#1-prd-review-结论)
2. [架构总览](#2-架构总览)
3. [P0 详细设计 — 工具分类细化](#3-p0-详细设计--工具分类细化)
4. [P0 详细设计 — 审批粒度扩展](#4-p0-详细设计--审批粒度扩展)
5. [P0 详细设计 — 拒绝反馈](#5-p0-详细设计--拒绝反馈)
6. [P1 详细设计 — 规则引擎](#6-p1-详细设计--规则引擎)
7. [P1 详细设计 — 配置分层](#7-p1-详细设计--配置分层)
8. [P2 接口预留](#8-p2-接口预留)
9. [数据流与时序图](#9-数据流与时序图)
10. [向后兼容策略](#10-向后兼容策略)
11. [完整类型定义](#11-完整类型定义)
12. [文件变更清单](#12-文件变更清单)
13. [BDD 验收标准](#13-bdd-验收标准)

---

## 1. PRD Review 结论

### 1.1 总体评价

PRD 质量较高，功能覆盖完整，优先级划分合理。以下是具体评审意见：

### 1.2 功能完整性 ✅

- P0/P1/P2 覆盖了差距分析中的全部 6 项问题
- 工具分类细化、审批粒度、拒绝反馈、规则系统、配置分层、Hooks 均有对应设计

### 1.3 可行性评估 ✅（有修正建议）

| 项目 | 评估 | 说明 |
|------|------|------|
| 工具分类 | ✅ 可行 | 与现有 executor 架构兼容 |
| 审批粒度 | ⚠️ 需修正 | project/global 级审批依赖 P1 规则系统，P0 阶段仅实现 once/session |
| 拒绝反馈 | ✅ 可行 | 通过消息流实现，无需修改 API 层 |
| 规则引擎 | ✅ 可行 | 新增独立模块，不影响现有代码 |
| 配置分层 | ⚠️ 需注意 | 需要新增 IPC handler 和 preload API |

### 1.4 发现的问题与修正

**问题 1：P0 审批 UI 中的 project/global 选项依赖 P1**

PRD 在 P0 的审批 UI 中包含了"允许此项目"和"允许全局"选项，但这两个选项需要写入 `permissions.json` 文件，这是 P1 的配置分层功能。

**修正方案**：P0 阶段 UI 下拉菜单仅显示"允许本次"和"允许本次对话"两个选项。P1 实现后再添加"允许此项目"和"允许全局"。这样 P0 可以独立交付，不依赖文件系统操作。

**问题 2：Bash 安全命令白名单中 `sed -n` 的分类**

`sed -n` 被归为安全命令，但 `sed` 可以通过 `-i` 参数修改文件。仅匹配 `sed -n` 前缀是安全的，但需要确保不会匹配到 `sed -n -i` 这样的组合。

**修正方案**：在 `classifyBashCommand` 中，对 `sed` 命令增加额外检查：如果命令包含 `-i` 参数，则归为 `moderate`。

**问题 3：`npm test` 等命令可能执行任意脚本**

`npm test` 实际执行的是 `package.json` 中定义的脚本，可能包含危险操作。

**修正方案**：保留 PRD 设计（将 `npm test` 归为安全），但在详细设计中增加注释说明风险。用户可通过 P1 规则系统自定义覆盖。

**问题 4：`approveToolCall` 中 session 级审批的传递路径**

当前 `approveToolCall` 通过发送新消息触发重新执行。session 级审批需要在后续请求中自动携带已授权工具列表，但 `sendMessage` 的 `options` 参数是一次性的。

**修正方案**：session 级授权存储在 `chatStore` 中，每次 `sendMessage` 时自动从 store 读取并合并到 `options.allowOnceTools` 中。详见 §4 设计。

### 1.5 用户体验评估 ✅

- 审批流程从弹窗改为内联下拉菜单，不打断对话流
- 拒绝反馈让 AI 能感知并调整，避免对话卡死
- 安全工具自动放行减少 80%+ 的审批打断

### 1.6 数据模型评估 ✅

- 类型定义合理，与现有 schema 兼容
- 无需数据库迁移，新增状态通过内存和文件存储
- `PermissionRule` 接口设计简洁，易于扩展

---

## 2. 架构总览

### 2.1 权限系统在整体架构中的位置

```
┌─────────────────────────────────────────────────────────────────┐
│                        Renderer Process                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ ToolCallCard │  │  chatStore   │  │   settingsStore       │ │
│  │ (审批 UI)     │→│ (session审批) │  │ (allowAll 兼容)       │ │
│  └──────────────┘  └──────┬───────┘  └───────────────────────┘ │
│                           │ sendMessage(options)                │
├───────────────────────────┼─────────────────────────────────────┤
│                    API Layer (Hono)                              │
│  ┌────────────────────────┼───────────────────────────────────┐ │
│  │              chat.ts   │                                   │ │
│  │                        ▼                                   │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │              ToolExecutor.execute()                  │   │ │
│  │  │  ┌───────────────────────────────────────────────┐  │   │ │
│  │  │  │         PermissionEngine.evaluate()           │  │   │ │
│  │  │  │  1. classifyTool() → riskLevel               │  │   │ │
│  │  │  │  2. matchRules() → deny/allow/null  (P1)     │  │   │ │
│  │  │  │  3. checkSession() → approved?               │  │   │ │
│  │  │  │  4. checkAllowAll() → fallback               │  │   │ │
│  │  │  └───────────────────────────────────────────────┘  │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                     Main Process                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  permissionFileService.ts (P1)                           │   │
│  │  - 读写 .muse/permissions.json                           │   │
│  │  - 读写 ~/.muse/permissions.json                         │   │
│  │  - fs.watch 热重载                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 模块依赖关系

```
src/shared/permissions/classifier.ts  ← P0 新增
    ↑
src/shared/permissions/engine.ts      ← P0 新增（P1 扩展）
    ↑
src/api/services/ai/tools/executor.ts ← P0 修改
    ↑
src/api/routes/chat.ts                ← P1 修改（传递 rules）
    ↑
src/renderer/src/stores/chatStore.ts  ← P0 修改
    ↑
src/renderer/src/components/chat/ToolCallCard.tsx ← P0 修改
```

---

## 3. P0 详细设计 — 工具分类细化

### 3.1 新增文件：`src/shared/permissions/classifier.ts`

此文件负责工具风险等级分类和 Bash 命令动态分类。

```typescript
// src/shared/permissions/classifier.ts

export type ToolRiskLevel = 'safe' | 'moderate' | 'dangerous'

/**
 * 静态工具分类表
 * 不包含 Bash（Bash 需要动态分类）
 */
const STATIC_TOOL_LEVELS: Record<string, ToolRiskLevel> = {
  // Safe — 自动放行
  Read: 'safe',
  LS: 'safe',
  Glob: 'safe',
  Grep: 'safe',
  GitStatus: 'safe',
  GitDiff: 'safe',
  GitLog: 'safe',
  WebFetch: 'safe',
  WebSearch: 'safe',
  TodoWrite: 'safe',

  // Moderate — 需要审批，可被规则覆盖
  Write: 'moderate',
  Edit: 'moderate',

  // Dangerous — 默认需要审批
  GitCommit: 'dangerous',
  GitPush: 'dangerous',
  GitCheckout: 'dangerous',
}

/**
 * Bash 安全命令前缀白名单
 * 注意：npm test 等命令实际执行 package.json 中的脚本，
 * 存在一定风险，用户可通过 P1 规则系统自定义覆盖。
 */
const SAFE_BASH_PREFIXES = [
  // 文件查看
  'cat ', 'head ', 'tail ', 'less ', 'wc ',
  // 目录浏览
  'ls ', 'ls\t', 'pwd', 'find ', 'tree ',
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
  'awk ', 'jq ',
  // 注意：sed -n 需要额外检查，不在此列表中
]

const SAFE_BASH_EXACT = [
  'ls', 'pwd', 'whoami', 'date', 'uname',
  'git status', 'git branch', 'git log',
]

/**
 * Bash 危险命令正则黑名单
 */
const DANGEROUS_BASH_PATTERNS: RegExp[] = [
  // 删除操作
  /\brm\s/, /\brmdir\s/,
  // 权限修改
  /\bchmod\s/, /\bchown\s/,
  // 系统操作
  /\bsudo\s/, /\bsu\s/,
  // 网络写操作
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

/**
 * 对 Bash 命令进行动态风险分类
 */
export function classifyBashCommand(command: string): ToolRiskLevel {
  const trimmed = command.trim()

  // 1. 先检查危险模式
  for (const pattern of DANGEROUS_BASH_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'dangerous'
    }
  }

  // 2. 检查精确匹配
  if (SAFE_BASH_EXACT.includes(trimmed)) {
    return 'safe'
  }

  // 3. 检查前缀匹配
  for (const prefix of SAFE_BASH_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      // 特殊处理：sed 命令如果包含 -i 参数则为 moderate
      if (prefix === 'sed -n' && /\s-i\b/.test(trimmed)) {
        return 'moderate'
      }
      return 'safe'
    }
  }

  // 4. 特殊处理：sed -n（不在 SAFE_BASH_PREFIXES 中，单独检查）
  if (trimmed.startsWith('sed -n') || trimmed.startsWith('sed -n ')) {
    if (/\s-i\b/.test(trimmed)) {
      return 'moderate'
    }
    return 'safe'
  }

  // 5. 默认 moderate
  return 'moderate'
}

/**
 * 对任意工具进行风险分类
 * @param toolName 工具名称
 * @param input 工具输入参数（Bash 工具需要）
 */
export function classifyTool(
  toolName: string,
  input?: Record<string, any>
): ToolRiskLevel {
  // Bash 工具需要动态分类
  if (toolName === 'Bash') {
    return classifyBashCommand(input?.command || '')
  }

  // 静态分类表查找
  const level = STATIC_TOOL_LEVELS[toolName]
  if (level) return level

  // 未知工具（包括 MCP 工具）默认 moderate
  return 'moderate'
}

// 导出常量供测试使用
export { SAFE_BASH_PREFIXES, SAFE_BASH_EXACT, DANGEROUS_BASH_PATTERNS }
```

### 3.2 修改文件：`src/shared/types/toolPermissions.ts`

保留旧导出以向后兼容，新增类型定义：

```typescript
// src/shared/types/toolPermissions.ts — 变更后

// ============ 向后兼容（@deprecated） ============

/** @deprecated 使用 classifyTool() 替代 */
export const DANGEROUS_TOOLS = [
  'Bash', 'Write', 'Edit', 'GitCommit', 'GitPush', 'GitCheckout',
] as const

/** @deprecated 使用 ToolRiskLevel 替代 */
export type DangerousToolName = typeof DANGEROUS_TOOLS[number]

// ============ 保留（不变） ============

export interface ToolPermissionState {
  allowAll: boolean
}

export interface PermissionRequestPayload {
  kind: 'permission_request'
  toolName: string
  toolCallId?: string
}

export const TOOL_PERMISSION_PREFIX = '__tool_permission__:'

// ============ 新增类型 ============

/** 工具风险等级 */
export type ToolRiskLevel = 'safe' | 'moderate' | 'dangerous'

/** 审批范围 */
export type ApprovalScope = 'once' | 'session' | 'project' | 'global'

/** 规则动作 */
export type RuleAction = 'allow' | 'deny'

/** 规则来源 */
export type RuleSource = 'project' | 'global'

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
  hooks?: HooksConfig  // P2 预留
}

/** 权限评估结果 */
export interface PermissionDecision {
  action: 'allow' | 'deny' | 'ask'
  reason?: string
  matchedRule?: PermissionRule
}

// ============ P2 预留 ============

export interface HookDefinition {
  id: string
  toolMatch: string
  command: string
  timeout?: number
  onFailure: 'block' | 'skip'
}

export interface HooksConfig {
  PreToolUse?: HookDefinition[]
  PostToolUse?: HookDefinition[]
}
```

### 3.3 新增文件：`src/shared/permissions/engine.ts`

P0 阶段的 PermissionEngine 仅包含分类和 session/allowAll 检查。P1 阶段扩展规则匹配。

```typescript
// src/shared/permissions/engine.ts

import { classifyTool } from './classifier'
import type {
  PermissionDecision,
  PermissionRule,
  ToolRiskLevel,
} from '../types/toolPermissions'

export interface PermissionEvaluateOptions {
  /** 向后兼容：旧的 allowAll 模式 */
  allowAll?: boolean
  /** 单次授权工具列表 */
  allowOnceTools?: string[]
  /** session 级已授权工具 */
  sessionApprovedTools?: Set<string>
  /** 合并后的权限规则（P1） */
  permissionRules?: PermissionRule[]
}

export class PermissionEngine {
  /**
   * 评估工具调用是否被允许
   */
  evaluate(
    toolName: string,
    input: Record<string, any>,
    options: PermissionEvaluateOptions = {}
  ): PermissionDecision {
    // Step 1: 分类
    const riskLevel: ToolRiskLevel = classifyTool(toolName, input)

    if (riskLevel === 'safe') {
      return { action: 'allow', reason: 'Tool classified as safe' }
    }

    // Step 2: 检查 deny 规则（P1，deny 优先）
    if (options.permissionRules?.length) {
      const ruleDecision = this.matchRules(toolName, input, options.permissionRules)
      if (ruleDecision) return ruleDecision
    }

    // Step 3: 检查单次授权
    if (options.allowOnceTools?.includes(toolName)) {
      return { action: 'allow', reason: 'Allowed once by user' }
    }

    // Step 4: 检查 session 级授权
    if (options.sessionApprovedTools?.has(toolName)) {
      return { action: 'allow', reason: 'Allowed for this session' }
    }

    // Step 5: 检查 allowAll（向后兼容）
    if (options.allowAll) {
      return { action: 'allow', reason: 'All tools allowed (allowAll)' }
    }

    // Step 6: 需要用户审批
    return { action: 'ask', reason: `Tool "${toolName}" requires approval (${riskLevel})` }
  }

  /**
   * P1: 规则匹配逻辑
   * 返回 null 表示无匹配规则
   */
  private matchRules(
    toolName: string,
    input: Record<string, any>,
    rules: PermissionRule[]
  ): PermissionDecision | null {
    const matchingRules = rules.filter((rule) => {
      // 工具名匹配（支持 * 通配符）
      if (rule.tool !== '*' && rule.tool !== toolName) return false

      // match 条件检查
      if (rule.match) {
        if (rule.match.commandPrefix) {
          const command = input.command || input.cmd || ''
          if (!command.startsWith(rule.match.commandPrefix)) return false
        }
        if (rule.match.pathGlob) {
          const filePath = input.path || input.file_path || ''
          if (!this.matchGlob(filePath, rule.match.pathGlob)) return false
        }
      }

      return true
    })

    if (matchingRules.length === 0) return null

    // deny 优先
    const denyRule = matchingRules.find((r) => r.action === 'deny')
    if (denyRule) {
      return {
        action: 'deny',
        reason: denyRule.description || `Denied by rule: ${denyRule.id}`,
        matchedRule: denyRule,
      }
    }

    const allowRule = matchingRules.find((r) => r.action === 'allow')
    if (allowRule) {
      return {
        action: 'allow',
        reason: allowRule.description || `Allowed by rule: ${allowRule.id}`,
        matchedRule: allowRule,
      }
    }

    return null
  }

  /**
   * 简单 glob 匹配（P1 实现时可替换为 minimatch）
   * P0 阶段不使用此方法
   */
  private matchGlob(filePath: string, pattern: string): boolean {
    // 将 glob 转为正则：** → .*, * → [^/]*, ? → .
    const regexStr = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\{\{GLOBSTAR\}\}/g, '.*')
      .replace(/\?/g, '.')
    try {
      return new RegExp(`^${regexStr}$`).test(filePath)
    } catch {
      return false
    }
  }
}
```

### 3.4 修改文件：`src/api/services/ai/tools/executor.ts`

替换权限检查逻辑，从硬编码 `DANGEROUS_TOOLS` 改为 `PermissionEngine.evaluate()`。

**变更点（execute 方法开头）：**

```typescript
// ===== 旧代码（删除） =====
import { DANGEROUS_TOOLS, TOOL_PERMISSION_PREFIX } from '@shared/types/toolPermissions'
// ...
const allowAll = options.toolPermissions?.allowAll ?? false
const allowOnce = options.allowOnceTools?.includes(toolName) ?? false
const isDangerous = DANGEROUS_TOOLS.includes(toolName as any)

if (isDangerous && !allowAll && !allowOnce) {
  const payload = { kind: 'permission_request', toolName, toolCallId: options.toolCallId }
  return `${TOOL_PERMISSION_PREFIX}${JSON.stringify(payload)}`
}

// ===== 新代码（替换） =====
import { TOOL_PERMISSION_PREFIX } from '@shared/types/toolPermissions'
import { PermissionEngine } from '@shared/permissions/engine'

// 模块级单例
const permissionEngine = new PermissionEngine()

// execute 方法内：
const decision = permissionEngine.evaluate(toolName, input, {
  allowAll: options.toolPermissions?.allowAll ?? false,
  allowOnceTools: options.allowOnceTools,
  sessionApprovedTools: options.sessionApprovedTools,
  permissionRules: options.permissionRules,
})

if (decision.action === 'deny') {
  return `Error: Tool "${toolName}" was denied. ${decision.reason || ''}`
}

if (decision.action === 'ask') {
  const payload = {
    kind: 'permission_request',
    toolName,
    toolCallId: options.toolCallId,
  }
  return `${TOOL_PERMISSION_PREFIX}${JSON.stringify(payload)}`
}

// decision.action === 'allow' → 继续执行
```

**ToolExecutionOptions 接口扩展：**

```typescript
export interface ToolExecutionOptions {
  toolCallId?: string
  toolPermissions?: { allowAll: boolean }
  allowOnceTools?: string[]
  // P0 新增
  sessionApprovedTools?: Set<string>
  // P1 新增
  permissionRules?: PermissionRule[]
  // P2 预留
  hooks?: HooksConfig
  sandboxMode?: 'read-only' | 'workspace-write' | 'full-access'
}
```

---

## 4. P0 详细设计 — 审批粒度扩展

### 4.1 修改文件：`src/renderer/src/stores/chatStore.ts`

#### 4.1.1 新增 session 级审批状态

```typescript
// chatStore 接口新增字段
interface ChatStore {
  // ... 现有字段 ...

  // P0 新增：session 级已授权工具
  // key = conversationId, value = 已授权的工具名集合
  sessionApprovals: Record<string, string[]>

  // P0 新增 actions
  approveToolCall: (
    conversationId: string,
    toolName: string,
    scope: ApprovalScope  // 替换原来的 allowAll?: boolean
  ) => Promise<void>
  denyToolCall: (
    conversationId: string,
    toolName: string,
    toolCallId: string,
    reason?: string
  ) => Promise<void>
  getSessionApprovedTools: (conversationId: string) => string[]
}
```

#### 4.1.2 sessionApprovals 初始化

```typescript
export const useChatStore = create<ChatStore>((set, get) => ({
  // ... 现有状态 ...
  sessionApprovals: {},  // P0 新增

  // ... 现有 actions ...
}))
```

#### 4.1.3 approveToolCall 重构

```typescript
approveToolCall: async (conversationId, toolName, scope) => {
  const settingsState = useSettingsStore.getState()
  const workspacePath = useConversationStore.getState().getEffectiveWorkspace()
  const provider = settingsState.getCurrentProvider()
  const model = settingsState.getCurrentModel()

  if (!provider || !model) {
    set({ error: 'No provider or model selected' })
    return
  }
  if (!provider.apiKey) {
    set({ error: 'Provider API key missing' })
    return
  }

  // 根据 scope 处理授权
  switch (scope) {
    case 'once':
      // 不做额外存储，仅通过 allowOnceTools 传递
      break

    case 'session':
      // 存储到 sessionApprovals
      set((state) => {
        const current = state.sessionApprovals[conversationId] || []
        if (!current.includes(toolName)) {
          return {
            sessionApprovals: {
              ...state.sessionApprovals,
              [conversationId]: [...current, toolName],
            },
          }
        }
        return state
      })
      break

    case 'project':
      // P1 实现：写入 .muse/permissions.json
      // P0 阶段 fallback 到 session
      set((state) => {
        const current = state.sessionApprovals[conversationId] || []
        if (!current.includes(toolName)) {
          return {
            sessionApprovals: {
              ...state.sessionApprovals,
              [conversationId]: [...current, toolName],
            },
          }
        }
        return state
      })
      break

    case 'global':
      // P1 实现：写入 ~/.muse/permissions.json
      // P0 阶段 fallback 到 allowAll
      settingsState.setToolAllowAll(workspacePath ?? '', true)
      break
  }

  const aiConfig: AIConfig = {
    apiKey: provider.apiKey,
    model: model.modelId,
    baseURL: provider.baseURL || undefined,
    apiFormat: provider.apiFormat || 'chat-completions',
    temperature: settingsState.temperature,
    maxTokens: 4096,
    thinkingEnabled: settingsState.thinkingEnabled,
  }

  const message = `已允许工具: ${toolName}`

  await get().sendMessage(
    conversationId,
    message,
    provider.type,
    aiConfig,
    [],
    { allowOnceTools: [toolName] }
  )
},
```

#### 4.1.4 sendMessage 中自动合并 session 授权

在 `sendMessage` 方法中，发送 API 请求前自动合并 session 级授权：

```typescript
// sendMessage 方法内，构建 options 时：
const sessionTools = get().getSessionApprovedTools(conversationId)
const mergedAllowOnce = [
  ...(options?.allowOnceTools || []),
  ...sessionTools,
]

await apiClient.sendMessageStream(
  providerType,
  aiMessages,
  config,
  (chunk) => { /* ... */ },
  controller.signal,
  {
    toolPermissions,
    allowOnceTools: mergedAllowOnce.length > 0 ? mergedAllowOnce : undefined,
  }
)
```

#### 4.1.5 getSessionApprovedTools 实现

```typescript
getSessionApprovedTools: (conversationId: string) => {
  return get().sessionApprovals[conversationId] || []
},
```

### 4.2 修改文件：`src/renderer/src/components/chat/ToolCallCard.tsx`

#### 4.2.1 审批 UI 改为下拉菜单

将现有的三按钮（允许 / 允许所有 / 拒绝）替换为下拉菜单 + 拒绝按钮。

```tsx
// 新增状态
const [showApproveMenu, setShowApproveMenu] = useState(false)
const [showDenyInput, setShowDenyInput] = useState(false)
const [denyReason, setDenyReason] = useState('')

// 替换原有的 handleApprove
const handleApprove = async (scope: ApprovalScope) => {
  if (!currentConversationId || isLoading || isActioned) return
  setApprovalStatus('loading')
  setShowApproveMenu(false)
  try {
    await approveToolCall(currentConversationId, toolCall.name, scope)
    setApprovalStatus(scope === 'once' ? 'approved' : 'approvedAll')
  } catch {
    setApprovalStatus('idle')
  }
}

// 新增 handleDeny（调用 chatStore.denyToolCall）
const denyToolCall = useChatStore((state) => state.denyToolCall)

const handleDeny = async () => {
  if (!currentConversationId || isLoading || isActioned) return
  setApprovalStatus('loading')
  setShowDenyInput(false)
  try {
    await denyToolCall(
      currentConversationId,
      toolCall.name,
      toolCall.id,
      denyReason || undefined
    )
    setApprovalStatus('denied')
  } catch {
    setApprovalStatus('idle')
  }
}
```

#### 4.2.2 审批按钮 JSX 结构

```tsx
{showButtons && !isActioned && (
  <div className="flex flex-wrap gap-2 relative">
    {/* 允许下拉菜单 */}
    <div className="relative">
      <button
        onClick={() => setShowApproveMenu(!showApproveMenu)}
        disabled={isLoading}
        className={cn(
          'text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors',
          isLoading
            ? 'bg-[hsl(var(--surface-2))] opacity-60 cursor-not-allowed'
            : 'bg-[hsl(var(--surface-2))] hover:bg-[hsl(var(--surface-3))]'
        )}
      >
        {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
        允许
        <ChevronDown className="w-3 h-3" />
      </button>

      {showApproveMenu && (
        <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-md z-10 min-w-[160px]">
          <button
            onClick={() => handleApprove('once')}
            className="w-full text-left text-xs px-3 py-1.5 hover:bg-accent"
          >
            允许本次
          </button>
          <button
            onClick={() => handleApprove('session')}
            className="w-full text-left text-xs px-3 py-1.5 hover:bg-accent"
          >
            允许本次对话
          </button>
          {/* P1 阶段启用以下选项 */}
          {/* <button onClick={() => handleApprove('project')} ...>允许此项目</button> */}
          {/* <button onClick={() => handleApprove('global')} ...>允许全局</button> */}
        </div>
      )}
    </div>

    {/* 拒绝按钮 */}
    <button
      onClick={() => setShowDenyInput(!showDenyInput)}
      disabled={isLoading}
      className={cn(
        'text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors',
        isLoading
          ? 'text-muted-foreground opacity-60 cursor-not-allowed'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      拒绝
    </button>

    {/* 拒绝原因输入框 */}
    {showDenyInput && (
      <div className="w-full mt-1 flex gap-1">
        <input
          type="text"
          value={denyReason}
          onChange={(e) => setDenyReason(e.target.value)}
          placeholder="拒绝原因（可选）"
          className="flex-1 text-xs px-2 py-1 rounded border border-border bg-background"
          onKeyDown={(e) => e.key === 'Enter' && handleDeny()}
        />
        <button
          onClick={handleDeny}
          className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20"
        >
          确认拒绝
        </button>
      </div>
    )}
  </div>
)}
```

#### 4.2.3 点击外部关闭下拉菜单

```tsx
// 在组件内添加 useEffect 监听点击外部关闭
useEffect(() => {
  if (!showApproveMenu) return
  const handleClickOutside = () => setShowApproveMenu(false)
  document.addEventListener('click', handleClickOutside)
  return () => document.removeEventListener('click', handleClickOutside)
}, [showApproveMenu])
```

---

## 5. P0 详细设计 — 拒绝反馈

### 5.1 修改文件：`src/renderer/src/stores/chatStore.ts` — denyToolCall

```typescript
denyToolCall: async (conversationId, toolName, toolCallId, reason?) => {
  const settingsState = useSettingsStore.getState()
  const provider = settingsState.getCurrentProvider()
  const model = settingsState.getCurrentModel()

  if (!provider || !model) {
    set({ error: 'No provider or model selected' })
    return
  }
  if (!provider.apiKey) {
    set({ error: 'Provider API key missing' })
    return
  }

  const denyMessage = reason
    ? `[Tool Denied] The user denied the "${toolName}" tool call (ID: ${toolCallId}). Reason: ${reason}. Please adjust your approach.`
    : `[Tool Denied] The user denied the "${toolName}" tool call (ID: ${toolCallId}). Please try a different approach or ask the user for guidance.`

  const aiConfig: AIConfig = {
    apiKey: provider.apiKey,
    model: model.modelId,
    baseURL: provider.baseURL || undefined,
    apiFormat: provider.apiFormat || 'chat-completions',
    temperature: settingsState.temperature,
    maxTokens: 4096,
    thinkingEnabled: settingsState.thinkingEnabled,
  }

  // 发送 deny 消息作为用户消息，触发 AI 继续对话
  await get().sendMessage(
    conversationId,
    denyMessage,
    provider.type,
    aiConfig
  )
},
```

### 5.2 系统提示词补充

在 `chatStore.ts` 的 `systemPrompt` 字符串中追加以下段落：

```typescript
// 在 systemPrompt 的 "## Tool Error Handling" 之后追加：

## Tool Permission Handling
- When a tool call is denied, you will receive a [Tool Denied] message
- Read the denial reason carefully and adjust your strategy
- Suggest alternative approaches to the user
- Do NOT retry the same tool call that was denied
- If you need the denied operation, explain why and ask the user to reconsider
```

**具体变更位置**：`chatStore.ts` 第 224 行附近，在 `${skillsSection}` 之前插入。

---

## 6. P1 详细设计 — 规则引擎

### 6.1 规则匹配已在 `PermissionEngine` 中实现

见 §3.3 中 `engine.ts` 的 `matchRules()` 方法。P1 阶段需要：

1. 将 `matchGlob()` 替换为 `minimatch` 库（需新增依赖）
2. 在 `executor.ts` 的 `options` 中传入从配置文件加载的规则

### 6.2 API 层传递规则

#### 6.2.1 修改 `src/shared/types/ai.ts`

```typescript
// AIRequestOptions 扩展
export interface AIRequestOptions {
  toolPermissions?: ToolPermissionState
  allowOnceTools?: string[]
  // P1 新增
  permissionRules?: PermissionRule[]
  sessionApprovedTools?: string[]  // 序列化为数组传输
}
```

#### 6.2.2 修改 `src/api/routes/chat.ts`

```typescript
// ChatRequest 接口扩展
interface ChatRequest {
  provider: string
  messages: AIMessage[]
  config: AIConfig
  toolPermissions?: AIRequestOptions['toolPermissions']
  allowOnceTools?: AIRequestOptions['allowOnceTools']
  // P1 新增
  permissionRules?: PermissionRule[]
  sessionApprovedTools?: string[]
}

// 在 /chat/stream 和 /chat 路由中传递新字段
const { provider, messages, config, toolPermissions, allowOnceTools,
        permissionRules, sessionApprovedTools } = body

// 传递给 aiManager
await aiManager.sendMessage(provider, messages, config, onChunk, {
  toolPermissions,
  allowOnceTools,
  permissionRules,
  sessionApprovedTools,
})
```

#### 6.2.3 修改 `src/api/services/ai/manager.ts`

`AIManager.sendMessage` 已经透传 `options`，无需修改。但各 provider 的 `sendMessage` 需要将 `options` 传递给 `ToolExecutor`。

**变更点**：在各 provider（如 `claude.ts`, `openai.ts` 等）调用 `toolExecutor.execute()` 时，将 `options` 中的新字段传入：

```typescript
// 在 provider 的 tool execution 逻辑中：
const result = await toolExecutor.execute(toolCall.name, toolCall.input, {
  toolCallId: toolCall.id,
  toolPermissions: options?.toolPermissions,
  allowOnceTools: options?.allowOnceTools,
  // P1 新增
  sessionApprovedTools: options?.sessionApprovedTools
    ? new Set(options.sessionApprovedTools)
    : undefined,
  permissionRules: options?.permissionRules,
})
```

---

## 7. P1 详细设计 — 配置分层

### 7.1 新增文件：`src/main/services/permissionFileService.ts`

负责读写和监听 `.muse/permissions.json` 和 `~/.muse/permissions.json`。

```typescript
// src/main/services/permissionFileService.ts

import fs from 'fs'
import path from 'path'
import os from 'os'
import type { PermissionConfig, PermissionRule } from '@shared/types/toolPermissions'

const GLOBAL_DIR = path.join(os.homedir(), '.muse')
const GLOBAL_FILE = path.join(GLOBAL_DIR, 'permissions.json')
const PROJECT_DIR_NAME = '.muse'
const PROJECT_FILE_NAME = 'permissions.json'

export class PermissionFileService {
  private watchers: fs.FSWatcher[] = []
  private onChangeCallback?: () => void

  /**
   * 加载并合并 global + project 规则
   */
  loadRules(workspacePath?: string): PermissionRule[] {
    const globalRules = this.loadFile(GLOBAL_FILE, 'global')
    const projectRules = workspacePath
      ? this.loadFile(
          path.join(workspacePath, PROJECT_DIR_NAME, PROJECT_FILE_NAME),
          'project'
        )
      : []
    return [...projectRules, ...globalRules]
  }

  /**
   * 添加规则到指定级别的配置文件
   */
  addRule(
    rule: Omit<PermissionRule, 'source'>,
    source: 'project' | 'global',
    workspacePath?: string
  ): void {
    const filePath = source === 'global'
      ? GLOBAL_FILE
      : path.join(workspacePath || '', PROJECT_DIR_NAME, PROJECT_FILE_NAME)

    const config = this.readConfigFile(filePath)
    config.rules.push(rule)
    this.writeConfigFile(filePath, config)
  }

  /**
   * 删除规则
   */
  removeRule(
    ruleId: string,
    source: 'project' | 'global',
    workspacePath?: string
  ): void {
    const filePath = source === 'global'
      ? GLOBAL_FILE
      : path.join(workspacePath || '', PROJECT_DIR_NAME, PROJECT_FILE_NAME)

    const config = this.readConfigFile(filePath)
    config.rules = config.rules.filter((r) => r.id !== ruleId)
    this.writeConfigFile(filePath, config)
  }

  /**
   * 监听配置文件变更
   */
  watch(workspacePath: string | undefined, onChange: () => void): void {
    this.stopWatch()
    this.onChangeCallback = onChange

    // Watch global file
    this.watchFile(GLOBAL_FILE)

    // Watch project file
    if (workspacePath) {
      const projectFile = path.join(
        workspacePath, PROJECT_DIR_NAME, PROJECT_FILE_NAME
      )
      this.watchFile(projectFile)
    }
  }

  stopWatch(): void {
    this.watchers.forEach((w) => w.close())
    this.watchers = []
  }

  // --- private helpers ---

  private loadFile(filePath: string, source: 'project' | 'global'): PermissionRule[] {
    const config = this.readConfigFile(filePath)
    return config.rules.map((r) => ({ ...r, source }))
  }

  private readConfigFile(filePath: string): PermissionConfig {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(content) as PermissionConfig
      if (parsed.version !== 1 || !Array.isArray(parsed.rules)) {
        return { version: 1, rules: [] }
      }
      return parsed
    } catch {
      return { version: 1, rules: [] }
    }
  }

  private writeConfigFile(filePath: string, config: PermissionConfig): void {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
  }

  private watchFile(filePath: string): void {
    try {
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) return

      const watcher = fs.watch(dir, (eventType, filename) => {
        if (filename === path.basename(filePath)) {
          this.onChangeCallback?.()
        }
      })
      this.watchers.push(watcher)
    } catch {
      // Ignore watch errors (directory may not exist)
    }
  }
}
```

### 7.2 新增 IPC Handlers：`src/main/index.ts`

```typescript
import { PermissionFileService } from './services/permissionFileService'

const permissionFileService = new PermissionFileService()

ipcMain.handle('permissions:load', async (_event, { workspacePath }) => {
  return permissionFileService.loadRules(workspacePath)
})

ipcMain.handle('permissions:addRule', async (_event, { rule, source, workspacePath }) => {
  permissionFileService.addRule(rule, source, workspacePath)
  return { success: true }
})

ipcMain.handle('permissions:removeRule', async (_event, { ruleId, source, workspacePath }) => {
  permissionFileService.removeRule(ruleId, source, workspacePath)
  return { success: true }
})
```

### 7.3 修改 Preload：`src/preload/index.ts`

```typescript
// 在 api 对象中新增 permissions 命名空间
permissions: {
  load: (workspacePath?: string) =>
    ipcRenderer.invoke('permissions:load', { workspacePath }),
  addRule: (rule: any, source: string, workspacePath?: string) =>
    ipcRenderer.invoke('permissions:addRule', { rule, source, workspacePath }),
  removeRule: (ruleId: string, source: string, workspacePath?: string) =>
    ipcRenderer.invoke('permissions:removeRule', { ruleId, source, workspacePath }),
},
```

---

## 8. P2 接口预留

### 8.1 Hooks 系统接口

P2 不做实现，仅在类型和配置文件格式中预留接口。

已在 `src/shared/types/toolPermissions.ts` 中定义：
- `HookDefinition` 接口
- `HooksConfig` 接口

已在 `ToolExecutionOptions` 中预留：
- `hooks?: HooksConfig`

已在 `PermissionConfig` 中预留：
- `hooks?: HooksConfig`

### 8.2 沙箱模式接口

已在 `ToolExecutionOptions` 中预留：
- `sandboxMode?: 'read-only' | 'workspace-write' | 'full-access'`

### 8.3 P2 实现时的扩展点

| 扩展点 | 文件 | 说明 |
|--------|------|------|
| Hook 执行器 | `src/shared/permissions/hooks.ts` (新增) | 执行 PreToolUse/PostToolUse 脚本 |
| Hook 集成 | `executor.ts` | 在 execute() 中调用 hook 执行器 |
| 沙箱执行 | `executor.ts` → `executeCommand()` | 在 Bash 执行前应用沙箱策略 |

---

## 9. 数据流与时序图

### 9.1 P0 — 工具调用权限检查时序

```
用户发送消息
  │
  ▼
chatStore.sendMessage()
  │ 合并 sessionApprovedTools 到 options
  ▼
apiClient.sendMessageStream(options)
  │
  ▼
chat.ts route → aiManager.sendMessage()
  │
  ▼
provider.sendMessage() → AI 返回 tool_use
  │
  ▼
toolExecutor.execute(toolName, input, options)
  │
  ▼
permissionEngine.evaluate(toolName, input, options)
  │
  ├─ safe → 直接执行工具 → 返回结果给 AI
  │
  ├─ allow (session/allowOnce/allowAll) → 直接执行工具
  │
  └─ ask → 返回 __tool_permission__:{...}
       │
       ▼
     前端 ToolCallCard 解析 permission_request
       │
       ├─ 用户点击"允许本次" → approveToolCall(convId, tool, 'once')
       │    → sendMessage(allowOnceTools: [tool])
       │
       ├─ 用户点击"允许本次对话" → approveToolCall(convId, tool, 'session')
       │    → 存储到 sessionApprovals[convId]
       │    → sendMessage(allowOnceTools: [tool])
       │
       └─ 用户点击"拒绝" → denyToolCall(convId, tool, id, reason?)
            → sendMessage("[Tool Denied] ...")
            → AI 收到拒绝消息，调整策略
```

### 9.2 P1 — 规则加载与匹配时序

```
应用启动 / workspace 切换
  │
  ▼
main/index.ts: permissionFileService.loadRules(workspacePath)
  │ 读取 ~/.muse/permissions.json (global)
  │ 读取 <workspace>/.muse/permissions.json (project)
  │ 合并规则，标记 source
  ▼
permissionFileService.watch(workspacePath, onChange)
  │ fs.watch 监听文件变更
  │ 变更时自动重新加载
  ▼
renderer 通过 IPC 获取规则:
  window.api.permissions.load(workspacePath)
  │
  ▼
chatStore.sendMessage() 时将规则传入 options.permissionRules
  │
  ▼
executor → engine.evaluate() → matchRules()
  │ deny 优先于 allow
  │ 无匹配则走默认审批流程
  ▼
返回 PermissionDecision
```

---

## 10. 向后兼容策略

### 10.1 具体实现

| 现有功能 | 兼容方式 | 代码位置 |
|----------|----------|----------|
| `DANGEROUS_TOOLS` 导出 | 保留，标记 `@deprecated` | `toolPermissions.ts` |
| `DangerousToolName` 类型 | 保留，标记 `@deprecated` | `toolPermissions.ts` |
| `allowAll: boolean` | `PermissionEngine.evaluate()` 第 5 步检查 | `engine.ts` |
| `allowOnceTools` | `PermissionEngine.evaluate()` 第 3 步检查 | `engine.ts` |
| `TOOL_PERMISSION_PREFIX` | 保留不变，permission_request 协议不变 | `toolPermissions.ts` |
| `toolPermissionsByWorkspace` | localStorage 持久化保留，settingsStore 不变 | `settingsStore.ts` |
| `approveToolCall(convId, tool, allowAll?)` | 旧签名调用方 fallback：`allowAll=true` 映射为 `scope='global'` | `chatStore.ts` |

### 10.2 approveToolCall 签名兼容

```typescript
// 新签名
approveToolCall: (conversationId: string, toolName: string, scope: ApprovalScope) => Promise<void>

// 如果有外部代码使用旧签名 approveToolCall(id, name, true)，
// TypeScript 会报类型错误（boolean vs ApprovalScope），
// 这是期望的行为，强制调用方迁移。
// ToolCallCard.tsx 是唯一的调用方，会在 P0 中同步修改。
```

### 10.3 迁移检查清单

- [ ] `executor.ts` 中 `DANGEROUS_TOOLS` import 替换为 `PermissionEngine`
- [ ] `ToolCallCard.tsx` 中 `approveToolCall` 调用签名更新
- [ ] `chatStore.ts` 中 `approveToolCall` 参数从 `allowAll` 改为 `scope`
- [ ] 确认 `settingsStore.ts` 的 `toolPermissionsByWorkspace` 不受影响
- [ ] 确认 `TOOL_PERMISSION_PREFIX` 协议不变

---

## 11. 完整类型定义

所有新增类型已在以下文件中定义，此处汇总索引：

| 类型 | 文件 | 优先级 |
|------|------|--------|
| `ToolRiskLevel` | `toolPermissions.ts` + `classifier.ts` | P0 |
| `ApprovalScope` | `toolPermissions.ts` | P0 |
| `RuleAction` | `toolPermissions.ts` | P1 |
| `RuleSource` | `toolPermissions.ts` | P1 |
| `RuleMatch` | `toolPermissions.ts` | P1 |
| `PermissionRule` | `toolPermissions.ts` | P1 |
| `PermissionConfig` | `toolPermissions.ts` | P1 |
| `PermissionDecision` | `toolPermissions.ts` | P0 |
| `HookDefinition` | `toolPermissions.ts` | P2 预留 |
| `HooksConfig` | `toolPermissions.ts` | P2 预留 |
| `PermissionEvaluateOptions` | `engine.ts` | P0 |
| `ToolExecutionOptions` (扩展) | `executor.ts` | P0 |
| `AIRequestOptions` (扩展) | `ai.ts` | P1 |

---

## 12. 文件变更清单

### 12.1 P0 新增文件

| 文件 | 说明 |
|------|------|
| `src/shared/permissions/classifier.ts` | 工具分类与 Bash 命令动态分类 |
| `src/shared/permissions/engine.ts` | PermissionEngine 核心逻辑（P1 扩展规则匹配） |

### 12.2 P0 修改文件

| 文件 | 变更内容 |
|------|----------|
| `src/shared/types/toolPermissions.ts` | 新增类型定义，保留旧导出标记 @deprecated |
| `src/api/services/ai/tools/executor.ts` | 权限检查逻辑替换为 engine.evaluate()，扩展 ToolExecutionOptions |
| `src/renderer/src/stores/chatStore.ts` | 新增 sessionApprovals、denyToolCall、scope 参数、系统提示词补充 |
| `src/renderer/src/components/chat/ToolCallCard.tsx` | 审批 UI 改为下拉菜单 + 拒绝原因输入 |

### 12.3 P1 新增文件

| 文件 | 说明 |
|------|------|
| `src/main/services/permissionFileService.ts` | 配置文件读写与 fs.watch 监听 |

### 12.4 P1 修改文件

| 文件 | 变更内容 |
|------|----------|
| `src/shared/types/ai.ts` | AIRequestOptions 扩展 permissionRules、sessionApprovedTools |
| `src/api/routes/chat.ts` | ChatRequest 扩展，传递 permissionRules 和 sessionApprovedTools |
| `src/main/index.ts` | 新增 permissions:load/addRule/removeRule IPC handlers |
| `src/preload/index.ts` | 暴露 permissions API 命名空间 |
| `src/renderer/src/components/chat/ToolCallCard.tsx` | 启用"允许此项目"和"允许全局"下拉选项 |
| `src/renderer/src/stores/settingsStore.ts` | 可选：新增 loadPermissionRules action |

### 12.5 P2 新增文件（仅接口预留）

| 文件 | 说明 |
|------|------|
| `src/shared/permissions/hooks.ts` | Hook 执行器（P2 实现时新增） |

---

## 13. BDD 验收标准

从 PRD 继承全部 BDD 场景，并补充以下详细设计级别的验收标准。

### 13.1 P0 — classifyTool 单元测试验收

```gherkin
Feature: classifyTool 工具分类函数
  作为开发者
  我希望 classifyTool 正确分类所有工具
  以便权限引擎做出正确决策

  Scenario Outline: 静态工具分类
    When 调用 classifyTool("<toolName>")
    Then 返回 "<level>"

    Examples:
      | toolName    | level     |
      | Read        | safe      |
      | LS          | safe      |
      | Glob        | safe      |
      | Grep        | safe      |
      | GitStatus   | safe      |
      | GitDiff     | safe      |
      | GitLog      | safe      |
      | WebFetch    | safe      |
      | WebSearch   | safe      |
      | TodoWrite   | safe      |
      | Write       | moderate  |
      | Edit        | moderate  |
      | GitCommit   | dangerous |
      | GitPush     | dangerous |
      | GitCheckout | dangerous |

  Scenario: 未知工具默认 moderate
    When 调用 classifyTool("UnknownMCPTool")
    Then 返回 "moderate"
```

### 13.2 P0 — classifyBashCommand 单元测试验收

```gherkin
Feature: classifyBashCommand Bash 命令分类
  作为开发者
  我希望 Bash 命令按安全性正确分类

  Scenario Outline: 安全 Bash 命令
    When 调用 classifyBashCommand("<command>")
    Then 返回 "safe"

    Examples:
      | command              |
      | ls                   |
      | ls -la               |
      | pwd                  |
      | cat src/index.ts     |
      | git status           |
      | git log --oneline    |
      | npm test             |
      | grep -r "TODO" src/  |
      | echo hello           |
      | node --version       |

  Scenario Outline: 危险 Bash 命令
    When 调用 classifyBashCommand("<command>")
    Then 返回 "dangerous"

    Examples:
      | command                    |
      | rm -rf /tmp/test           |
      | sudo apt install curl      |
      | git push origin main       |
      | git commit -m "test"       |
      | npm install lodash         |
      | kill -9 1234               |
      | chmod 777 /tmp/file        |

  Scenario Outline: 中等风险 Bash 命令
    When 调用 classifyBashCommand("<command>")
    Then 返回 "moderate"

    Examples:
      | command              |
      | python3 script.py    |
      | node server.js       |
      | docker run ubuntu    |

  Scenario: sed -n 安全但 sed -i 不安全
    When 调用 classifyBashCommand("sed -n '1,10p' file.txt")
    Then 返回 "safe"
    When 调用 classifyBashCommand("sed -i 's/old/new/g' file.txt")
    Then 返回 "moderate"
```

### 13.3 P0 — PermissionEngine.evaluate 单元测试验收

```gherkin
Feature: PermissionEngine.evaluate 权限评估

  Scenario: safe 工具无需任何授权
    Given 无任何授权设置
    When evaluate("Read", {})
    Then 返回 { action: 'allow' }

  Scenario: moderate 工具无授权时需要审批
    Given 无任何授权设置
    When evaluate("Write", { path: "test.ts" })
    Then 返回 { action: 'ask' }

  Scenario: allowOnce 授权放行
    Given allowOnceTools = ["Write"]
    When evaluate("Write", { path: "test.ts" })
    Then 返回 { action: 'allow' }

  Scenario: session 授权放行
    Given sessionApprovedTools = Set(["Edit"])
    When evaluate("Edit", { path: "test.ts" })
    Then 返回 { action: 'allow' }

  Scenario: allowAll 放行所有
    Given allowAll = true
    When evaluate("GitPush", )
    Then 返回 { action: 'allow' }
```

### 13.4 P0 — 拒绝反馈集成验收

```gherkin
Feature: 拒绝反馈集成
  作为开发者
  我希望 denyToolCall 正确发送拒绝消息给 AI

  Scenario: denyToolCall 无原因
    Given 当前对话 ID 为 "conv-1"
    When 调用 denyToolCall("conv-1", "Bash", "tc-1")
    Then 调用 sendMessage 发送包含 "[Tool Denied]" 和 "Bash" 的消息
    And 消息包含 "Please try a different approach"

  Scenario: denyToolCall 带原因
    Given 当前对话 ID 为 "conv-1"
    When 调用 denyToolCall("conv-1", "Write", "tc-2", "不要修改配置文件")
    Then 调用 sendMessage 发送包含 "[Tool Denied]" 和 "不要修改配置文件" 的消息

  Scenario: 系统提示词包含 Tool Permission Handling
    When chatStore 构建 systemPrompt
    Then systemPrompt 包含 "## Tool Permission Handling"
    And systemPrompt 包含 "Do NOT retry the same tool call that was denied"
```

### 13.5 P0 — 审批 UI 验收

```gherkin
Feature: 审批 UI 下拉菜单
  作为 Muse 用户
  我希望审批 UI 提供多级选项

  Scenario: 下拉菜单显示
    Given ToolCallCard 显示 permission_request
    When 用户点击"允许"按钮
    Then 展开下拉菜单，包含"允许本次"和"允许本次对话"

  Scenario: 拒绝输入框显示
    Given ToolCallCard 显示 permission_request
    When 用户点击"拒绝"按钮
    Then 展开拒绝原因输入框和"确认拒绝"按钮

  Scenario: 点击外部关闭下拉菜单
    Given 下拉菜单已展开
    When 用户点击菜单外部区域
    Then 下拉菜单关闭
```

### 13.6 P1 — 规则引擎验收

```gherkin
Feature: PermissionEngine 规则匹配

  Scenario: commandPrefix allow 规则匹配
    Given permissionRules 包含 allow Bash match commandPrefix "npm test"
    When evaluate("Bash", { command: "npm test -- --coverage" })
    Then 返回 { action: 'allow' }

  Scenario: pathGlob allow 规则匹配
    Given permissionRules 包含 allow Edit match pathGlob "src/**/*.ts"
    When evaluate("Edit", { path: "src/utils/helper.ts" })
    Then 返回 { action: 'allow' }

  Scenario: deny 优先于 allow
    Given permissionRules 包含 allow Edit 和 deny Edit match pathGlob "*.config.*"
    When evaluate("Edit", { path: "vite.config.ts" })
    Then 返回 { action: 'deny' }

  Scenario: 无匹配规则走默认
    Given permissionRules 包含 allow Bash match commandPrefix "npm test"
    When evaluate("Bash", { command: "python3 script.py" })
    Then 返回 { action: 'ask' }
```

### 13.7 P1 — 配置文件验收

```gherkin
Feature: 配置文件读写

  Scenario: 加载不存在的配置文件
    Given .muse/permissions.json 不存在
    When 调用 loadRules(workspacePath)
    Then 返回空规则列表

  Scenario: 加载有效配置文件
    Given .muse/permissions.json 包含 2 条规则
    And ~/.muse/permissions.json 包含 1 条规则
    When 调用 loadRules(workspacePath)
    Then 返回 3 条规则，project 规则在前

  Scenario: 添加规则到 project 级
    When 调用 addRule(rule, 'project', workspacePath)
    Then .muse/permissions.json 包含新规则

  Scenario: 文件变更自动重载
    Given 已调用 watch(workspacePath, onChange)
    When 外部修改 .muse/permissions.json
    Then onChange 回调被触发
```

### 13.8 向后兼容验收（继承自 PRD §8.7）

PRD 中的向后兼容 BDD 场景全部继承，不做修改。

---

## 附录：PRD 修正建议汇总

| # | PRD 原文 | 修正建议 | 影响范围 |
|---|----------|----------|----------|
| 1 | P0 审批 UI 包含 project/global 选项 | P0 仅实现 once/session，P1 启用 project/global | §3.2.2, ToolCallCard |
| 2 | `sed -n` 归为安全命令 | 增加 `-i` 参数检查，含 `-i` 则为 moderate | §3.1.2, classifier.ts |
| 3 | `npm test` 归为安全 | 保留设计，增加风险注释 | §3.1.2, classifier.ts |
| 4 | session 授权传递路径未明确 | sendMessage 自动合并 sessionApprovals | §4.1.4, chatStore.ts |

---

> Design Document End
> 下一步：交由开发者按此文档实现 P0 和 P1

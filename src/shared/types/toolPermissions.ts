// ============ 向后兼容（@deprecated） ============

/** @deprecated 使用 classifyTool() 替代 */
export const DANGEROUS_TOOLS = [
  'Bash',
  'Write',
  'Edit',
  'GitCommit',
  'GitPush',
  'GitCheckout',
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
  hooks?: HooksConfig // P2 预留
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

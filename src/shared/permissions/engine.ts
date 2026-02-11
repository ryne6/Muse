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

// src/shared/permissions/classifier.ts

import type { ToolRiskLevel } from '../types/toolPermissions'

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
  'cat ',
  'head ',
  'tail ',
  'less ',
  'wc ',
  // 目录浏览
  'ls ',
  'ls\t',
  'pwd',
  'find ',
  'tree ',
  // 搜索
  'grep ',
  'rg ',
  'ag ',
  'ack ',
  // Git 只读
  'git status',
  'git log',
  'git diff',
  'git branch',
  'git show',
  'git blame',
  'git stash list',
  // 包管理只读
  'npm list',
  'npm ls',
  'npm outdated',
  'npm view',
  'yarn list',
  'yarn info',
  'yarn why',
  'pnpm list',
  'pnpm ls',
  'pnpm why',
  'bun pm ls',
  // 构建/测试
  'npm test',
  'npm run test',
  'npm run lint',
  'npm run check',
  'yarn test',
  'yarn lint',
  'pnpm test',
  'bun test',
  'npx tsc --noEmit',
  'npx eslint',
  // 系统信息
  'which ',
  'where ',
  'whoami',
  'uname',
  'env',
  'node --version',
  'npm --version',
  'python --version',
  // 文本处理（只读）
  'echo ',
  'printf ',
  'sort ',
  'uniq ',
  'cut ',
  'tr ',
  'awk ',
  'jq ',
  // 注意：sed -n 需要额外检查，不在此列表中
]

const SAFE_BASH_EXACT = [
  'ls',
  'pwd',
  'whoami',
  'date',
  'uname',
  'git status',
  'git branch',
  'git log',
]

/**
 * Bash 危险命令正则黑名单
 */
const DANGEROUS_BASH_PATTERNS: RegExp[] = [
  // 删除操作
  /\brm\s/,
  /\brmdir\s/,
  // 权限修改
  /\bchmod\s/,
  /\bchown\s/,
  // 系统操作
  /\bsudo\s/,
  /\bsu\s/,
  // 网络写操作
  /\bcurl\s.*(-X|--request)\s*(POST|PUT|DELETE|PATCH)/,
  /\bwget\s/,
  // 进程操作
  /\bkill\s/,
  /\bkillall\s/,
  // 包安装
  /\bnpm install/,
  /\bnpm i\s/,
  /\byarn add/,
  /\bpnpm add/,
  /\bbun add/,
  /\bpip install/,
  /\bbrew install/,
  // Git 写操作
  /\bgit push/,
  /\bgit commit/,
  /\bgit checkout/,
  /\bgit reset/,
  /\bgit rebase/,
  /\bgit merge/,
  /\bgit stash (drop|pop|clear)/,
  // 危险重定向
  />\s*\//, // 写入绝对路径
  /\|\s*tee\s/,
]

/**
 * Split a compound command into sub-commands (handles &&, ||, ;, |)
 * Returns the individual commands for separate classification.
 */
function splitCompoundCommand(command: string): string[] {
  // Split on &&, ||, ;, | but not inside quotes
  // Simple approach: split on operators, trim each part
  return command
    .split(/\s*(?:&&|\|\||[;|])\s*/)
    .map(s => s.trim())
    .filter(Boolean)
}

/**
 * Classify a single (non-compound) Bash command
 */
function classifySingleCommand(trimmed: string): ToolRiskLevel {
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
      return 'safe'
    }
  }

  // 4. 特殊处理：sed -n
  if (trimmed.startsWith('sed -n') || trimmed.startsWith('sed -n ')) {
    if (/\s-i\b/.test(trimmed)) {
      return 'moderate'
    }
    return 'safe'
  }

  // 5. 默认 moderate
  return 'moderate'
}

const RISK_ORDER: Record<ToolRiskLevel, number> = {
  safe: 0,
  moderate: 1,
  dangerous: 2,
}

/**
 * 对 Bash 命令进行动态风险分类
 * Handles compound commands (&&, ||, ;, |) by classifying each
 * sub-command and returning the highest risk level.
 */
export function classifyBashCommand(command: string): ToolRiskLevel {
  const trimmed = command.trim()
  if (!trimmed) return 'moderate'

  const parts = splitCompoundCommand(trimmed)
  if (parts.length <= 1) {
    return classifySingleCommand(trimmed)
  }

  // Return the highest risk level across all sub-commands
  let maxRisk: ToolRiskLevel = 'safe'
  for (const part of parts) {
    const risk = classifySingleCommand(part)
    if (RISK_ORDER[risk] > RISK_ORDER[maxRisk]) {
      maxRisk = risk
    }
    if (maxRisk === 'dangerous') break // early exit
  }
  return maxRisk
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

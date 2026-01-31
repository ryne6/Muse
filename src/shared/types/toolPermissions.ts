export const DANGEROUS_TOOLS = [
  'Bash',
  'Write',
  'Edit',
  'GitCommit',
  'GitPush',
  'GitCheckout',
] as const

export type DangerousToolName = typeof DANGEROUS_TOOLS[number]

export interface ToolPermissionState {
  allowAll: boolean
}

export interface PermissionRequestPayload {
  kind: 'permission_request'
  toolName: string
  toolCallId?: string
}

export const TOOL_PERMISSION_PREFIX = '__tool_permission__:'

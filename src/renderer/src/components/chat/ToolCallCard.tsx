import { useState } from 'react'
import {
  FileText,
  FilePlus,
  FileEdit,
  Folder,
  Wrench,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Terminal,
  ListTodo,
} from 'lucide-react'
import type { ToolCall, ToolResult } from '@shared/types/conversation'
import type { PermissionRequestPayload } from '@shared/types/toolPermissions'
import { TOOL_PERMISSION_PREFIX } from '@shared/types/toolPermissions'
import { cn } from '@/utils/cn'
import { useChatStore } from '@/stores/chatStore'
import { useConversationStore } from '@/stores/conversationStore'

function parsePermissionRequest(output?: string): PermissionRequestPayload | null {
  if (!output?.startsWith(TOOL_PERMISSION_PREFIX)) return null
  const raw = output.slice(TOOL_PERMISSION_PREFIX.length)
  try {
    const parsed = JSON.parse(raw) as PermissionRequestPayload
    if (parsed?.kind === 'permission_request' && typeof parsed.toolName === 'string') {
      return parsed
    }
  } catch {
    return null
  }
  return null
}

interface ToolCallCardProps {
  toolCall: ToolCall
  toolResult?: ToolResult
}

const TOOL_ICONS: Record<string, React.ReactNode> = {
  Read: <FileText className="w-4 h-4" />,
  Write: <FilePlus className="w-4 h-4" />,
  Edit: <FileEdit className="w-4 h-4" />,
  LS: <Folder className="w-4 h-4" />,
  Bash: <Terminal className="w-4 h-4" />,
  TodoWrite: <ListTodo className="w-4 h-4" />,
}

export function ToolCallCard({ toolCall, toolResult }: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const approveToolCall = useChatStore((state) => state.approveToolCall)
  const currentConversationId = useConversationStore((state) => state.currentConversationId)

  const rawPermissionRequest = toolResult?.output?.startsWith(TOOL_PERMISSION_PREFIX) ?? false
  const permissionRequest = parsePermissionRequest(toolResult?.output)
  const isPermissionRequest = rawPermissionRequest

  const status: 'pending' | 'success' | 'error' = !toolResult
    ? 'pending'
    : isPermissionRequest
      ? 'pending'
      : toolResult.isError
        ? 'error'
        : 'success'

  const icon = TOOL_ICONS[toolCall.name] || <Wrench className="w-4 h-4" />

  const statusIcon = {
    pending: <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />,
    success: <CheckCircle2 className="w-4 h-4 text-muted-foreground" />,
    error: <XCircle className="w-4 h-4 text-destructive" />,
  }[status]

  const borderColor = {
    pending: 'border-border',
    success: 'border-border',
    error: 'border-destructive/50',
  }[status]

  const bgColor = {
    pending: 'bg-background',
    success: 'bg-background',
    error: 'bg-destructive/5',
  }[status]

  // 格式化输入参数
  const renderInput = () => {
    return Object.entries(toolCall.input).map(([key, value]) => (
      <div key={key} className="flex gap-2">
        <span className="text-muted-foreground font-mono text-xs">{key}:</span>
        <span className="font-mono text-xs">
          {typeof value === 'string'
            ? `"${value}"`
            : JSON.stringify(value, null, 2)}
        </span>
      </div>
    ))
  }

  // 格式化输出结果
  const renderOutput = () => {
    if (!toolResult) return null

    if (isPermissionRequest) {
      const canApprove = Boolean(currentConversationId)
      const showButtons = Boolean(permissionRequest && canApprove)

      return (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {permissionRequest
              ? '此工具需要权限才能运行。'
              : '需要权限，但请求无效。'}
          </div>
          {showButtons && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  if (!currentConversationId) return
                  approveToolCall(currentConversationId, toolCall.name, false)
                }}
                className="text-xs px-2 py-1 rounded bg-[hsl(var(--surface-2))] hover:bg-[hsl(var(--surface-3))] transition-colors"
              >
                允许
              </button>
              <button
                onClick={() => {
                  if (!currentConversationId) return
                  approveToolCall(currentConversationId, toolCall.name, true)
                }}
                className="text-xs px-2 py-1 rounded bg-[hsl(var(--surface-2))] hover:bg-[hsl(var(--surface-3))] transition-colors"
              >
                允许所有
              </button>
              <button
                className="text-xs px-2 py-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                拒绝
              </button>
            </div>
          )}
        </div>
      )
    }

    const output = toolResult.output
    const isLong = output.length > 300

    if (isLong && !isExpanded) {
      return (
        <div>
          <pre className="font-mono text-xs whitespace-pre-wrap break-words">
            {output.slice(0, 300)}...
          </pre>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
          >
            Show More
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      )
    }

    return (
      <div>
        <pre className="font-mono text-xs whitespace-pre-wrap break-words">
          {output}
        </pre>
        {isLong && (
          <button
            onClick={() => setIsExpanded(false)}
            className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
          >
            Show Less
            <ChevronUp className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'border rounded-lg p-3 mb-2',
        borderColor,
        bgColor
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="font-semibold text-sm">{toolCall.name}</span>
        <div className="flex-1" />
        {statusIcon}
        <span className="text-xs text-muted-foreground">
          {status === 'pending' && (isPermissionRequest ? '需要权限' : 'Running...')}
          {status === 'success' && 'Success'}
          {status === 'error' && 'Error'}
        </span>
      </div>

      {/* Input Parameters */}
      {Object.keys(toolCall.input).length > 0 && (
        <div className="bg-background/50 rounded p-2 mb-2">
          <div className="text-xs text-muted-foreground mb-1">Parameters:</div>
          <div className="space-y-1">{renderInput()}</div>
        </div>
      )}

      {/* Output Result */}
      {toolResult && (
        <div
          className={cn(
            'rounded p-2',
            toolResult.isError
              ? 'bg-destructive/10 border border-destructive/20'
              : 'bg-background/50'
          )}
        >
          <div className="text-xs text-muted-foreground mb-1">
            {toolResult.isError ? 'Error:' : 'Result:'}
          </div>
          {renderOutput()}
        </div>
      )}
    </div>
  )
}

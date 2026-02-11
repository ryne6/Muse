import { useState, useEffect } from 'react'
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
  ChevronRight,
  Terminal,
  ListTodo,
} from 'lucide-react'
import type { ToolCall, ToolResult } from '@shared/types/conversation'
import type { PermissionRequestPayload, ApprovalScope } from '@shared/types/toolPermissions'
import { TOOL_PERMISSION_PREFIX } from '@shared/types/toolPermissions'
import { cn } from '@/utils/cn'
import { ScrollArea } from '@lobehub/ui'
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

type ApprovalStatus = 'idle' | 'loading' | 'approved' | 'approvedAll' | 'denied'

export function ToolCallCard({ toolCall, toolResult }: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const approveToolCall = useChatStore((state) => state.approveToolCall)
  const denyToolCall = useChatStore((state) => state.denyToolCall)
  const currentConversationId = useConversationStore((state) => state.currentConversationId)

  const rawPermissionRequest = toolResult?.output?.startsWith(TOOL_PERMISSION_PREFIX) ?? false
  const permissionRequest = parsePermissionRequest(toolResult?.output)
  const isPermissionRequest = rawPermissionRequest

  const isTodoWrite = toolCall.name === 'TodoWrite'

  // Task 1: Collapse state - permission requests default to expanded, TodoWrite always collapsed
  const [isCollapsed, setIsCollapsed] = useState(!isPermissionRequest || isTodoWrite)
  // Task 6: Approval button status
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('idle')
  // P0: Dropdown and deny input state
  const [showApproveMenu, setShowApproveMenu] = useState(false)
  const [showDenyInput, setShowDenyInput] = useState(false)
  const [denyReason, setDenyReason] = useState('')

  // Fix: re-expand when permission request arrives after mount
  useEffect(() => {
    if (isPermissionRequest) {
      setIsCollapsed(false)
    }
  }, [isPermissionRequest])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showApproveMenu) return
    const handleClickOutside = () => setShowApproveMenu(false)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showApproveMenu])

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
      const isLoading = approvalStatus === 'loading'
      const isActioned = approvalStatus === 'approved' || approvalStatus === 'approvedAll' || approvalStatus === 'denied'

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

      return (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {permissionRequest
              ? '此工具需要权限才能运行。'
              : '需要权限，但请求无效。'}
          </div>
          {showButtons && !isActioned && (
            <div className="flex flex-wrap gap-2 relative">
              {/* 允许下拉菜单 */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowApproveMenu(!showApproveMenu)
                  }}
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
          {isActioned && (
            <div className="flex items-center gap-1.5 text-xs">
              {approvalStatus === 'denied' ? (
                <>
                  <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">已拒绝</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-600">
                    {approvalStatus === 'approvedAll' ? '已允许所有' : '已允许'}
                  </span>
                </>
              )}
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
      <ScrollArea scrollFade style={{ maxHeight: 400 }}>
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
      </ScrollArea>
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
      {/* Header - clickable to toggle collapse */}
      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
        {icon}
        <span className="font-medium text-[13px]">{toolCall.name}</span>
        <div className="flex-1" />
        {statusIcon}
        <span className="text-xs text-muted-foreground">
          {status === 'pending' && (isPermissionRequest ? '需要权限' : 'Running...')}
          {status === 'success' && 'Success'}
          {status === 'error' && 'Error'}
        </span>
      </div>

      {/* Collapsible content: Parameters + Output */}
      {!isCollapsed && (
        <>
          {/* Parameters (skip for TodoWrite) */}
          {toolCall.name !== 'TodoWrite' && Object.keys(toolCall.input).length > 0 && (
            <div className="bg-background/50 rounded p-2 mt-2">
              <div className="text-xs text-muted-foreground mb-1">Parameters:</div>
              <div className="space-y-1">{renderInput()}</div>
            </div>
          )}

          {/* Output Result (skip for TodoWrite) */}
          {toolResult && !isTodoWrite && (
            <div
              className={cn(
                'rounded p-2 mt-2',
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
        </>
      )}
    </div>
  )
}

import type { ToolCall, ToolResult } from '@shared/types/conversation'
import { ToolCallCard } from './ToolCallCard'

interface ToolCallsListProps {
  toolCalls: ToolCall[]
  toolResults?: ToolResult[]
}

export function ToolCallsList({ toolCalls, toolResults = [] }: ToolCallsListProps) {
  return (
    <div className="space-y-2 mb-3">
      {toolCalls.map((toolCall) => {
        const toolResult = toolResults.find((r) => r.toolCallId === toolCall.id)
        return <ToolCallCard key={toolCall.id} toolCall={toolCall} toolResult={toolResult} />
      })}
    </div>
  )
}

import { memo } from 'react'
import type { ToolCall, ToolResult } from '~shared/types/conversation'
import { ToolCallCard } from './ToolCallCard'

interface ToolCallsListProps {
  toolCalls: ToolCall[]
  toolResults?: ToolResult[]
}

export const ToolCallsList = memo<ToolCallsListProps>(function ToolCallsList({
  toolCalls,
  toolResults = [],
}) {
  const visibleCalls = toolCalls.filter(tc => tc.name !== 'TodoWrite')
  if (visibleCalls.length === 0) return null

  return (
    <div className="space-y-2 mb-3">
      {visibleCalls.map(toolCall => {
        const toolResult = toolResults.find(r => r.toolCallId === toolCall.id)
        return (
          <ToolCallCard
            key={toolCall.id}
            toolCall={toolCall}
            toolResult={toolResult}
          />
        )
      })}
    </div>
  )
})

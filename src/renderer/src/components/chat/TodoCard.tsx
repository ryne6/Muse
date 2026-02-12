import {
  CheckCircle2,
  Circle,
  Loader2,
  ListTodo,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useConversationStore } from '@/stores/conversationStore'
import { useMemo, useState } from 'react'

interface TodoItem {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done'
  notes?: string
}

const STATUS_CONFIG = {
  todo: {
    icon: Circle,
    className: 'text-muted-foreground',
  },
  in_progress: {
    icon: Loader2,
    className: 'text-blue-500 animate-spin',
  },
  done: {
    icon: CheckCircle2,
    className: 'text-green-500',
  },
}

/**
 * Fixed bottom TodoPanel — extracts the latest TodoWrite call
 * from the current conversation and renders a single instance.
 */
export function TodoPanel() {
  const [isExpanded, setIsExpanded] = useState(true)

  const conversation = useConversationStore(s => {
    const conv = s.conversations.find(c => c.id === s.currentConversationId)
    return conv ?? null
  })

  const todos: TodoItem[] = useMemo(() => {
    if (!conversation?.messages) return []

    // Walk messages in reverse to find the latest TodoWrite tool call
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      const msg = conversation.messages[i]
      if (!msg.toolCalls) continue
      for (let j = msg.toolCalls.length - 1; j >= 0; j--) {
        const tc = msg.toolCalls[j]
        if (tc.name === 'TodoWrite' && Array.isArray(tc.input?.todos)) {
          return tc.input.todos as TodoItem[]
        }
      }
    }
    return []
  }, [conversation?.messages])

  if (todos.length === 0) return null

  const doneCount = todos.filter(t => t.status === 'done').length
  const allDone = doneCount === todos.length

  return (
    <div className="border-t border-border bg-background px-6 py-3">
      <div
        className="flex items-center gap-2 cursor-pointer select-none"
        onClick={() => setIsExpanded(prev => !prev)}
      >
        <ListTodo className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Tasks: {doneCount}/{todos.length} completed
        </span>
        {allDone && <span className="text-xs text-green-500">All done</span>}
        <div className="flex-1" />
        <ChevronUp
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </div>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="space-y-1 max-h-[200px] overflow-y-auto pt-2">
            {todos.map(todo => {
              const config = STATUS_CONFIG[todo.status] ?? STATUS_CONFIG.todo
              const Icon = config.icon
              return (
                <div key={todo.id} className="flex items-start gap-2 py-0.5">
                  <Icon
                    className={cn(
                      'w-3.5 h-3.5 mt-0.5 flex-shrink-0',
                      config.className
                    )}
                  />
                  <span
                    className={cn(
                      'text-xs',
                      todo.status === 'done' &&
                        'line-through text-muted-foreground'
                    )}
                  >
                    {todo.title}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

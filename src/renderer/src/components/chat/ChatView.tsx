import { memo } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ChatHeader } from './ChatHeader'
import { TodoPanel } from './TodoCard'

export const ChatView = memo(function ChatView() {
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <ChatHeader />
      <MessageList />
      <TodoPanel />
      <ChatInput />
    </div>
  )
})

ChatView.displayName = 'ChatView'

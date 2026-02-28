import { memo } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ChatHeader } from './ChatHeader'
import { TodoPanel } from './TodoCard'
import { MessageBuffer } from './MessageBuffer'

export const ChatView = memo(function ChatView() {
  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <ChatHeader />
      <MessageList />
      <TodoPanel />
      <MessageBuffer />
      <ChatInput />
    </div>
  )
})

ChatView.displayName = 'ChatView'

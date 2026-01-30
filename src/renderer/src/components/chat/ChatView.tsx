import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ChatHeader } from './ChatHeader'

export function ChatView() {
  return (
    <div className="flex-1 flex flex-col relative">
      <ChatHeader />
      <MessageList />
      <ChatInput />
    </div>
  )
}

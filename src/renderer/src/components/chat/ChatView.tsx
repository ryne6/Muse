import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

export function ChatView() {
  return (
    <div className="flex-1 flex flex-col">
      <MessageList />
      <ChatInput />
    </div>
  )
}

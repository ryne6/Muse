export interface Chat {
  id: string
  title: string
  lastMessage?: string
  createdAt: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

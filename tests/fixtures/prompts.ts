/**
 * Test fixtures for Prompts feature
 */

export const mockPromptPresets = [
  {
    id: 'preset-1',
    name: 'Code Assistant',
    content: 'You are a helpful coding assistant. Focus on writing clean, maintainable code.',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'preset-2',
    name: 'Documentation Writer',
    content: 'You write clear and concise technical documentation.',
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  },
  {
    id: 'preset-3',
    name: 'Code Reviewer',
    content: 'You review code for bugs, security issues, and best practices.',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03')
  }
]

export const mockSystemPrompts = {
  global: 'Always be concise and helpful. Prefer TypeScript over JavaScript.',
  conversation: 'Focus on React and Next.js development.',
  builtIn: 'You are Muse, an AI coding assistant...'
}

export const mockConversationWithPrompt = {
  id: 'conv-with-prompt',
  title: 'Test Conversation',
  systemPrompt: 'Focus on TypeScript and React.',
  provider: 'openai',
  model: 'gpt-4',
  createdAt: new Date(),
  updatedAt: new Date(),
  workspace: '/test/workspace'
}

export const mockConversationWithoutPrompt = {
  id: 'conv-no-prompt',
  title: 'Test Conversation 2',
  systemPrompt: null,
  provider: 'openai',
  model: 'gpt-4',
  createdAt: new Date(),
  updatedAt: new Date(),
  workspace: '/test/workspace'
}

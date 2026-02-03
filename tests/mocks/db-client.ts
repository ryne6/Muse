import { vi } from 'vitest'
import { mockProviders } from '../fixtures/providers'
import type { Provider, Model, Conversation, Message } from '@main/db/schema'

/**
 * Mock dbClient for UI component testing
 * 提供可配置的数据库客户端 mock
 */

// 默认的 mock 数据
const defaultMockProviders: Provider[] = mockProviders.map((p, index) => ({
  ...p,
  id: `provider-${index + 1}`,
  createdAt: new Date()
}))

const defaultMockModels: Model[] = [
  {
    id: 'model-1',
    providerId: 'provider-1',
    modelId: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    contextLength: 200000,
    isCustom: false,
    enabled: true
  },
  {
    id: 'model-2',
    providerId: 'provider-2',
    modelId: 'gpt-4',
    name: 'GPT-4',
    contextLength: 8000,
    isCustom: false,
    enabled: true
  }
]

const defaultMockConversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Test Conversation 1',
    createdAt: new Date('2026-01-27T10:00:00'),
    updatedAt: new Date('2026-01-27T10:30:00'),
    provider: 'claude',
    model: 'claude-3-5-sonnet-20241022'
  },
  {
    id: 'conv-2',
    title: 'Test Conversation 2',
    createdAt: new Date('2026-01-26T15:00:00'),
    updatedAt: new Date('2026-01-26T15:45:00'),
    provider: 'openai',
    model: 'gpt-4'
  }
]

const defaultMockMessages: Message[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'user',
    content: 'Hello, this is a test message',
    timestamp: new Date('2026-01-27T10:00:00')
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    role: 'assistant',
    content: 'Hello! How can I help you today?',
    timestamp: new Date('2026-01-27T10:00:30')
  }
]

/**
 * 创建可配置的 dbClient mock
 */
export function createMockDbClient(options?: {
  providers?: Provider[]
  models?: Model[]
  conversations?: Conversation[]
  messages?: Message[]
}) {
  const providers = options?.providers ?? defaultMockProviders
  const models = options?.models ?? defaultMockModels
  const conversations = options?.conversations ?? defaultMockConversations
  const messages = options?.messages ?? defaultMockMessages

  return {
    providers: {
      getAll: vi.fn(async () => providers),
      getById: vi.fn(async (id: string) => providers.find(p => p.id === id) ?? null),
      create: vi.fn(async (data: any) => ({ ...data, id: 'new-provider-id', createdAt: new Date() })),
      update: vi.fn(async (id: string, data: any) => ({ ...providers.find(p => p.id === id), ...data })),
      delete: vi.fn(async (id: string) => undefined)
    },
    models: {
      getAll: vi.fn(async () => models),
      getByProviderId: vi.fn(async (providerId: string) =>
        models.filter(m => m.providerId === providerId)
      ),
      getEnabled: vi.fn(async () => models.filter(m => m.enabled)),
      create: vi.fn(async (data: any) => ({ ...data, id: 'new-model-id' })),
      update: vi.fn(async (id: string, data: any) => ({ ...models.find(m => m.id === id), ...data })),
      delete: vi.fn(async (id: string) => undefined)
    },
    conversations: {
      getAll: vi.fn(async () => conversations),
      getById: vi.fn(async (id: string) => conversations.find(c => c.id === id) ?? null),
      create: vi.fn(async (data: any) => ({
        ...data,
        id: 'new-conv-id',
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      update: vi.fn(async (id: string, data: any) => ({
        ...conversations.find(c => c.id === id),
        ...data,
        updatedAt: new Date()
      })),
      delete: vi.fn(async (id: string) => undefined)
    },
    messages: {
      getAllWithTools: vi.fn(async (conversationId: string) =>
        messages.filter(m => m.conversationId === conversationId)
      ),
      create: vi.fn(async (data: any) => ({
        ...data,
        id: 'new-msg-id',
        timestamp: new Date()
      })),
      delete: vi.fn(async (id: string) => undefined)
    },
    mcp: {
      getAll: vi.fn(async () => []),
      getEnabled: vi.fn(async () => []),
      getById: vi.fn(async () => null),
      create: vi.fn(async (data: any) => ({ ...data, id: 'new-mcp-id' })),
      update: vi.fn(async (id: string, data: any) => ({ id, ...data })),
      delete: vi.fn(async () => undefined),
      toggleEnabled: vi.fn(async () => undefined),
      getServerStates: vi.fn(async () => []),
    },
    skills: {
      getDirectories: vi.fn(async () => []),
      addDirectory: vi.fn(async () => ({ success: true })),
      removeDirectory: vi.fn(async () => ({ success: true })),
      toggleDirectory: vi.fn(async () => ({ success: true })),
      getAll: vi.fn(async () => []),
      getContent: vi.fn(async () => ''),
      getCount: vi.fn(async () => 0),
    }
  }
}

/**
 * 默认的 dbClient mock 实例
 */
export const mockDbClient = createMockDbClient()

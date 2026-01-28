import type { NewConversation } from '@main/db/schema'

/**
 * Conversation 测试数据 fixtures
 */

export const mockConversation1: Omit<NewConversation, 'id' | 'createdAt' | 'updatedAt'> = {
  title: 'Test Conversation 1',
  lastProviderId: 'provider-1',
  lastModelId: 'model-1'
}

export const mockConversation2: Omit<NewConversation, 'id' | 'createdAt' | 'updatedAt'> = {
  title: 'Test Conversation 2',
  lastProviderId: 'provider-2',
  lastModelId: 'model-2'
}

export const mockConversation3: Omit<NewConversation, 'id' | 'createdAt' | 'updatedAt'> = {
  title: 'Test Conversation 3',
  lastProviderId: null,
  lastModelId: null
}

export const mockNewConversation: Omit<NewConversation, 'id' | 'createdAt' | 'updatedAt'> = {
  title: 'New Conversation',
  lastProviderId: null,
  lastModelId: null
}

export const mockConversations = [
  mockConversation1,
  mockConversation2,
  mockConversation3
]

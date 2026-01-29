import { describe, it, expect } from 'vitest'
import { getStrategy } from '../strategies'
import type { AIMessage, AIConfig } from '../../../../../shared/types/ai'

describe('GenericProvider strategies', () => {
  it('should choose anthropic strategy when apiFormat=anthropic-messages', () => {
    const config: AIConfig = {
      apiKey: 'test-key',
      model: 'claude-3',
      baseURL: 'https://api.anthropic.com',
      apiFormat: 'anthropic-messages',
    }
    const messages: AIMessage[] = [{ role: 'user', content: 'Hello' }]

    const strategy = getStrategy(config.apiFormat)
    const headers = strategy.buildHeaders(config)
    const body = strategy.buildBody(messages, config, { stream: true })

    expect(headers['x-api-key']).toBe('test-key')
    expect(headers['anthropic-version']).toBe('2023-06-01')
    expect(body.stream).toBe(true)
    expect(body.max_tokens).toBeDefined()
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { AIConfig, AIMessage } from '../../../../shared/types/ai'

const { sendMessageMock } = vi.hoisted(() => ({
  sendMessageMock: vi.fn(),
}))

vi.mock('../../ai/manager', () => {
  return {
    AIManager: class {
      sendMessage = sendMessageMock
    },
  }
})

import { MemoryExtractor } from '../extractor'

describe('MemoryExtractor', () => {
  const baseConfig: AIConfig = {
    apiKey: 'test-key',
    model: 'test-model',
    temperature: 0.8,
  }

  beforeEach(() => {
    sendMessageMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return empty array when no user/assistant messages exist', async () => {
    const messages: AIMessage[] = [{ role: 'system', content: 'system only' }]

    const result = await MemoryExtractor.extract(messages, 'openai', baseConfig)

    expect(result).toEqual([])
    expect(sendMessageMock).not.toHaveBeenCalled()
  })

  it('should only use latest 10 user/assistant messages for extraction', async () => {
    sendMessageMock.mockResolvedValue('[]')

    const messages: AIMessage[] = [
      { role: 'user', content: 'msg-0' },
      { role: 'assistant', content: 'msg-1' },
      { role: 'user', content: 'msg-2' },
      { role: 'assistant', content: 'msg-3' },
      { role: 'user', content: 'msg-4' },
      { role: 'assistant', content: 'msg-5' },
      { role: 'user', content: 'msg-6' },
      { role: 'assistant', content: 'msg-7' },
      { role: 'user', content: 'msg-8' },
      { role: 'assistant', content: 'msg-9' },
      { role: 'user', content: 'msg-10' },
      { role: 'assistant', content: 'msg-11' },
      { role: 'system', content: 'ignored system message' },
    ]

    await MemoryExtractor.extract(messages, 'openai', baseConfig)

    expect(sendMessageMock).toHaveBeenCalledTimes(1)
    const [, extractionMessages] = sendMessageMock.mock.calls[0]
    const conversationText = extractionMessages[1].content as string

    expect(conversationText).not.toContain('User: msg-0\n')
    expect(conversationText).not.toContain('Assistant: msg-1\n')
    expect(conversationText).toContain('User: msg-2')
    expect(conversationText).toContain('Assistant: msg-11')
    expect(conversationText).not.toContain('ignored system message')
  })

  it('should truncate very long conversation text to 8000 chars', async () => {
    sendMessageMock.mockResolvedValue('[]')

    const veryLong = 'a'.repeat(9000)
    const messages: AIMessage[] = [{ role: 'user', content: veryLong }]

    await MemoryExtractor.extract(messages, 'openai', baseConfig)

    const [, extractionMessages] = sendMessageMock.mock.calls[0]
    const conversationText = extractionMessages[1].content as string

    expect(conversationText.length).toBeLessThanOrEqual(8000)
  })

  it('should force low temperature and preserve other config fields', async () => {
    sendMessageMock.mockResolvedValue('[]')

    await MemoryExtractor.extract(
      [{ role: 'user', content: 'hello' }],
      'openai',
      baseConfig
    )

    const [providerType, extractionMessages, extractionConfig] =
      sendMessageMock.mock.calls[0]

    expect(providerType).toBe('openai')
    expect(extractionMessages[0].role).toBe('system')
    expect(extractionMessages[1].role).toBe('user')
    expect(extractionConfig).toMatchObject({
      apiKey: 'test-key',
      model: 'test-model',
      temperature: 0.1,
    })
  })

  it('should extract text from multimodal message content', async () => {
    sendMessageMock.mockResolvedValue('[]')

    const messages: AIMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'visible text' },
          { type: 'image', mimeType: 'image/png', data: 'base64-data' },
        ],
      },
    ]

    await MemoryExtractor.extract(messages, 'openai', baseConfig)

    const [, extractionMessages] = sendMessageMock.mock.calls[0]
    const conversationText = extractionMessages[1].content as string

    expect(conversationText).toContain('visible text')
    expect(conversationText).not.toContain('base64-data')
  })

  it('should parse valid JSON array response and filter invalid items', async () => {
    sendMessageMock.mockResolvedValue(
      JSON.stringify([
        {
          category: 'preference',
          content: '喜欢 pnpm',
          tags: ['tooling'],
        },
        {
          category: 'invalid',
          content: 'bad category',
          tags: ['x'],
        },
        {
          category: 'knowledge',
          content: 'missing tags',
          tags: [1, 2],
        },
      ])
    )

    const result = await MemoryExtractor.extract(
      [{ role: 'user', content: 'hello' }],
      'openai',
      baseConfig
    )

    expect(result).toEqual([
      {
        category: 'preference',
        content: '喜欢 pnpm',
        tags: ['tooling'],
      },
    ])
  })

  it('should parse JSON wrapped in markdown code fence', async () => {
    sendMessageMock.mockResolvedValue(
      '```json\n[{"category":"decision","content":"use zustand","tags":["state"]}]\n```'
    )

    const result = await MemoryExtractor.extract(
      [{ role: 'user', content: 'hello' }],
      'openai',
      baseConfig
    )

    expect(result).toEqual([
      {
        category: 'decision',
        content: 'use zustand',
        tags: ['state'],
      },
    ])
  })

  it('should return empty array and warn on invalid JSON response', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    sendMessageMock.mockResolvedValue('not-json')

    const result = await MemoryExtractor.extract(
      [{ role: 'user', content: 'hello' }],
      'openai',
      baseConfig
    )

    expect(result).toEqual([])
    expect(warnSpy).toHaveBeenCalledWith(
      'MemoryExtractor: Failed to parse AI response as JSON'
    )
  })

  it('should return empty array when AI response is not an array', async () => {
    sendMessageMock.mockResolvedValue('{"category":"knowledge"}')

    const result = await MemoryExtractor.extract(
      [{ role: 'user', content: 'hello' }],
      'openai',
      baseConfig
    )

    expect(result).toEqual([])
  })

  it('should return empty array when AI request fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    sendMessageMock.mockRejectedValue(new Error('network failed'))

    const result = await MemoryExtractor.extract(
      [{ role: 'user', content: 'hello' }],
      'openai',
      baseConfig
    )

    expect(result).toEqual([])
    expect(errorSpy).toHaveBeenCalledWith(
      'MemoryExtractor: Failed to extract memories:',
      expect.any(Error)
    )
  })
})

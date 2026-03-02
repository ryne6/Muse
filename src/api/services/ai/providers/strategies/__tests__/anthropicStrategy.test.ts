import { describe, it, expect, vi, afterEach } from 'vitest'
import type { AIConfig, AIMessage } from '../../../../../../shared/types/ai'
import { getAllTools } from '../../../tools/definitions'
import { anthropicStrategy } from '../anthropic'

describe('anthropicStrategy', () => {
  const baseConfig: AIConfig = {
    apiKey: 'ak-test',
    model: 'claude-sonnet-4-20250514',
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should use fixed anthropic endpoint', () => {
    expect(anthropicStrategy.getEndpoint(baseConfig)).toBe('/v1/messages')
  })

  it('should build headers for anthropic API', () => {
    expect(anthropicStrategy.buildHeaders(baseConfig)).toEqual({
      'Content-Type': 'application/json',
      'x-api-key': 'ak-test',
      'anthropic-version': '2023-06-01',
    })
  })

  it('should build body with system prompt and converted multimodal content', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const messages: AIMessage[] = [
      { role: 'system', content: 'be concise' },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'analyze image' },
          { type: 'image', mimeType: 'image/jpeg', data: 'abc123==' },
        ],
      },
    ]

    const body = anthropicStrategy.buildBody(
      messages,
      { ...baseConfig, maxTokens: 2048 },
      { stream: true }
    )

    expect(body.model).toBe(baseConfig.model)
    expect(body.system).toBe('be concise')
    expect(body.stream).toBe(true)
    expect(body.max_tokens).toBe(2048)
    expect(body.tools).toEqual(getAllTools())
    expect(body.messages).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'analyze image' },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: 'abc123==',
            },
          },
        ],
      },
    ])
    expect(logSpy).toHaveBeenCalled()
  })

  it('should extract system prompt from multimodal system content', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: [
          { type: 'text', text: 'line 1' },
          { type: 'text', text: 'line 2' },
        ],
      },
      { role: 'user', content: 'hello' },
    ]

    const body = anthropicStrategy.buildBody(messages, baseConfig, {
      stream: false,
    })

    expect(body.system).toBe('line 1\nline 2')
    expect(body.messages).toHaveLength(1)
    expect(body.messages[0]).toEqual({
      role: 'user',
      content: 'hello',
    })
    expect(logSpy).toHaveBeenCalled()
  })

  it('should inject system fallback into first user message for non-anthropic endpoints', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const messages: AIMessage[] = [
      { role: 'system', content: 'You are Crow, a desktop AI chat agent.' },
      { role: 'user', content: 'Please help me refactor this function.' },
    ]

    const body = anthropicStrategy.buildBody(
      messages,
      { ...baseConfig, baseURL: 'https://gateway.example.com' },
      { stream: true }
    )

    expect(body.system).toBe('You are Crow, a desktop AI chat agent.')
    expect(body.messages).toHaveLength(1)
    expect(body.messages[0].role).toBe('user')
    expect(body.messages[0].content).toContain(
      'You are Crow, a desktop AI chat agent.'
    )
    expect(body.messages[0].content).toContain(
      'Please help me refactor this function.'
    )
    expect(logSpy).toHaveBeenCalled()
  })

  it('should not inject fallback for official anthropic endpoint', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const messages: AIMessage[] = [
      { role: 'system', content: 'You are Crow, a desktop AI chat agent.' },
      { role: 'user', content: 'Please help me refactor this function.' },
    ]

    const body = anthropicStrategy.buildBody(
      messages,
      { ...baseConfig, baseURL: 'https://api.anthropic.com' },
      { stream: true }
    )

    expect(body.messages).toHaveLength(1)
    expect(body.messages[0]).toEqual({
      role: 'user',
      content: 'Please help me refactor this function.',
    })
    expect(logSpy).toHaveBeenCalled()
  })

  it('should force temperature=1 and include thinking settings when enabled', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const body = anthropicStrategy.buildBody(
      [{ role: 'user', content: 'reason about this' }],
      { ...baseConfig, thinkingEnabled: true, thinkingBudget: 1234 },
      { stream: true }
    )

    expect(body.thinking).toEqual({
      type: 'enabled',
      budget_tokens: 1234,
    })
    expect(body.temperature).toBe(1)
    expect(logSpy).toHaveBeenCalled()
  })

  it('should use default thinking budget when not provided', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const body = anthropicStrategy.buildBody(
      [{ role: 'user', content: 'reason about this' }],
      { ...baseConfig, thinkingEnabled: true },
      { stream: true }
    )

    expect(body.thinking).toEqual({
      type: 'enabled',
      budget_tokens: 10000,
    })
    expect(logSpy).toHaveBeenCalled()
  })

  it('should parse tool_use start chunk', () => {
    expect(
      anthropicStrategy.parseStreamChunk({
        type: 'content_block_start',
        index: 1,
        content_block: {
          type: 'tool_use',
          id: 'tool_1',
          name: 'Read',
        },
      })
    ).toEqual({
      toolCalls: [
        {
          index: 1,
          id: 'tool_1',
          function: {
            name: 'Read',
            arguments: '',
          },
        },
      ],
    })
  })

  it('should parse input_json_delta chunk', () => {
    expect(
      anthropicStrategy.parseStreamChunk({
        type: 'content_block_delta',
        index: 0,
        delta: {
          type: 'input_json_delta',
          partial_json: '{"path":"a.txt"}',
        },
      })
    ).toEqual({
      toolCalls: [
        {
          index: 0,
          function: {
            arguments: '{"path":"a.txt"}',
          },
        },
      ],
    })
  })

  it('should parse thinking_delta chunk', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})

    expect(
      anthropicStrategy.parseStreamChunk({
        type: 'content_block_delta',
        delta: {
          type: 'thinking_delta',
          thinking: 'plan next step',
        },
      })
    ).toEqual({ thinking: 'plan next step' })
  })

  it('should parse text_delta chunk', () => {
    expect(
      anthropicStrategy.parseStreamChunk({
        type: 'content_block_delta',
        delta: {
          type: 'text_delta',
          text: 'hello',
        },
      })
    ).toEqual({ content: 'hello' })
  })

  it('should return undefined for unsupported stream chunk', () => {
    expect(anthropicStrategy.parseStreamChunk({ type: 'ping' })).toBe(undefined)
  })

  it('should parse text content from non-stream response', () => {
    expect(
      anthropicStrategy.parseResponse({
        content: [
          { type: 'tool_use', id: 'tool_1' },
          { type: 'text', text: 'final answer' },
        ],
      })
    ).toBe('final answer')
  })

  it('should return empty string when response has no text block', () => {
    expect(
      anthropicStrategy.parseResponse({
        content: [{ type: 'tool_use', id: 'tool_1' }],
      })
    ).toBe('')
  })
})

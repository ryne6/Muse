import { describe, it, expect } from 'vitest'
import type { AIConfig, AIMessage } from '../../../../../../shared/types/ai'
import { getAllTools } from '../../../tools/definitions'
import { openAIStrategy } from '../openai'

describe('openAIStrategy', () => {
  const baseConfig: AIConfig = {
    apiKey: 'sk-test',
    model: 'gpt-4o',
  }

  it('should select chat-completions endpoint by default', () => {
    expect(openAIStrategy.getEndpoint(baseConfig)).toBe('/chat/completions')
  })

  it('should select responses endpoint when apiFormat is responses', () => {
    expect(
      openAIStrategy.getEndpoint({ ...baseConfig, apiFormat: 'responses' })
    ).toBe('/responses')
  })

  it('should build headers with bearer token', () => {
    expect(openAIStrategy.buildHeaders(baseConfig)).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer sk-test',
    })
  })

  it('should build request body with converted content and tools', () => {
    const messages: AIMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'describe this image' },
          {
            type: 'image',
            mimeType: 'image/png',
            data: 'aGVsbG8=',
          },
        ],
      },
      { role: 'assistant', content: 'ok' },
    ]

    const body = openAIStrategy.buildBody(
      messages,
      { ...baseConfig, temperature: 0.2, maxTokens: 4096 },
      { stream: true }
    )

    expect(body.model).toBe('gpt-4o')
    expect(body.stream).toBe(true)
    expect(body.temperature).toBe(0.2)
    expect(body.max_tokens).toBe(4096)
    expect(body.messages).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'describe this image' },
          {
            type: 'image_url',
            image_url: {
              url: 'data:image/png;base64,aGVsbG8=',
              detail: 'auto',
            },
          },
        ],
      },
      { role: 'assistant', content: 'ok' },
    ])

    const firstTool = getAllTools()[0]
    expect(body.tools[0]).toEqual({
      type: 'function',
      function: {
        name: firstTool.name,
        description: firstTool.description,
        parameters: firstTool.input_schema,
      },
    })
  })

  it('should apply default temperature and max_tokens', () => {
    const body = openAIStrategy.buildBody(
      [{ role: 'user', content: 'hello' }],
      baseConfig,
      { stream: false }
    )

    expect(body.temperature).toBe(1)
    expect(body.max_tokens).toBe(10000000)
    expect(body.stream).toBe(false)
  })

  it('should parse stream chunk content', () => {
    expect(
      openAIStrategy.parseStreamChunk({
        choices: [{ delta: { content: 'hello' } }],
      })
    ).toEqual({ content: 'hello' })
  })

  it('should parse stream chunk tool calls', () => {
    const toolCalls = [{ index: 0, function: { name: 'Read', arguments: '{}' } }]
    expect(
      openAIStrategy.parseStreamChunk({
        choices: [{ delta: { tool_calls: toolCalls } }],
      })
    ).toEqual({ toolCalls })
  })

  it('should prefer content when chunk has both content and tool calls', () => {
    const toolCalls = [{ index: 0, function: { name: 'Read', arguments: '{}' } }]
    expect(
      openAIStrategy.parseStreamChunk({
        choices: [{ delta: { content: 'x', tool_calls: toolCalls } }],
      })
    ).toEqual({ content: 'x' })
  })

  it('should return undefined for unrecognized stream chunk', () => {
    expect(openAIStrategy.parseStreamChunk({ choices: [{ delta: {} }] })).toBe(
      undefined
    )
  })

  it('should parse non-stream response content', () => {
    expect(
      openAIStrategy.parseResponse({
        choices: [{ message: { content: 'answer' } }],
      })
    ).toBe('answer')
  })

  it('should return empty string for missing non-stream content', () => {
    expect(openAIStrategy.parseResponse({ choices: [] })).toBe('')
  })
})

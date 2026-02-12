import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ClaudeProvider } from '../claude'
import type { AIConfig } from '../../../../../shared/types/ai'

const { createMock, executeMock, constructorMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  executeMock: vi.fn(),
  constructorMock: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic {
    messages = {
      create: createMock,
    }

    constructor(config: any) {
      constructorMock(config)
    }
  },
}))

vi.mock('../../tools/executor', () => ({
  ToolExecutor: class {
    execute = executeMock
  },
}))

function toAsyncIterable(chunks: any[]) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield chunk
      }
    },
  }
}

describe('ClaudeProvider runtime', () => {
  const provider = new ClaudeProvider()

  const baseConfig: AIConfig = {
    apiKey: 'claude-key',
    model: 'claude-3-5-sonnet-20241022',
    baseURL: 'https://api.anthropic.test',
  }

  beforeEach(() => {
    createMock.mockReset()
    executeMock.mockReset()
    constructorMock.mockReset()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should reject invalid configuration before calling SDK', async () => {
    await expect(
      provider.sendMessage([{ role: 'user', content: 'hi' }], {
        apiKey: '',
        model: 'claude-3-5-sonnet-20241022',
      })
    ).rejects.toThrow('Invalid configuration')

    expect(createMock).not.toHaveBeenCalled()
  })

  it('should send simple request with system and multimodal conversion', async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'final answer' }],
    })

    const result = await provider.sendMessage(
      [
        { role: 'system', content: 'be concise' },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'describe this image' },
            { type: 'image', mimeType: 'image/png', data: 'abc123==' },
          ],
        },
      ],
      {
        ...baseConfig,
        temperature: 0.2,
        maxTokens: 4096,
      }
    )

    expect(result).toBe('final answer')
    expect(constructorMock).toHaveBeenCalledWith({
      apiKey: 'claude-key',
      baseURL: 'https://api.anthropic.test',
    })

    const params = createMock.mock.calls[0][0]
    expect(params.model).toBe(baseConfig.model)
    expect(params.system).toBe('be concise')
    expect(params.max_tokens).toBe(4096)
    expect(params.temperature).toBe(0.2)
    expect(params.messages).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'describe this image' },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: 'abc123==',
            },
          },
        ],
      },
    ])
    expect(Array.isArray(params.tools)).toBe(true)
    expect(params.tools.length).toBeGreaterThan(0)
  })

  it('should execute tool_use blocks in simple mode and continue conversation', async () => {
    executeMock.mockResolvedValueOnce('tool result text')
    createMock
      .mockResolvedValueOnce({
        content: [
          { type: 'text', text: 'need tool' },
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'Read',
            input: { path: '/tmp/a.txt' },
          },
        ],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: ' done' }],
      })

    const result = await provider.sendMessage(
      [{ role: 'user', content: 'run tool' }],
      baseConfig,
      undefined,
      {
        allowOnceTools: ['Read'],
        sessionApprovedTools: ['Read'],
      }
    )

    expect(result).toBe('need tool done')
    expect(executeMock).toHaveBeenCalledWith(
      'Read',
      { path: '/tmp/a.txt' },
      expect.objectContaining({
        toolCallId: 'tool_1',
        allowOnceTools: ['Read'],
        sessionApprovedTools: expect.any(Set),
      })
    )

    const secondParams = createMock.mock.calls[1][0]
    expect(
      secondParams.messages.some(
        (msg: any) =>
          msg.role === 'user' &&
          Array.isArray(msg.content) &&
          msg.content.some(
            (item: any) =>
              item.type === 'tool_result' &&
              item.tool_use_id === 'tool_1' &&
              item.content === 'tool result text'
          )
      )
    ).toBe(true)
  })

  it('should apply thinking config in simple mode when enabled', async () => {
    createMock.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'thinking answer' }],
    })

    await provider.sendMessage(
      [{ role: 'user', content: 'think harder' }],
      {
        ...baseConfig,
        thinkingEnabled: true,
      }
    )

    const params = createMock.mock.calls[0][0]
    expect(params.thinking).toEqual({
      type: 'enabled',
      budget_tokens: 10000,
    })
    expect(params.temperature).toBe(1)
  })

  it('should stream text and thinking chunks with usage summary', async () => {
    createMock.mockResolvedValueOnce(
      toAsyncIterable([
        {
          type: 'message_start',
          message: { usage: { input_tokens: 2 } },
        },
        {
          type: 'content_block_delta',
          delta: { type: 'thinking_delta', thinking: 'plan step' },
        },
        {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: 'Hello Claude' },
        },
        {
          type: 'message_delta',
          usage: { output_tokens: 3 },
        },
        {
          type: 'message_stop',
        },
      ])
    )

    const onChunk = vi.fn()
    const result = await provider.sendMessage(
      [{ role: 'user', content: 'hello' }],
      baseConfig,
      onChunk
    )

    expect(result).toBe('Hello Claude')
    expect(onChunk).toHaveBeenCalledWith({
      content: '',
      done: false,
      thinking: 'plan step',
    })
    expect(onChunk).toHaveBeenCalledWith({
      content: 'Hello Claude',
      done: false,
    })
    expect(onChunk).toHaveBeenLastCalledWith({
      content: '',
      done: true,
      usage: {
        inputTokens: 2,
        outputTokens: 3,
      },
    })

    const params = createMock.mock.calls[0][0]
    expect(params.stream).toBe(true)
  })

  it('should execute streamed tool_use and continue to next round', async () => {
    executeMock.mockResolvedValueOnce('tool output')
    createMock
      .mockResolvedValueOnce(
        toAsyncIterable([
          {
            type: 'message_start',
            message: { usage: { input_tokens: 1 } },
          },
          {
            type: 'content_block_start',
            content_block: {
              type: 'tool_use',
              id: 'tool_stream_1',
              name: 'Read',
            },
          },
          {
            type: 'content_block_delta',
            delta: { type: 'input_json_delta', partial_json: '{"path":"' },
          },
          {
            type: 'content_block_delta',
            delta: { type: 'input_json_delta', partial_json: '/tmp/b.txt"}' },
          },
          {
            type: 'message_delta',
            usage: { output_tokens: 1 },
          },
          {
            type: 'message_stop',
          },
        ])
      )
      .mockResolvedValueOnce(
        toAsyncIterable([
          {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'done' },
          },
          {
            type: 'message_delta',
            usage: { output_tokens: 2 },
          },
        ])
      )

    const onChunk = vi.fn()
    const result = await provider.sendMessage(
      [{ role: 'user', content: 'use tool' }],
      baseConfig,
      onChunk,
      { allowOnceTools: ['Read'] }
    )

    expect(result).toBe('done')
    expect(executeMock).toHaveBeenCalledWith(
      'Read',
      { path: '/tmp/b.txt' },
      expect.objectContaining({
        toolCallId: 'tool_stream_1',
      })
    )
    expect(onChunk).toHaveBeenCalledWith({
      content: '',
      done: false,
      toolCall: {
        id: 'tool_stream_1',
        name: 'Read',
        input: { path: '/tmp/b.txt' },
      },
    })
    expect(onChunk).toHaveBeenCalledWith({
      content: '',
      done: false,
      toolResult: {
        toolCallId: 'tool_stream_1',
        output: 'tool output',
        isError: false,
      },
    })
    expect(onChunk).toHaveBeenLastCalledWith({
      content: '',
      done: true,
      usage: {
        inputTokens: 1,
        outputTokens: 3,
      },
    })

    const secondParams = createMock.mock.calls[1][0]
    expect(
      secondParams.messages.some(
        (msg: any) =>
          msg.role === 'assistant' &&
          Array.isArray(msg.content) &&
          msg.content.some(
            (item: any) =>
              item.type === 'tool_use' && item.id === 'tool_stream_1'
          )
      )
    ).toBe(true)
  })

  it('should continue when streamed tool input JSON is invalid', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    executeMock.mockResolvedValueOnce('tool output')
    createMock
      .mockResolvedValueOnce(
        toAsyncIterable([
          {
            type: 'content_block_start',
            content_block: {
              type: 'tool_use',
              id: 'tool_bad_json',
              name: 'Read',
            },
          },
          {
            type: 'content_block_delta',
            delta: { type: 'input_json_delta', partial_json: '{bad' },
          },
          {
            type: 'message_stop',
          },
        ])
      )
      .mockResolvedValueOnce(
        toAsyncIterable([
          {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'ok' },
          },
        ])
      )

    const result = await provider.sendMessage(
      [{ role: 'user', content: 'use tool' }],
      baseConfig,
      () => {}
    )

    expect(result).toBe('ok')
    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to parse tool input:',
      expect.anything()
    )
    expect(executeMock).toHaveBeenCalledWith(
      'Read',
      {},
      expect.objectContaining({
        toolCallId: 'tool_bad_json',
      })
    )
  })
})

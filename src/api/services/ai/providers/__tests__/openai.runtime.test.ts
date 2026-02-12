import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OpenAIProvider } from '../openai'
import type { AIConfig } from '../../../../../shared/types/ai'

const { createMock, executeMock, constructorMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  executeMock: vi.fn(),
  constructorMock: vi.fn(),
}))

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = {
      completions: {
        create: createMock,
      },
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

describe('OpenAIProvider runtime', () => {
  const provider = new OpenAIProvider()

  const baseConfig: AIConfig = {
    apiKey: 'openai-key',
    model: 'gpt-4o',
    baseURL: 'https://api.openai.test/v1',
  }

  beforeEach(() => {
    createMock.mockReset()
    executeMock.mockReset()
    constructorMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should expose reasoning model predicate', () => {
    expect((provider as any).isReasoningModel('o1')).toBe(true)
    expect((provider as any).isReasoningModel('o3-mini')).toBe(true)
    expect((provider as any).isReasoningModel('gpt-4o')).toBe(false)
  })

  it('should reject invalid configuration before calling SDK', async () => {
    await expect(
      provider.sendMessage([{ role: 'user', content: 'hi' }], {
        apiKey: '',
        model: 'gpt-4o',
      })
    ).rejects.toThrow('Invalid configuration')

    expect(createMock).not.toHaveBeenCalled()
  })

  it('should send simple request and convert multimodal content', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: 'final answer' } }],
    })

    const result = await provider.sendMessage(
      [
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
        maxTokens: 2048,
      }
    )

    expect(result).toBe('final answer')
    expect(constructorMock).toHaveBeenCalledWith({
      apiKey: 'openai-key',
      baseURL: 'https://api.openai.test/v1',
    })

    const params = createMock.mock.calls[0][0]
    expect(params.model).toBe('gpt-4o')
    expect(params.temperature).toBe(0.2)
    expect(params.max_tokens).toBe(2048)
    expect(Array.isArray(params.tools)).toBe(true)
    expect(params.tools.length).toBeGreaterThan(0)
    expect(params.messages[0].content).toEqual([
      { type: 'text', text: 'describe this image' },
      {
        type: 'image_url',
        image_url: {
          url: 'data:image/png;base64,abc123==',
          detail: 'auto',
        },
      },
    ])
  })

  it('should execute tool calls in simple mode and continue conversation', async () => {
    executeMock.mockResolvedValueOnce('tool output text')
    createMock
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'need tool',
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'Read',
                    arguments: '{"path":"/tmp/a.txt"}',
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: 'done' } }],
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

    expect(result).toBe('need tooldone')
    expect(executeMock).toHaveBeenCalledWith(
      'Read',
      { path: '/tmp/a.txt' },
      expect.objectContaining({
        toolCallId: 'call_1',
        allowOnceTools: ['Read'],
        sessionApprovedTools: expect.any(Set),
      })
    )

    const executeOptions = executeMock.mock.calls[0][2]
    expect([...executeOptions.sessionApprovedTools]).toEqual(['Read'])

    const secondParams = createMock.mock.calls[1][0]
    expect(
      secondParams.messages.some(
        (msg: any) => msg.role === 'tool' && msg.content === 'tool output text'
      )
    ).toBe(true)
  })

  it('should use reasoning_effort for reasoning models in simple mode', async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: 'reasoned result' } }],
    })

    const result = await provider.sendMessage(
      [{ role: 'user', content: 'think deeply' }],
      {
        ...baseConfig,
        model: 'o1',
        thinkingEnabled: true,
      }
    )

    expect(result).toBe('reasoned result')
    const params = createMock.mock.calls[0][0]
    expect(params.reasoning_effort).toBe('medium')
    expect(params.tools).toBeUndefined()
    expect(params.temperature).toBeUndefined()
  })

  it('should stream response and emit usage summary', async () => {
    createMock.mockResolvedValueOnce(
      toAsyncIterable([
        {
          choices: [{ delta: { content: 'Hel' } }],
          usage: { prompt_tokens: 2, completion_tokens: 1 },
        },
        {
          choices: [{ delta: { content: 'lo' } }],
          usage: { prompt_tokens: 0, completion_tokens: 2 },
        },
      ])
    )

    const onChunk = vi.fn()
    const result = await provider.sendMessage(
      [{ role: 'user', content: 'hello' }],
      baseConfig,
      onChunk
    )

    expect(result).toBe('Hello')
    expect(onChunk).toHaveBeenCalledWith({ content: 'Hel', done: false })
    expect(onChunk).toHaveBeenCalledWith({ content: 'lo', done: false })
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
    expect(params.stream_options).toEqual({ include_usage: true })
  })

  it('should execute tool calls during streaming and continue with next round', async () => {
    executeMock.mockResolvedValueOnce('file content')
    createMock
      .mockResolvedValueOnce(
        toAsyncIterable([
          { choices: [{ delta: { content: 'Need ' } }] },
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: 'call_stream_1',
                      function: { name: 'Read', arguments: '{"path":"' },
                    },
                  ],
                },
              },
            ],
          },
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      function: { arguments: '/tmp/b.txt"}' },
                    },
                  ],
                },
              },
            ],
          },
        ])
      )
      .mockResolvedValueOnce(
        toAsyncIterable([
          {
            choices: [{ delta: { content: 'Done' } }],
            usage: { prompt_tokens: 1, completion_tokens: 1 },
          },
        ])
      )

    const onChunk = vi.fn()
    const result = await provider.sendMessage(
      [{ role: 'user', content: 'use tool' }],
      baseConfig,
      onChunk,
      {
        allowOnceTools: ['Read'],
      }
    )

    expect(result).toBe('Need Done')
    expect(executeMock).toHaveBeenCalledWith(
      'Read',
      { path: '/tmp/b.txt' },
      expect.objectContaining({
        toolCallId: 'call_stream_1',
      })
    )
    expect(onChunk).toHaveBeenCalledWith({
      content: '\n\n[Using tool: Read]\n',
      done: false,
    })
    expect(onChunk).toHaveBeenCalledWith({
      content: '[Tool result: file content...]\n\n',
      done: false,
    })
    expect(onChunk).toHaveBeenLastCalledWith({
      content: '',
      done: true,
      usage: {
        inputTokens: 1,
        outputTokens: 1,
      },
    })

    const secondParams = createMock.mock.calls[1][0]
    expect(
      secondParams.messages.some(
        (msg: any) => msg.role === 'tool' && msg.content === 'file content'
      )
    ).toBe(true)
  })

  it('should use reasoning_effort for reasoning models in stream mode', async () => {
    createMock.mockResolvedValueOnce(
      toAsyncIterable([{ choices: [{ delta: { content: 'ok' } }] }])
    )

    await provider.sendMessage(
      [{ role: 'user', content: 'think' }],
      {
        ...baseConfig,
        model: 'o3',
        thinkingEnabled: true,
      },
      () => {}
    )

    const params = createMock.mock.calls[0][0]
    expect(params.reasoning_effort).toBe('medium')
    expect(params.tools).toBeUndefined()
    expect(params.max_tokens).toBeUndefined()
  })
})

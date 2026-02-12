import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GenericProvider } from '../generic'
import type { AIConfig } from '../../../../../shared/types/ai'

const { executeMock } = vi.hoisted(() => ({
  executeMock: vi.fn(),
}))

vi.mock('../../tools/executor', () => ({
  ToolExecutor: class {
    execute = executeMock
  },
}))

function createJsonResponse(payload: any) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(payload),
    text: vi.fn().mockResolvedValue(JSON.stringify(payload)),
  }
}

function createStreamResponse(lines: string[]) {
  const encoder = new TextEncoder()
  let index = 0

  return {
    ok: true,
    status: 200,
    text: vi.fn().mockResolvedValue(''),
    body: {
      getReader: () => ({
        read: vi.fn(async () => {
          if (index >= lines.length) {
            return { done: true, value: undefined }
          }
          const value = encoder.encode(lines[index])
          index += 1
          return { done: false, value }
        }),
        releaseLock: vi.fn(),
      }),
    },
  }
}

describe('GenericProvider runtime behavior', () => {
  const provider = new GenericProvider()
  let fetchMock: ReturnType<typeof vi.fn>

  const baseConfig: AIConfig = {
    apiKey: 'test-key',
    model: 'custom-model',
    baseURL: 'https://example.ai',
  }

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    executeMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('should send non-stream request and return parsed content', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        choices: [{ message: { content: 'hello world' } }],
      })
    )

    const result = await provider.sendMessage(
      [{ role: 'user', content: 'hi' }],
      baseConfig
    )

    expect(result).toBe('hello world')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const firstCall = fetchMock.mock.calls[0]
    expect(firstCall[0]).toBe('https://example.ai/chat/completions')
    const request = firstCall[1] as RequestInit
    const body = JSON.parse(String(request.body))
    expect(body.stream).toBe(false)
    expect(body.model).toBe('custom-model')
  })

  it('should execute tool calls in non-stream mode and continue conversation', async () => {
    executeMock.mockResolvedValueOnce('tool output')
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          choices: [
            {
              message: {
                content: 'need tool',
                tool_calls: [
                  {
                    id: 'tool_call_1',
                    function: {
                      name: 'Read',
                      arguments: '{"path":"/tmp/demo.txt"}',
                    },
                  },
                ],
              },
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          choices: [{ message: { content: 'final answer' } }],
        })
      )

    const result = await provider.sendMessage(
      [{ role: 'user', content: 'run tool' }],
      baseConfig,
      undefined,
      {
        allowOnceTools: ['Read'],
        sessionApprovedTools: ['Read'],
      }
    )

    expect(result).toBe('need toolfinal answer')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(executeMock).toHaveBeenCalledWith(
      'Read',
      { path: '/tmp/demo.txt' },
      expect.objectContaining({
        toolCallId: 'tool_call_1',
        allowOnceTools: ['Read'],
        sessionApprovedTools: expect.any(Set),
      })
    )

    const executeOptions = executeMock.mock.calls[0][2]
    expect([...executeOptions.sessionApprovedTools]).toEqual(['Read'])

    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1].body))
    expect(
      secondBody.messages.some((msg: any) =>
        String(msg.content).includes('Tool Read result: tool output')
      )
    ).toBe(true)
  })

  it('should stream chunks and emit final usage summary', async () => {
    fetchMock.mockResolvedValueOnce(
      createStreamResponse([
        'data: {"choices":[{"delta":{"content":"Hel"}}],"usage":{"prompt_tokens":2,"completion_tokens":1}}\n',
        'data: {"choices":[{"delta":{"content":"lo"}}],"usage":{"prompt_tokens":0,"completion_tokens":3}}\n',
        'data: [DONE]\n',
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

    const lastChunk = onChunk.mock.calls[onChunk.mock.calls.length - 1][0]
    expect(lastChunk).toEqual({
      content: '',
      done: true,
      usage: {
        inputTokens: 2,
        outputTokens: 4,
      },
    })
  })

  it('should warn when thinking is enabled without anthropic format in stream mode', async () => {
    fetchMock.mockResolvedValueOnce(createStreamResponse(['data: [DONE]\n']))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await provider.sendMessage(
      [{ role: 'user', content: 'reason' }],
      { ...baseConfig, thinkingEnabled: true },
      () => {}
    )

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Thinking is enabled but apiFormat is not "anthropic-messages"'
      )
    )
  })

  it('should throw API error for unsuccessful response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue('unauthorized'),
    })

    await expect(
      provider.sendMessage([{ role: 'user', content: 'hello' }], baseConfig)
    ).rejects.toThrow('API error: 401 - unauthorized')
  })

  it('should throw readable-body error when stream response has no reader', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: null,
      text: vi.fn().mockResolvedValue(''),
    })

    await expect(
      provider.sendMessage(
        [{ role: 'user', content: 'hello' }],
        baseConfig,
        () => {}
      )
    ).rejects.toThrow('Response body is not readable')
  })
})

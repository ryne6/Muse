import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DeepSeekProvider } from '../deepseek'
import type { AIConfig } from '../../../../../shared/types/ai'

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

describe('DeepSeekProvider runtime', () => {
  const provider = new DeepSeekProvider()
  let fetchMock: ReturnType<typeof vi.fn>

  const baseConfig: AIConfig = {
    apiKey: 'deepseek-key',
    model: 'deepseek-chat',
  }

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('should expose reasoner model predicate', () => {
    expect((provider as any).isReasonerModel('deepseek-reasoner')).toBe(true)
    expect((provider as any).isReasonerModel('deepseek-chat')).toBe(false)
  })

  it('should send simple request with default baseURL', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        choices: [{ message: { content: 'hello from deepseek' } }],
      })
    )

    const result = await provider.sendMessage(
      [{ role: 'user', content: 'hi' }],
      baseConfig
    )

    expect(result).toBe('hello from deepseek')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.deepseek.com/v1/chat/completions'
    )

    const request = fetchMock.mock.calls[0][1] as RequestInit
    const body = JSON.parse(String(request.body))
    expect(body).toMatchObject({
      model: 'deepseek-chat',
      temperature: 1,
      max_tokens: 10000000,
    })
    expect(body).not.toHaveProperty('stream')
  })

  it('should use custom baseURL and generation options for simple request', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        choices: [{ message: { content: 'ok' } }],
      })
    )

    await provider.sendMessage([{ role: 'user', content: 'hi' }], {
      ...baseConfig,
      baseURL: 'http://localhost:11434/v1',
      temperature: 0.3,
      maxTokens: 512,
    })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:11434/v1/chat/completions'
    )
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body))
    expect(body.temperature).toBe(0.3)
    expect(body.max_tokens).toBe(512)
  })

  it('should parse stream content and reasoning chunks', async () => {
    fetchMock.mockResolvedValueOnce(
      createStreamResponse([
        'data: {"choices":[{"delta":{"reasoning_content":"think-1"}}]}\n',
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
        'data: {"choices":[{"delta":{"content":" DeepSeek"}}]}\n',
        'data: [DONE]\n',
      ])
    )

    const onChunk = vi.fn()
    const result = await provider.sendMessage(
      [{ role: 'user', content: 'hi' }],
      baseConfig,
      onChunk
    )

    expect(result).toBe('Hello DeepSeek')
    expect(onChunk).toHaveBeenCalledWith({
      content: '',
      done: false,
      thinking: 'think-1',
    })
    expect(onChunk).toHaveBeenCalledWith({ content: 'Hello', done: false })
    expect(onChunk).toHaveBeenCalledWith({ content: ' DeepSeek', done: false })
    expect(onChunk).toHaveBeenLastCalledWith({ content: '', done: true })

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body))
    expect(body.stream).toBe(true)
  })

  it('should ignore invalid stream chunks and continue parsing', async () => {
    const parseErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    fetchMock.mockResolvedValueOnce(
      createStreamResponse([
        'data: {invalid-json}\n',
        'data: {"choices":[{"delta":{"content":"ok"}}]}\n',
      ])
    )

    const result = await provider.sendMessage(
      [{ role: 'user', content: 'hi' }],
      baseConfig,
      () => {}
    )

    expect(result).toBe('ok')
    expect(parseErrorSpy).toHaveBeenCalledWith(
      'Failed to parse DeepSeek chunk:',
      expect.anything()
    )
  })

  it('should throw API error for failed simple response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: vi.fn().mockResolvedValue('rate limited'),
    })

    await expect(
      provider.sendMessage([{ role: 'user', content: 'hi' }], baseConfig)
    ).rejects.toThrow('DeepSeek API error: 429 - rate limited')
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
        [{ role: 'user', content: 'hi' }],
        baseConfig,
        () => {}
      )
    ).rejects.toThrow('Response body is not readable')
  })
})

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GeminiProvider } from '../gemini'
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

describe('GeminiProvider runtime', () => {
  const provider = new GeminiProvider()
  let fetchMock: ReturnType<typeof vi.fn>

  const baseConfig: AIConfig = {
    apiKey: 'gemini-key',
    model: 'gemini-1.5-flash',
  }

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('should expose thinking model predicate', () => {
    expect((provider as any).isThinkingModel('gemini-2.0-thinking')).toBe(true)
    expect((provider as any).isThinkingModel('gemini-pro')).toBe(false)
  })

  it('should use default baseURL and fallback model for simple request', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        candidates: [{ content: { parts: [{ text: 'gemini answer' }] } }],
      })
    )

    const result = await provider.sendMessage(
      [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'previous reply' },
      ],
      { ...baseConfig, model: '' }
    )

    expect(result).toBe('gemini answer')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=gemini-key'
    )

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body))
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'hello' }] },
      { role: 'model', parts: [{ text: 'previous reply' }] },
    ])
    expect(body.generationConfig).toEqual({
      temperature: 1,
      maxOutputTokens: 10000000,
    })
  })

  it('should convert multimodal content and custom config for simple request', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
      })
    )

    await provider.sendMessage(
      [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'describe this' },
            {
              type: 'image',
              mimeType: 'image/png',
              data: 'abc123==',
            },
          ],
        },
      ],
      {
        ...baseConfig,
        baseURL: 'http://localhost:9000/v1beta',
        temperature: 0.2,
        maxTokens: 2048,
      }
    )

    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:9000/v1beta/models/gemini-1.5-flash:generateContent?key=gemini-key'
    )
    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body))
    expect(body.contents[0]).toEqual({
      role: 'user',
      parts: [
        { text: 'describe this' },
        {
          inline_data: {
            mime_type: 'image/png',
            data: 'abc123==',
          },
        },
      ],
    })
    expect(body.generationConfig).toEqual({
      temperature: 0.2,
      maxOutputTokens: 2048,
    })
  })

  it('should parse stream thought and text parts', async () => {
    fetchMock.mockResolvedValueOnce(
      createStreamResponse([
        'data: {"candidates":[{"content":{"parts":[{"thought":"plan step"},{"text":"Hello"}],"role":"model"}}]}\n',
        'data: {"candidates":[{"content":{"parts":[{"text":" Gemini"}],"role":"model"}}]}\n',
        'data: [DONE]\n',
      ])
    )

    const onChunk = vi.fn()
    const result = await provider.sendMessage(
      [{ role: 'user', content: 'hi' }],
      baseConfig,
      onChunk
    )

    expect(result).toBe('Hello Gemini')
    expect(onChunk).toHaveBeenCalledWith({
      content: '',
      done: false,
      thinking: 'plan step',
    })
    expect(onChunk).toHaveBeenCalledWith({ content: 'Hello', done: false })
    expect(onChunk).toHaveBeenCalledWith({ content: ' Gemini', done: false })
    expect(onChunk).toHaveBeenLastCalledWith({ content: '', done: true })

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key=gemini-key&alt=sse'
    )
  })

  it('should ignore invalid stream chunks and continue parsing', async () => {
    const parseErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    fetchMock.mockResolvedValueOnce(
      createStreamResponse([
        'data: {invalid-json}\n',
        'data: {"candidates":[{"content":{"parts":[{"text":"ok"}],"role":"model"}}]}\n',
      ])
    )

    const result = await provider.sendMessage(
      [{ role: 'user', content: 'hi' }],
      baseConfig,
      () => {}
    )

    expect(result).toBe('ok')
    expect(parseErrorSpy).toHaveBeenCalledWith(
      'Failed to parse Gemini chunk:',
      expect.anything()
    )
  })

  it('should throw API error for failed simple response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue('bad request'),
    })

    await expect(
      provider.sendMessage([{ role: 'user', content: 'hi' }], baseConfig)
    ).rejects.toThrow('Gemini API error: 400 - bad request')
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

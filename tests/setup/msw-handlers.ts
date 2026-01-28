import { http, HttpResponse } from 'msw'

/**
 * MSW (Mock Service Worker) handlers
 * 用于 mock AI API 调用
 */
export const handlers = [
  // Mock Claude API
  http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
    const body = await request.json() as any

    return HttpResponse.json({
      id: 'msg_test_' + Date.now(),
      type: 'message',
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'This is a mocked Claude response for testing.'
        }
      ],
      model: body.model || 'claude-3-5-sonnet-20241022',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 10,
        output_tokens: 20
      }
    })
  }),

  // Mock OpenAI API
  http.post('https://api.openai.com/v1/chat/completions', async ({ request }) => {
    const body = await request.json() as any

    return HttpResponse.json({
      id: 'chatcmpl_test_' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: body.model || 'gpt-4',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a mocked OpenAI response for testing.'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      }
    })
  }),

  // Mock Google Gemini API
  http.post('https://generativelanguage.googleapis.com/v1beta/models/:model:generateContent', async ({ params }) => {
    return HttpResponse.json({
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'This is a mocked Gemini response for testing.'
              }
            ],
            role: 'model'
          },
          finishReason: 'STOP'
        }
      ]
    })
  }),

  // Mock DeepSeek API
  http.post('https://api.deepseek.com/v1/chat/completions', async ({ request }) => {
    const body = await request.json() as any

    return HttpResponse.json({
      id: 'chatcmpl_test_' + Date.now(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: body.model || 'deepseek-chat',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'This is a mocked DeepSeek response for testing.'
          },
          finish_reason: 'stop'
        }
      ]
    })
  })
]

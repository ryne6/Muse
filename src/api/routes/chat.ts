import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import { AIManager } from '../services/ai/manager'
import { ProviderValidator } from '../services/ai/validator'
import { AIError } from '../services/ai/errors'
import { ErrorCode } from '../../shared/types/error'
import type {
  AIMessage,
  AIConfig,
  AIStreamChunk,
} from '../../shared/types/ai'

const app = new Hono()
const aiManager = new AIManager()

/**
 * Helper to create error response from any error
 */
function createErrorResponse(error: unknown): { error: ReturnType<AIError['toAPIError']> } {
  const aiError = AIError.fromUnknown(error)
  return { error: aiError.toAPIError() }
}

interface ChatRequest {
  provider: string
  messages: AIMessage[]
  config: AIConfig
}

interface ValidateRequest {
  provider: string
  config: AIConfig
}

// 发送消息（流式）
app.post('/chat/stream', async (c) => {
  try {
    const body = await c.req.json<ChatRequest>()
    const { provider, messages, config } = body

    // Validate required fields
    if (!provider || !messages || !config) {
      const error = new AIError(ErrorCode.INVALID_REQUEST, 'Missing required fields: provider, messages, config')
      return c.json(createErrorResponse(error), error.httpStatus)
    }

    return stream(c, async (stream) => {
      try {
        await aiManager.sendMessage(provider, messages, config, async (chunk: AIStreamChunk) => {
          await stream.write(JSON.stringify(chunk) + '\n')
        })
      } catch (error) {
        const aiError = AIError.fromUnknown(error)
        await stream.write(JSON.stringify({ error: aiError.toAPIError() }) + '\n')
      }
    })
  } catch (error) {
    const aiError = AIError.fromUnknown(error)
    return c.json(createErrorResponse(aiError), aiError.httpStatus)
  }
})

// 发送消息（非流式）
app.post('/chat', async (c) => {
  try {
    const body = await c.req.json<ChatRequest>()
    const { provider, messages, config } = body

    // Validate required fields
    if (!provider || !messages || !config) {
      const error = new AIError(ErrorCode.INVALID_REQUEST, 'Missing required fields: provider, messages, config')
      return c.json(createErrorResponse(error), error.httpStatus)
    }

    const response = await aiManager.sendMessage(provider, messages, config)

    return c.json({
      content: response,
    })
  } catch (error) {
    const aiError = AIError.fromUnknown(error)
    return c.json(createErrorResponse(aiError), aiError.httpStatus)
  }
})

// 获取支持的 AI 提供商列表
app.get('/providers', (c) => {
  try {
    const providers = aiManager.getAvailableProviders()
    return c.json({ providers })
  } catch (error) {
    const aiError = AIError.fromUnknown(error)
    return c.json(createErrorResponse(aiError), aiError.httpStatus)
  }
})

// 获取指定提供商的默认模型
app.get('/providers/:provider/default-model', (c) => {
  try {
    const provider = c.req.param('provider')
    const defaultModel = aiManager.getDefaultModel(provider)
    return c.json({ defaultModel })
  } catch (error) {
    const aiError = AIError.fromUnknown(error)
    return c.json(createErrorResponse(aiError), aiError.httpStatus)
  }
})

// 获取指定提供商支持的模型列表
app.get('/providers/:provider/models', (c) => {
  try {
    const provider = c.req.param('provider')
    const models = aiManager.getSupportedModels(provider)
    return c.json({ models })
  } catch (error) {
    const aiError = AIError.fromUnknown(error)
    return c.json(createErrorResponse(aiError), aiError.httpStatus)
  }
})

// 验证 Provider 配置
app.post('/providers/validate', async (c) => {
  try {
    const body = await c.req.json<ValidateRequest>()
    const { provider, config } = body

    if (!provider || !config) {
      const error = new AIError(ErrorCode.INVALID_REQUEST, 'Missing required fields: provider, config')
      return c.json({ valid: false, error: error.toAPIError() }, error.httpStatus)
    }

    const result = await ProviderValidator.validateProvider(provider, config)

    return c.json(result)
  } catch (error) {
    const aiError = AIError.fromUnknown(error)
    return c.json(
      {
        valid: false,
        error: aiError.toAPIError(),
      },
      aiError.httpStatus
    )
  }
})

export default app

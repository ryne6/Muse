# F006 - 多 AI Provider 支持设计文档

## 1. 功能概述

扩展 AI Provider 支持，添加 OpenAI、Google Gemini 等主流 AI 模型。

### 核心功能
- OpenAI GPT 模型支持
- Provider 选择器 UI
- 多 Provider 配置管理
- 统一的工具调用接口
- Provider 特性兼容层

## 2. 新增 Providers

### 2.1 OpenAI Provider

**支持模型**:
- GPT-4 Turbo
- GPT-4
- GPT-3.5 Turbo

**特性**:
- Function calling (tools)
- Streaming
- Vision (未来)
- JSON mode

### 2.2 架构设计

```typescript
// 继承关系
BaseAIProvider (abstract)
  ├── ClaudeProvider (已实现)
  └── OpenAIProvider (新增)
```

## 3. OpenAI Provider 实现

### 3.1 Provider 类

```typescript
// src/api/services/ai/providers/openai.ts

import OpenAI from 'openai'
import { BaseAIProvider } from './base'
import type { AIMessage, AIConfig, AIStreamChunk } from '../../../../shared/types/ai'
import { fileSystemTools } from '../tools/definitions'
import { ToolExecutor } from '../tools/executor'

export class OpenAIProvider extends BaseAIProvider {
  readonly name = 'openai'
  readonly supportedModels = [
    'gpt-4-turbo-preview',
    'gpt-4',
    'gpt-4-32k',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
  ]

  async sendMessage(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<string> {
    if (!this.validateConfig(config)) {
      throw new Error('Invalid configuration')
    }

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    })

    try {
      if (onChunk) {
        return await this.streamResponseWithTools(client, messages, config, onChunk)
      } else {
        return await this.simpleResponseWithTools(client, messages, config)
      }
    } catch (error) {
      this.logError(error)
      throw error
    }
  }

  private async streamResponseWithTools(
    client: OpenAI,
    messages: AIMessage[],
    config: AIConfig,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<string> {
    let fullContent = ''
    const toolExecutor = new ToolExecutor()
    const conversationMessages: OpenAI.ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role === 'system' ? 'system' : m.role,
      content: m.content,
    }))

    while (true) {
      const stream = await client.chat.completions.create({
        model: config.model,
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature || 1,
        messages: conversationMessages,
        tools: this.convertTools(fileSystemTools),
        stream: true,
      })

      let currentContent = ''
      const toolCalls: any[] = []
      let currentToolCall: any = null

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta

        if (delta?.content) {
          currentContent += delta.content
          fullContent += delta.content
          onChunk({ content: delta.content, done: false })
        }

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.index !== undefined) {
              if (!toolCalls[toolCall.index]) {
                toolCalls[toolCall.index] = {
                  id: toolCall.id || '',
                  type: 'function',
                  function: {
                    name: toolCall.function?.name || '',
                    arguments: '',
                  },
                }
              }

              if (toolCall.function?.arguments) {
                toolCalls[toolCall.index].function.arguments += toolCall.function.arguments
              }
            }
          }
        }
      }

      // If no tools were called, we're done
      if (toolCalls.length === 0) {
        break
      }

      // Execute tools
      conversationMessages.push({
        role: 'assistant',
        content: currentContent || null,
        tool_calls: toolCalls,
      })

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)

        onChunk({
          content: `\n\n[Using tool: ${functionName}]\n`,
          done: false,
        })

        const result = await toolExecutor.execute(functionName, functionArgs)

        conversationMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        })

        onChunk({
          content: `[Tool result: ${result.slice(0, 100)}...]\n\n`,
          done: false,
        })
      }
    }

    onChunk({ content: '', done: true })
    return fullContent
  }

  private async simpleResponseWithTools(
    client: OpenAI,
    messages: AIMessage[],
    config: AIConfig
  ): Promise<string> {
    const toolExecutor = new ToolExecutor()
    const conversationMessages: OpenAI.ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role === 'system' ? 'system' : m.role,
      content: m.content,
    }))

    let finalText = ''

    while (true) {
      const response = await client.chat.completions.create({
        model: config.model,
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature || 1,
        messages: conversationMessages,
        tools: this.convertTools(fileSystemTools),
      })

      const message = response.choices[0]?.message

      if (message?.content) {
        finalText += message.content
      }

      if (!message?.tool_calls || message.tool_calls.length === 0) {
        break
      }

      // Execute tools
      conversationMessages.push(message as any)

      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)

        const result = await toolExecutor.execute(functionName, functionArgs)

        conversationMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result,
        })
      }
    }

    return finalText
  }

  private convertTools(tools: any[]): OpenAI.ChatCompletionTool[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }))
  }

  getDefaultModel(): string {
    return 'gpt-4-turbo-preview'
  }
}
```

### 3.2 注册 Provider

```typescript
// src/api/services/ai/factory.ts (updated)

import type { AIProvider } from '../../../shared/types/ai'
import { ClaudeProvider } from './providers/claude'
import { OpenAIProvider } from './providers/openai'

export class AIProviderFactory {
  private static providers: Map<string, AIProvider> = new Map([
    ['claude', new ClaudeProvider()],
    ['openai', new OpenAIProvider()],
  ])

  static getProvider(type: string): AIProvider {
    const provider = this.providers.get(type)
    if (!provider) {
      throw new Error(`Unknown provider type: ${type}`)
    }
    return provider
  }

  static registerProvider(type: string, provider: AIProvider): void {
    this.providers.set(type, provider)
  }

  static getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  static getProviderInfo(type: string): { name: string; models: string[] } | null {
    const provider = this.providers.get(type)
    if (!provider) return null

    return {
      name: provider.name,
      models: provider.supportedModels,
    }
  }
}
```

## 4. 配置类型更新

### 4.1 更新 ProviderConfig

```typescript
// src/shared/types/config.ts (updated)

export type ProviderType = 'claude' | 'openai' | 'custom'

export interface ProviderConfig {
  type: ProviderType
  apiKey: string
  model: string
  baseURL?: string
  temperature?: number
  maxTokens?: number
}

export interface AppConfig {
  currentProvider: string
  providers: Record<string, ProviderConfig>
}
```

## 5. Settings UI 更新

### 5.1 Provider 选择器

```typescript
// src/renderer/src/components/layout/Settings.tsx (updated)

export function Settings() {
  const [isOpen, setIsOpen] = useState(false)
  const { currentProvider, providers, updateProvider, setCurrentProvider } = useSettingsStore()

  const [selectedProvider, setSelectedProvider] = useState(currentProvider)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [temperature, setTemperature] = useState(1)
  const [baseURL, setBaseURL] = useState('')

  // Load current provider config
  useEffect(() => {
    if (isOpen && providers[selectedProvider]) {
      const config = providers[selectedProvider]
      setApiKey(config.apiKey || '')
      setModel(config.model || '')
      setTemperature(config.temperature || 1)
      setBaseURL(config.baseURL || '')
    }
  }, [isOpen, selectedProvider, providers])

  const handleSave = () => {
    updateProvider(selectedProvider, {
      type: selectedProvider as ProviderType,
      apiKey,
      model,
      temperature,
      baseURL: baseURL || undefined,
    })
    setCurrentProvider(selectedProvider)
    setIsOpen(false)
  }

  return (
    // ... modal structure
    <div className="p-4 space-y-4">
      {/* Provider Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">AI Provider</label>
        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        >
          <option value="claude">Claude (Anthropic)</option>
          <option value="openai">OpenAI (GPT)</option>
        </select>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-sm font-medium mb-2">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={`Enter your ${selectedProvider} API key`}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>

      {/* Model */}
      <div>
        <label className="block text-sm font-medium mb-2">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        >
          {selectedProvider === 'claude' ? (
            <>
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              <option value="claude-3-opus-20240229">Claude 3 Opus</option>
              <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
              <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
            </>
          ) : (
            <>
              <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </>
          )}
        </select>
      </div>

      {/* Base URL (optional) */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Base URL (Optional)
        </label>
        <input
          type="text"
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
          placeholder="https://api.openai.com/v1"
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">
          For custom endpoints or proxy servers
        </p>
      </div>

      {/* Temperature */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Temperature: {temperature}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>
    </div>
  )
}
```

### 5.2 SettingsStore 更新

```typescript
// src/renderer/src/stores/settingsStore.ts (updated)

const defaultProviders: Record<string, ProviderConfig> = {
  claude: {
    type: 'claude',
    apiKey: '',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 1,
    maxTokens: 4096,
  },
  openai: {
    type: 'openai',
    apiKey: '',
    model: 'gpt-4-turbo-preview',
    temperature: 1,
    maxTokens: 4096,
  },
}
```

## 6. Provider 特性对比

| Feature | Claude | OpenAI |
|---------|--------|--------|
| Function Calling | ✅ | ✅ |
| Streaming | ✅ | ✅ |
| System Messages | Limited | ✅ |
| Vision | ✅ | ✅ |
| JSON Mode | ❌ | ✅ |
| Max Tokens | 200K | 128K |

## 7. 工具调用兼容性

### Claude Format
```json
{
  "name": "read_file",
  "description": "...",
  "input_schema": {
    "type": "object",
    "properties": {...}
  }
}
```

### OpenAI Format
```json
{
  "type": "function",
  "function": {
    "name": "read_file",
    "description": "...",
    "parameters": {
      "type": "object",
      "properties": {...}
    }
  }
}
```

**解决方案**: 在各 Provider 内部转换格式

## 8. 错误处理

### 8.1 API Key 错误
- 统一错误消息格式
- 提示用户检查 Settings

### 8.2 Rate Limit
- 捕获 429 错误
- 显示友好提示
- 建议 retry 策略

### 8.3 Model 不存在
- 验证 model 是否在支持列表
- 提示选择正确的 model

## 9. 实现步骤

1. ✅ 创建设计文档
2. 安装 OpenAI SDK
3. 实现 OpenAIProvider
4. 更新 AIProviderFactory
5. 更新 ProviderConfig 类型
6. 更新 Settings UI
7. 更新 SettingsStore
8. 测试两个 provider
9. 测试切换功能
10. 文档更新

## 10. 测试用例

### Provider 切换
- [ ] 切换 Claude → OpenAI
- [ ] 切换 OpenAI → Claude
- [ ] 保存配置后刷新应用
- [ ] 验证配置持久化

### OpenAI 功能
- [ ] 基础对话
- [ ] 流式响应
- [ ] 工具调用 (read_file)
- [ ] 多轮对话
- [ ] 错误处理

### UI 测试
- [ ] Provider 下拉选择
- [ ] 模型列表自动更新
- [ ] API Key 输入
- [ ] Temperature 滑块
- [ ] Base URL 可选输入

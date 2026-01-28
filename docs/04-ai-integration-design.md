# 功能设计文档：多模型 AI 集成（DIP 架构）

**功能编号**: F003
**创建日期**: 2026-01-24
**依赖**: F002 (Chat 界面)
**状态**: 设计中
**优先级**: P0 (核心功能)

---

## 1. 功能概述

实现多 AI 模型支持，采用 **DIP（依赖倒置原则）** 架构设计，让 Muse 可以无缝集成多个 AI 提供商。

**支持的 AI 提供商**:
1. ✅ Anthropic Claude (优先)
2. ✅ OpenAI GPT
3. ✅ 其他提供商（可扩展）

---

## 2. 设计原则

### 2.1 依赖倒置原则 (DIP)

**核心思想**: 高层模块不应该依赖低层模块，两者都应该依赖抽象。

```
   ┌─────────────────────┐
   │   Chat UI (High)    │  ← 用户界面
   └──────────┬──────────┘
              │ depends on
              ▼
   ┌─────────────────────┐
   │  AIProvider         │  ← 抽象接口
   │  (Interface)        │
   └──────────┬──────────┘
              │ implements
      ┌───────┴───────┬──────────────┐
      ▼               ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│ Claude   │   │ OpenAI   │   │ Others   │
│ Provider │   │ Provider │   │ Provider │
└──────────┘   └──────────┘   └──────────┘
```

**好处**:
- ✅ 易于扩展（新增提供商无需修改现有代码）
- ✅ 易于测试（可以 mock 接口）
- ✅ 解耦合（UI 不关心具体实现）
- ✅ 符合开闭原则（对扩展开放，对修改封闭）

---

## 3. 接口设计

### 3.1 核心接口：AIProvider

```typescript
// src/shared/types/ai.ts

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIStreamChunk {
  content: string
  done: boolean
}

export interface AIConfig {
  apiKey: string
  model: string
  baseURL?: string
  temperature?: number
  maxTokens?: number
}

export interface AIProvider {
  // 提供商信息
  readonly name: string
  readonly supportedModels: string[]

  // 核心方法
  sendMessage(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<string>

  // 验证配置
  validateConfig(config: AIConfig): boolean

  // 获取默认模型
  getDefaultModel(): string
}
```

---

### 3.2 配置管理接口

```typescript
// src/shared/types/config.ts

export interface ProviderConfig {
  type: 'claude' | 'openai' | 'custom'
  apiKey: string
  model: string
  baseURL?: string
  temperature?: number
  maxTokens?: number
}

export interface AppConfig {
  currentProvider: string // 'claude' | 'openai' | ...
  providers: Record<string, ProviderConfig>
}
```

---

## 4. 实现设计

### 4.1 目录结构

```
src/
├── api/                              # API 服务
│   ├── services/
│   │   ├── ai/                       # AI 服务
│   │   │   ├── providers/            # AI 提供商实现
│   │   │   │   ├── base.ts           # 抽象基类
│   │   │   │   ├── claude.ts         # Claude 实现
│   │   │   │   ├── openai.ts         # OpenAI 实现
│   │   │   │   └── index.ts          # 统一导出
│   │   │   ├── factory.ts            # 提供商工厂
│   │   │   └── manager.ts            # AI 管理器
│   │   └── ...
│   └── ...
│
└── shared/
    └── types/
        ├── ai.ts                     # AI 相关类型
        └── config.ts                 # 配置类型
```

---

### 4.2 抽象基类

```typescript
// src/api/services/ai/providers/base.ts

import type { AIProvider, AIMessage, AIConfig, AIStreamChunk } from '@shared/types/ai'

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string
  abstract readonly supportedModels: string[]

  abstract sendMessage(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<string>

  abstract getDefaultModel(): string

  validateConfig(config: AIConfig): boolean {
    if (!config.apiKey || config.apiKey.trim() === '') {
      return false
    }
    if (!config.model || !this.supportedModels.includes(config.model)) {
      return false
    }
    return true
  }

  protected logError(error: unknown): void {
    console.error(`[${this.name}] Error:`, error)
  }
}
```

---

### 4.3 Claude 实现

```typescript
// src/api/services/ai/providers/claude.ts

import Anthropic from '@anthropic-ai/sdk'
import { BaseAIProvider } from './base'
import type { AIMessage, AIConfig, AIStreamChunk } from '@shared/types/ai'

export class ClaudeProvider extends BaseAIProvider {
  readonly name = 'claude'
  readonly supportedModels = [
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307'
  ]

  async sendMessage(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<string> {
    if (!this.validateConfig(config)) {
      throw new Error('Invalid configuration')
    }

    const client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL
    })

    try {
      if (onChunk) {
        // 流式响应
        return await this.streamResponse(client, messages, config, onChunk)
      } else {
        // 非流式响应
        return await this.simpleResponse(client, messages, config)
      }
    } catch (error) {
      this.logError(error)
      throw error
    }
  }

  private async streamResponse(
    client: Anthropic,
    messages: AIMessage[],
    config: AIConfig,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<string> {
    let fullContent = ''

    const stream = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature || 1,
      messages: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      })),
      stream: true
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        const content = chunk.delta.type === 'text_delta' ? chunk.delta.text : ''
        fullContent += content
        onChunk({ content, done: false })
      }
    }

    onChunk({ content: '', done: true })
    return fullContent
  }

  private async simpleResponse(
    client: Anthropic,
    messages: AIMessage[],
    config: AIConfig
  ): Promise<string> {
    const response = await client.messages.create({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      temperature: config.temperature || 1,
      messages: messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }))
    })

    const content = response.content[0]
    return content.type === 'text' ? content.text : ''
  }

  getDefaultModel(): string {
    return 'claude-3-5-sonnet-20241022'
  }
}
```

---

### 4.4 OpenAI 实现（未来）

```typescript
// src/api/services/ai/providers/openai.ts

import OpenAI from 'openai'
import { BaseAIProvider } from './base'
import type { AIMessage, AIConfig, AIStreamChunk } from '@shared/types/ai'

export class OpenAIProvider extends BaseAIProvider {
  readonly name = 'openai'
  readonly supportedModels = [
    'gpt-4',
    'gpt-4-turbo',
    'gpt-3.5-turbo'
  ]

  async sendMessage(
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<string> {
    // TODO: 实现 OpenAI 调用
    throw new Error('OpenAI provider not implemented yet')
  }

  getDefaultModel(): string {
    return 'gpt-4-turbo'
  }
}
```

---

### 4.5 Provider Factory

```typescript
// src/api/services/ai/factory.ts

import type { AIProvider } from '@shared/types/ai'
import { ClaudeProvider } from './providers/claude'
import { OpenAIProvider } from './providers/openai'

export class AIProviderFactory {
  private static providers: Map<string, AIProvider> = new Map([
    ['claude', new ClaudeProvider()],
    ['openai', new OpenAIProvider()]
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
}
```

---

### 4.6 AI Manager

```typescript
// src/api/services/ai/manager.ts

import { AIProviderFactory } from './factory'
import type { AIMessage, AIConfig, AIStreamChunk } from '@shared/types/ai'

export class AIManager {
  async sendMessage(
    providerType: string,
    messages: AIMessage[],
    config: AIConfig,
    onChunk?: (chunk: AIStreamChunk) => void
  ): Promise<string> {
    const provider = AIProviderFactory.getProvider(providerType)

    if (!provider.validateConfig(config)) {
      throw new Error('Invalid AI configuration')
    }

    return await provider.sendMessage(messages, config, onChunk)
  }

  getDefaultModel(providerType: string): string {
    const provider = AIProviderFactory.getProvider(providerType)
    return provider.getDefaultModel()
  }

  getSupportedModels(providerType: string): string[] {
    const provider = AIProviderFactory.getProvider(providerType)
    return provider.supportedModels
  }
}
```

---

## 5. API 路由设计

### 5.1 Hono 路由

```typescript
// src/api/routes/chat.ts

import { Hono } from 'hono'
import { AIManager } from '../services/ai/manager'
import { stream } from 'hono/streaming'

const app = new Hono()
const aiManager = new AIManager()

// 发送消息（流式）
app.post('/chat/stream', async (c) => {
  const { provider, messages, config } = await c.req.json()

  return stream(c, async (stream) => {
    await aiManager.sendMessage(
      provider,
      messages,
      config,
      async (chunk) => {
        await stream.write(JSON.stringify(chunk) + '\n')
      }
    )
  })
})

// 发送消息（非流式）
app.post('/chat', async (c) => {
  const { provider, messages, config } = await c.req.json()

  const response = await aiManager.sendMessage(provider, messages, config)

  return c.json({ response })
})

// 获取支持的模型
app.get('/models/:provider', (c) => {
  const provider = c.req.param('provider')
  const models = aiManager.getSupportedModels(provider)
  return c.json({ models })
})

export default app
```

---

## 6. 前端集成

### 6.1 Settings Store

```typescript
// src/renderer/src/stores/settingsStore.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsStore {
  // 当前提供商
  currentProvider: 'claude' | 'openai'

  // 配置
  apiKey: string
  model: string
  temperature: number
  maxTokens: number

  // Actions
  setProvider: (provider: 'claude' | 'openai') => void
  setApiKey: (key: string) => void
  setModel: (model: string) => void
  setTemperature: (temp: number) => void
  setMaxTokens: (tokens: number) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      currentProvider: 'claude',
      apiKey: '',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 1,
      maxTokens: 4096,

      setProvider: (provider) => set({ currentProvider: provider }),
      setApiKey: (key) => set({ apiKey: key }),
      setModel: (model) => set({ model }),
      setTemperature: (temp) => set({ temperature: temp }),
      setMaxTokens: (tokens) => set({ maxTokens: tokens })
    }),
    {
      name: 'muse-settings'
    }
  )
)
```

### 6.2 更新 ChatStore

```typescript
// 在 chatStore.ts 中添加 AI 调用

import { useSettingsStore } from './settingsStore'

// 添加方法
sendAIMessage: async (chatId: string, userMessage: string) => {
  const settings = useSettingsStore.getState()

  // 添加用户消息
  set((state) => ({
    messages: {
      ...state.messages,
      [chatId]: [
        ...(state.messages[chatId] || []),
        {
          id: nanoid(),
          role: 'user',
          content: userMessage,
          createdAt: Date.now()
        }
      ]
    }
  }))

  // 调用 API（通过 IPC）
  const response = await window.electron.sendMessage({
    provider: settings.currentProvider,
    messages: state.messages[chatId],
    config: {
      apiKey: settings.apiKey,
      model: settings.model,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens
    }
  })

  // 添加 AI 响应
  set((state) => ({
    messages: {
      ...state.messages,
      [chatId]: [
        ...state.messages[chatId],
        {
          id: nanoid(),
          role: 'assistant',
          content: response,
          createdAt: Date.now()
        }
      ]
    }
  }))
}
```

---

## 7. 实现步骤

### Step 1: 创建类型定义
- src/shared/types/ai.ts
- src/shared/types/config.ts

### Step 2: 实现 Provider 架构
- src/api/services/ai/providers/base.ts
- src/api/services/ai/providers/claude.ts
- src/api/services/ai/factory.ts
- src/api/services/ai/manager.ts

### Step 3: 实现 API 路由
- src/api/routes/chat.ts
- src/api/index.ts (启动 Hono 服务)

### Step 4: IPC 通信
- src/main/ipc/chat.ts (Main Process)
- src/preload/index.ts (暴露 API)

### Step 5: 前端集成
- src/renderer/src/stores/settingsStore.ts
- 更新 chatStore.ts
- 更新 ChatInput.tsx

### Step 6: Settings UI
- src/renderer/src/pages/Settings.tsx

### Step 7: 测试
- 测试 Claude 调用
- 测试流式响应
- 测试错误处理

---

## 8. 验收标准

- [x] 可以配置 AI 提供商（Claude/OpenAI）
- [x] 可以配置 API Key
- [x] 可以选择模型
- [x] 发送消息调用真实 AI
- [x] 支持流式响应
- [x] 错误处理完善
- [x] 架构可扩展（新增提供商容易）

---

## 9. 下一步

完成 F003 后，下一个功能是：
**F004: 文件系统工具（Read, Write, Edit, Bash）**

---

**文档结束**

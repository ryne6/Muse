# 自定义 Model ID 设计更新

## 问题
当前设计只支持预设的模型列表，限制了用户选择。用户无法使用：
- 新发布的模型
- 测试版模型 (preview)
- 自定义微调模型
- 第三方兼容 API 的模型

## 解决方案 (参考 LobeChat)

### 1. 模型配置结构

```typescript
// src/shared/types/config.ts (updated)

export interface ModelConfig {
  id: string          // model ID (e.g., "gpt-4-turbo-preview")
  name: string        // display name (e.g., "GPT-4 Turbo")
  contextLength?: number
  isCustom?: boolean  // 是否为用户自定义
}

export interface ProviderConfig {
  type: ProviderType
  apiKey: string
  model: string       // current selected model ID
  models?: ModelConfig[]  // custom models list
  baseURL?: string
  temperature?: number
  maxTokens?: number
}
```

### 2. UI 设计

#### 2.1 模型选择区域
```
┌─────────────────────────────────────┐
│ Model                               │
│ ┌─────────────────────────────────┐ │
│ │ gpt-4-turbo-preview        [x]  │ │ <- 下拉 + 输入框组合
│ └─────────────────────────────────┘ │
│                                     │
│ Preset Models:                      │
│ [GPT-4 Turbo]  [GPT-4]  [GPT-3.5]  │ <- 快速选择按钮
│                                     │
│ Custom Models:                      │
│ • my-custom-model           [Edit]  │
│ • gpt-4-1106-preview       [Edit]  │
│ [+ Add Custom Model]                │
└─────────────────────────────────────┘
```

#### 2.2 添加自定义模型对话框
```
┌─────────────────────────────────────┐
│ Add Custom Model                    │
├─────────────────────────────────────┤
│ Model ID *                          │
│ ┌─────────────────────────────────┐ │
│ │ gpt-4-1106-preview              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Display Name                        │
│ ┌─────────────────────────────────┐ │
│ │ GPT-4 Turbo (Nov 2023)          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Context Length (optional)           │
│ ┌─────────────────────────────────┐ │
│ │ 128000                          │ │
│ └─────────────────────────────────┘ │
│                                     │
│           [Cancel]  [Add Model]     │
└─────────────────────────────────────┘
```

### 3. 预设模型配置

```typescript
// src/shared/constants/models.ts

export const PRESET_MODELS = {
  claude: [
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      contextLength: 200000,
    },
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      contextLength: 200000,
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      contextLength: 200000,
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      contextLength: 200000,
    },
  ],
  openai: [
    {
      id: 'gpt-4-turbo-preview',
      name: 'GPT-4 Turbo Preview',
      contextLength: 128000,
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      contextLength: 128000,
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      contextLength: 8192,
    },
    {
      id: 'gpt-4-32k',
      name: 'GPT-4 32K',
      contextLength: 32768,
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      contextLength: 16385,
    },
  ],
}
```

### 4. Settings UI 实现

```typescript
// src/renderer/src/components/layout/Settings.tsx

function ModelSelector({
  provider,
  selectedModel,
  customModels = [],
  onModelChange,
  onAddModel,
  onRemoveModel
}) {
  const [showCustomDialog, setShowCustomDialog] = useState(false)
  const [isCustomInput, setIsCustomInput] = useState(false)
  const [customModelId, setCustomModelId] = useState('')

  const presetModels = PRESET_MODELS[provider] || []
  const allModels = [...presetModels, ...customModels]

  return (
    <div className="space-y-3">
      {/* Model Input/Select */}
      <div>
        <label className="block text-sm font-medium mb-2">Model</label>
        <div className="flex gap-2">
          {isCustomInput ? (
            <input
              type="text"
              value={customModelId}
              onChange={(e) => {
                setCustomModelId(e.target.value)
                onModelChange(e.target.value)
              }}
              placeholder="Enter custom model ID"
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
          ) : (
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            >
              {allModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                  {model.contextLength && ` (${model.contextLength / 1000}K)`}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomInput(!isCustomInput)}
          >
            {isCustomInput ? 'Select' : 'Custom'}
          </Button>
        </div>
      </div>

      {/* Preset Models Quick Select */}
      <div>
        <div className="text-xs text-muted-foreground mb-2">Quick Select:</div>
        <div className="flex flex-wrap gap-2">
          {presetModels.slice(0, 4).map((model) => (
            <Button
              key={model.id}
              variant={selectedModel === model.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => onModelChange(model.id)}
              className="text-xs"
            >
              {model.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Models Management */}
      {customModels.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-2">Custom Models:</div>
          <div className="space-y-1">
            {customModels.map((model) => (
              <div
                key={model.id}
                className="flex items-center justify-between p-2 rounded bg-secondary text-sm"
              >
                <span>
                  {model.name || model.id}
                  {model.contextLength && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({model.contextLength / 1000}K)
                    </span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveModel(model.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Model Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowCustomDialog(true)}
        className="w-full"
      >
        + Add Custom Model
      </Button>

      {/* Custom Model Dialog */}
      {showCustomDialog && (
        <CustomModelDialog
          provider={provider}
          onAdd={(model) => {
            onAddModel(model)
            setShowCustomDialog(false)
          }}
          onCancel={() => setShowCustomDialog(false)}
        />
      )}
    </div>
  )
}

function CustomModelDialog({ provider, onAdd, onCancel }) {
  const [modelId, setModelId] = useState('')
  const [modelName, setModelName] = useState('')
  const [contextLength, setContextLength] = useState('')

  const handleAdd = () => {
    if (!modelId.trim()) return

    onAdd({
      id: modelId.trim(),
      name: modelName.trim() || modelId.trim(),
      contextLength: contextLength ? parseInt(contextLength) : undefined,
      isCustom: true,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-sm mx-4 p-4">
        <h3 className="text-lg font-semibold mb-4">Add Custom Model</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              Model ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="e.g., gpt-4-1106-preview"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g., GPT-4 Turbo (Nov 2023)"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Context Length
            </label>
            <input
              type="number"
              value={contextLength}
              onChange={(e) => setContextLength(e.target.value)}
              placeholder="e.g., 128000"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!modelId.trim()}>
            Add Model
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### 5. SettingsStore 更新

```typescript
// src/renderer/src/stores/settingsStore.ts

interface SettingsStore {
  // ... existing fields

  addCustomModel: (provider: string, model: ModelConfig) => void
  removeCustomModel: (provider: string, modelId: string) => void
  getAvailableModels: (provider: string) => ModelConfig[]
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // ... existing state

      addCustomModel: (provider, model) =>
        set((state) => {
          const providerConfig = state.providers[provider]
          if (!providerConfig) return state

          const customModels = providerConfig.models || []
          // 避免重复
          if (customModels.find((m) => m.id === model.id)) {
            return state
          }

          return {
            providers: {
              ...state.providers,
              [provider]: {
                ...providerConfig,
                models: [...customModels, model],
              },
            },
          }
        }),

      removeCustomModel: (provider, modelId) =>
        set((state) => {
          const providerConfig = state.providers[provider]
          if (!providerConfig) return state

          return {
            providers: {
              ...state.providers,
              [provider]: {
                ...providerConfig,
                models: (providerConfig.models || []).filter(
                  (m) => m.id !== modelId
                ),
              },
            },
          }
        }),

      getAvailableModels: (provider) => {
        const state = get()
        const presetModels = PRESET_MODELS[provider] || []
        const customModels = state.providers[provider]?.models || []
        return [...presetModels, ...customModels]
      },
    }),
    {
      name: 'muse-settings',
    }
  )
)
```

### 6. 使用场景

#### 场景 1: 使用新发布的模型
```
用户听说 OpenAI 发布了 gpt-4-turbo-2024-04-09
1. 打开 Settings
2. 点击 "Custom" 按钮
3. 输入: gpt-4-turbo-2024-04-09
4. 保存并使用
```

#### 场景 2: 添加微调模型
```
用户有自己微调的模型 ft:gpt-3.5-turbo:my-org:custom-suffix
1. 打开 Settings
2. 点击 "+ Add Custom Model"
3. Model ID: ft:gpt-3.5-turbo:my-org:custom-suffix
4. Display Name: My Fine-tuned Model
5. 添加成功，出现在列表中
```

#### 场景 3: 使用第三方 API
```
用户使用 OpenAI 兼容的第三方服务，有特殊模型名
1. 设置 Base URL 为第三方地址
2. 添加自定义模型 ID
3. 正常使用
```

### 7. 优势

✅ **灵活性**: 支持任意 model ID
✅ **便捷性**: 预设模型快速选择
✅ **可扩展性**: 轻松添加新模型
✅ **用户友好**: 清晰的 UI，易于操作
✅ **持久化**: 自定义模型保存在配置中

### 8. 与 LobeChat 对比

| Feature | LobeChat | Muse (设计) |
|---------|----------|-------------|
| 自定义 Model ID | ✅ | ✅ |
| 预设模型列表 | ✅ | ✅ |
| 快速选择按钮 | ✅ | ✅ |
| 模型管理界面 | ✅ | ✅ |
| Context Length 显示 | ✅ | ✅ |
| 模型分组 | ✅ | 待实现 |

### 9. 实现优先级

**高优先级** (立即实现):
- ✅ 自定义 model ID 输入
- ✅ 预设模型快速选择
- ✅ 添加/删除自定义模型

**中优先级** (后续优化):
- ⏳ 模型分组 (GPT-4 系列, GPT-3.5 系列)
- ⏳ 模型搜索/过滤
- ⏳ 从 URL 导入模型列表

**低优先级** (未来增强):
- ⏳ 模型性能评分
- ⏳ 推荐模型
- ⏳ 社区共享模型配置

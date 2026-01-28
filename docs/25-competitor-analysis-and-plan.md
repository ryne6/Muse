# 竞品功能对比与实现计划

## 🔍 竞品功能分析（基于截图）

### 截图 1：聊天界面
**关键功能**：
1. ⭐ **聊天中模型选择器** - 可以在聊天界面直接切换模型
2. 模型搜索功能
3. 温度显示（0.25）
4. 模型列表带版本号和时间戳
5. 当前选中模型高亮显示
6. 支持多个 Claude 版本（opus-4-5, sonnet-4-5, haiku-4-5）

### 截图 2：设置界面（提供商管理）
**关键功能**：
1. ⭐ **多提供商管理** - 可以配置多个 AI 提供商
2. ⭐ **提供商启用/禁用** - 每个提供商可以独立开关
3. ⭐ **自定义提供商** - 支持添加自定义 ACP Provider
4. **模型 Fetch** - 可以从 API 获取模型列表
5. 模型搜索和过滤
6. 显示模型数量（111 models）
7. 支持的提供商：
   - OpenAI
   - Anthropic
   - Google Gemini
   - AiHubMix
   - DeepSeek
   - Moonshot
   - Z.AI Coding Plan
   - OpenRouter
8. **设置分类清晰** - 左侧有详细的设置菜单

---

## 📋 Muse vs 竞品功能对比

| 功能 | Muse (当前) | 竞品 | 优先级 |
|------|------------|------|--------|
| **聊天中切换模型** | ❌ 需要去 Settings | ✅ 聊天界面直接切换 | 🔥 高 |
| **多提供商管理** | ✅ 支持 Claude + OpenAI | ✅ 支持 8+ 提供商 | 🔥 高 |
| **提供商启用/禁用** | ❌ 只能切换 | ✅ 每个可以开关 | 🟡 中 |
| **自定义提供商** | ✅ 自定义 Base URL | ✅ 完整的自定义提供商 | 🟡 中 |
| **模型搜索** | ❌ 无 | ✅ 有 | 🟡 中 |
| **API Fetch 模型** | ❌ 预设列表 | ✅ 动态获取 | 🟢 低 |
| **温度显示** | ✅ 在 Settings | ✅ 聊天界面显示 | 🟡 中 |
| **自定义模型** | ✅ 支持 | ✅ 支持 | ✅ 已有 |
| **数据持久化** | ✅ localStorage | ✅ 可能用数据库 | 🔥 高 |

---

## 🎯 实现计划

### Phase 1: 数据库迁移（使用 Drizzle ORM）⭐ 最高优先级

#### 目标
将所有数据从 localStorage 迁移到 SQLite 数据库，使用 Drizzle ORM。

#### 技术选型
- **ORM**: Drizzle ORM
- **数据库**: Better-SQLite3（已安装）
- **迁移工具**: Drizzle Kit

#### 数据表设计
```typescript
// 1. conversations 表
{
  id: string (primary key)
  title: string
  createdAt: timestamp
  updatedAt: timestamp
  provider: string (nullable)
  model: string (nullable)
}

// 2. messages 表
{
  id: string (primary key)
  conversationId: string (foreign key)
  role: 'user' | 'assistant'
  content: text
  timestamp: timestamp
}

// 3. tool_calls 表
{
  id: string (primary key)
  messageId: string (foreign key)
  name: string
  input: json
}

// 4. tool_results 表
{
  id: string (primary key)
  toolCallId: string (foreign key)
  output: text
  isError: boolean
}

// 5. providers 表
{
  id: string (primary key)
  name: string (unique)
  type: string
  apiKey: string (encrypted)
  baseURL: string (nullable)
  enabled: boolean
  createdAt: timestamp
}

// 6. models 表
{
  id: string (primary key)
  providerId: string (foreign key)
  modelId: string
  name: string
  contextLength: integer (nullable)
  isCustom: boolean
  enabled: boolean
}

// 7. settings 表
{
  key: string (primary key)
  value: json
}
```

#### 实现步骤
1. ✅ 安装依赖
   ```bash
   npm install drizzle-orm
   npm install -D drizzle-kit
   ```

2. ✅ 配置 Drizzle
   - 创建 `drizzle.config.ts`
   - 创建 `src/main/db/schema.ts`
   - 创建 `src/main/db/index.ts`

3. ✅ 定义数据表 Schema

4. ✅ 创建迁移
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. ✅ 创建数据库服务层
   - ConversationService ✅
   - MessageService ✅
   - ProviderService ✅
   - ModelService ✅
   - SettingsService ✅

6. ✅ 注册 IPC Handlers
   - 35+ IPC channels for database operations

7. ⏳ 更新 Zustand Store (Next)
   - 从数据库读取而非 localStorage
   - 写入数据库

8. ⏳ 数据迁移脚本 (Next)
   - 从 localStorage 迁移到数据库

---

### Phase 2: 聊天界面模型选择器 🔥 高优先级

#### 目标
在聊天输入框旁边添加模型选择下拉框，可以快速切换模型。

#### UI 设计
```
┌────────────────────────────────────────┐
│ [claude-opus-4-5 ▼]  [🌡️ 1.0]         │
│ ┌────────────────────────────────────┐ │
│ │ 输入消息...                         │ │
│ └────────────────────────────────────┘ │
│                              [Send →]  │
└────────────────────────────────────────┘
```

#### 功能点
1. 模型选择下拉框
2. 显示当前模型名称
3. 支持搜索模型
4. 温度快速调节按钮
5. 切换后立即生效

#### 组件
- `ModelSelector.tsx` - 模型选择器组件
- `TemperatureIndicator.tsx` - 温度指示器

---

### Phase 3: 提供商管理增强 🔥 高优先级

#### 目标
支持多个提供商，每个可以独立启用/禁用。

#### 功能点
1. 提供商列表显示
2. 启用/禁用开关
3. 添加自定义提供商
4. 提供商排序
5. 提供商图标
6. 状态指示（Active/Inactive）

#### 新增提供商
- Google Gemini
- DeepSeek
- Moonshot
- OpenRouter
- 通用自定义提供商

#### UI 组件
- `ProviderList.tsx` - 提供商列表
- `ProviderCard.tsx` - 单个提供商卡片
- `AddProviderDialog.tsx` - 添加提供商对话框

---

### Phase 4: 模型管理增强 🟡 中优先级

#### 功能点
1. **API Fetch 模型列表**
   - 从提供商 API 动态获取模型列表
   - 显示获取状态（loading/success/error）

2. **模型搜索和过滤**
   - 搜索框
   - 按提供商过滤
   - 按启用状态过滤

3. **模型启用/禁用**
   - 批量启用/禁用
   - 单个模型开关

4. **模型详情**
   - Context Length
   - 价格信息（可选）
   - 能力标签（vision, function calling等）

---

### Phase 5: 设置界面重构 🟡 中优先级

#### 目标
仿照竞品，创建更完善的设置界面。

#### 设置分类
1. **通用** - 基本设置
2. **提供商** - AI 提供商管理
3. **聊天** - 聊天相关设置
4. **快捷键** - 键盘快捷键
5. **用户界面** - UI 设置
6. **配色方案** - 主题设置
7. **数据** - 数据管理
8. **插件** - 插件系统（未来）

#### UI 布局
```
┌─────────┬──────────────────────────┐
│ 通用     │  设置内容区域              │
│ 提供商   │                          │
│ 聊天     │                          │
│ 快捷键   │                          │
│ 界面     │                          │
│ 主题     │                          │
│ 数据     │                          │
└─────────┴──────────────────────────┘
```

---

## 🚀 实施顺序

### Week 1: 数据库迁移（必须先完成）
- Day 1-2: 安装 Drizzle，设计 Schema
- Day 3-4: 实现数据库服务层
- Day 5: 数据迁移脚本
- Day 6: 测试和验证

### Week 2: UI 增强
- Day 1-2: 聊天界面模型选择器
- Day 3-4: 提供商管理增强
- Day 5: 模型管理增强
- Day 6: 测试集成

### Week 3: 设置重构
- Day 1-3: 设置界面重构
- Day 4-5: 新功能集成
- Day 6: 测试和优化

---

## 📦 依赖包

```bash
# 已安装
- better-sqlite3

# 需要安装
npm install drizzle-orm
npm install -D drizzle-kit
```

---

## 🎯 最小可行产品（MVP）

### 第一阶段重点
1. ✅ Drizzle ORM 集成
2. ✅ 数据库迁移完成
3. ✅ 聊天界面模型选择器

### 成功标准
- [ ] 所有数据从 localStorage 迁移到 SQLite
- [ ] 可以在聊天界面直接切换模型
- [ ] 数据持久化正常工作
- [ ] 性能无明显下降

---

## 🔧 技术挑战

### 1. 数据迁移
**挑战**: 从 localStorage 迁移到数据库不能丢失数据
**方案**:
- 写迁移脚本
- 先读 localStorage
- 写入数据库
- 验证数据完整性
- 清理 localStorage

### 2. Zustand + Drizzle 集成
**挑战**: Zustand 是前端 store，Drizzle 是后端 ORM
**方案**:
- 主进程使用 Drizzle
- 通过 IPC 暴露数据库操作
- Zustand store 调用 IPC
- 保持 Zustand 作为缓存层

### 3. 加密存储
**挑战**: API Key 需要加密存储
**方案**:
- 使用 `crypto` 模块
- 使用设备唯一标识作为密钥
- 加密后存入数据库

---

## 📊 预期成果

### 数据管理
- ✅ 所有数据存储在本地 SQLite
- ✅ 支持备份和恢复
- ✅ 数据查询性能优化
- ✅ 支持数据导出

### 用户体验
- ✅ 聊天中快速切换模型
- ✅ 更流畅的提供商管理
- ✅ 更强大的模型搜索
- ✅ 更清晰的设置界面

### 技术债务
- ✅ 从 localStorage 迁移到专业数据库
- ✅ 更好的数据结构设计
- ✅ 支持未来扩展（关系查询等）

---

## ⏭️ 下一步行动

1. 创建 Drizzle 配置文件
2. 定义数据库 Schema
3. 实现基础的数据库服务
4. 创建迁移脚本
5. 更新 Zustand Store

准备好开始实施了吗？

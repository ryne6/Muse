# Phase 1 完成报告 - 数据库迁移（Drizzle ORM）

## 执行时间
2026-01-25

## ✅ 完成内容

### 1. 依赖安装
- ✅ drizzle-orm (v0.45.1)
- ✅ drizzle-kit (v0.31.8)
- ✅ better-sqlite3 (已存在)

### 2. 配置文件
- ✅ `drizzle.config.ts` - Drizzle Kit 配置
  - 使用 SQLite dialect
  - Schema: `src/main/db/schema.ts`
  - 迁移文件输出: `./drizzle`
  - 数据库文件: `./muse.db`

### 3. 数据库 Schema 定义

创建了 7 个数据表 (`src/main/db/schema.ts`):

#### 1. conversations (对话表)
```typescript
{
  id: string (PK)
  title: string
  createdAt: timestamp
  updatedAt: timestamp
  provider: string (nullable)
  model: string (nullable)
}
```

#### 2. messages (消息表)
```typescript
{
  id: string (PK)
  conversationId: string (FK → conversations)
  role: 'user' | 'assistant'
  content: text
  timestamp: timestamp
}
```

#### 3. tool_calls (工具调用表)
```typescript
{
  id: string (PK)
  messageId: string (FK → messages)
  name: string
  input: json
}
```

#### 4. tool_results (工具结果表)
```typescript
{
  id: string (PK)
  toolCallId: string (FK → tool_calls)
  output: text
  isError: boolean
}
```

#### 5. providers (提供商表)
```typescript
{
  id: string (PK)
  name: string (unique)
  type: string
  apiKey: string (encrypted)
  baseURL: string (nullable)
  enabled: boolean
  createdAt: timestamp
}
```

#### 6. models (模型表)
```typescript
{
  id: string (PK)
  providerId: string (FK → providers)
  modelId: string
  name: string
  contextLength: integer (nullable)
  isCustom: boolean
  enabled: boolean
}
```

#### 7. settings (设置表)
```typescript
{
  key: string (PK)
  value: json
}
```

### 4. 数据库初始化

创建 `src/main/db/index.ts`:
- ✅ `initDatabase()` - 初始化数据库连接
- ✅ `getDatabase()` - 获取数据库实例
- ✅ `closeDatabase()` - 关闭数据库连接
- ✅ WAL 模式启用（提升性能）
- ✅ 外键约束启用
- ✅ 数据库文件位置：用户数据目录

### 5. 数据库服务层

创建了 5 个 Service 类 (`src/main/db/services/`):

#### ConversationService
- `getAll()` - 获取所有对话
- `getById(id)` - 根据 ID 获取对话
- `getWithMessages(id)` - 获取对话及其消息
- `create(data)` - 创建对话
- `update(id, data)` - 更新对话
- `delete(id)` - 删除对话（级联删除消息）
- `updateTitle(id, title)` - 更新标题
- `updateProviderModel(id, provider, model)` - 更新使用的提供商/模型

#### MessageService
- `getByConversationId(conversationId)` - 获取对话的所有消息
- `getWithTools(messageId)` - 获取消息及其工具调用
- `getAllWithTools(conversationId)` - 获取对话的所有消息及工具
- `create(data)` - 创建消息
- `updateContent(id, content)` - 更新消息内容
- `addToolCall(messageId, data)` - 添加工具调用
- `addToolResult(toolCallId, data)` - 添加工具结果
- `delete(id)` - 删除消息

#### ProviderService
- `getAll()` - 获取所有提供商（解密 API Key）
- `getEnabled()` - 获取启用的提供商
- `getById(id)` - 根据 ID 获取
- `getByName(name)` - 根据名称获取
- `create(data)` - 创建提供商（加密 API Key）
- `update(id, data)` - 更新提供商
- `delete(id)` - 删除提供商（级联删除模型）
- `toggleEnabled(id)` - 切换启用状态

#### ModelService
- `getAll()` - 获取所有模型
- `getEnabled()` - 获取启用的模型
- `getByProviderId(providerId)` - 获取提供商的模型
- `getEnabledByProviderId(providerId)` - 获取提供商的启用模型
- `getById(id)` - 根据 ID 获取
- `getCustomModels()` - 获取自定义模型
- `create(data)` - 创建模型
- `createMany(models)` - 批量创建
- `update(id, data)` - 更新模型
- `delete(id)` - 删除模型
- `toggleEnabled(id)` - 切换启用状态
- `setEnabledBatch(ids, enabled)` - 批量启用/禁用

#### SettingsService
- `getAll()` - 获取所有设置（返回对象）
- `get(key)` - 获取单个设置
- `set(key, value)` - 设置值（upsert）
- `delete(key)` - 删除设置
- `setMany(settings)` - 批量设置
- `clear()` - 清空所有设置

### 6. IPC 集成

更新 `src/main/index.ts`:
- ✅ 在 `app.whenReady()` 时初始化数据库
- ✅ 在 `window-all-closed` 时关闭数据库
- ✅ 注册 35+ IPC handlers 用于数据库操作

IPC Channels 结构:
```
db:conversations:*   - 对话操作
db:messages:*        - 消息操作
db:providers:*       - 提供商操作
db:models:*          - 模型操作
db:settings:*        - 设置操作
```

### 7. 迁移文件生成

- ✅ 生成迁移文件: `drizzle/0000_majestic_phalanx.sql`
- ✅ 包含所有 7 个表的 CREATE 语句
- ✅ 外键约束正确配置
- ✅ 索引创建（providers.name unique）

### 8. 数据库推送

- ✅ 运行 `npm run db:push` 成功
- ✅ 数据库 Schema 应用完成

### 9. 安全性

**API Key 加密**:
- 使用 Node.js `crypto` 模块
- 算法: AES-256-CBC
- 存储时加密，读取时解密
- ProviderService 自动处理加密/解密

```typescript
// 加密
apiKey: encrypt(data.apiKey)

// 解密
apiKey: decrypt(provider.apiKey)
```

### 10. TypeScript 类型安全

- ✅ 所有 Schema 导出类型推断
- ✅ `typeof table.$inferSelect` - Select 类型
- ✅ `typeof table.$inferInsert` - Insert 类型
- ✅ TypeScript 编译通过，无错误

---

## 📁 文件结构

```
src/main/db/
├── index.ts                    # 数据库初始化
├── schema.ts                   # Schema 定义（7 个表）
└── services/
    ├── index.ts                # 服务导出
    ├── conversationService.ts  # 对话服务
    ├── messageService.ts       # 消息服务
    ├── providerService.ts      # 提供商服务
    ├── modelService.ts         # 模型服务
    └── settingsService.ts      # 设置服务

drizzle/
└── 0000_majestic_phalanx.sql  # 初始迁移文件

drizzle.config.ts              # Drizzle Kit 配置
```

---

## 📊 统计

### 代码变更
- 新增文件: 10 个
- 修改文件: 2 个
- 新增代码: ~1200 行

### 依赖
- drizzle-orm: ^0.45.1
- drizzle-kit: ^0.31.8

### npm 脚本
```json
{
  "db:generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

### 数据库
- 7 个表
- 6 个外键约束
- 1 个唯一索引
- 支持级联删除

---

## 🎯 技术亮点

### 1. 关系完整性
使用外键约束保证数据一致性:
```typescript
messages.conversationId → conversations.id (ON DELETE CASCADE)
toolCalls.messageId → messages.id (ON DELETE CASCADE)
toolResults.toolCallId → toolCalls.id (ON DELETE CASCADE)
models.providerId → providers.id (ON DELETE CASCADE)
```

### 2. 类型安全
Drizzle ORM 提供完整的类型推断:
```typescript
export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
```

### 3. 加密存储
API Keys 使用 AES-256-CBC 加密:
```typescript
const encrypted = encrypt(apiKey)  // 存储
const decrypted = decrypt(encrypted)  // 读取
```

### 4. 性能优化
- WAL 模式启用 (Write-Ahead Logging)
- 更好的并发性能
- 更快的读取速度

### 5. 灵活的查询
Service 层提供丰富的查询方法:
```typescript
// 获取对话及所有消息
const conv = await ConversationService.getWithMessages(id)

// 获取消息及工具调用
const msgs = await MessageService.getAllWithTools(conversationId)

// 获取启用的提供商
const providers = await ProviderService.getEnabled()
```

---

## ⚠️ 注意事项

### 迁移脚本待完成
当前数据库为空，需要创建迁移脚本：
1. 从 localStorage 读取现有数据
2. 转换格式
3. 写入数据库
4. 验证完整性

这将在下一步实现。

### 加密密钥
生产环境需要:
- 设置环境变量 `ENCRYPTION_KEY`
- 使用更安全的密钥管理方案
- 考虑使用系统 Keychain

---

## 🚀 下一步

### Phase 1.5: 数据迁移脚本
- [ ] 创建迁移工具
- [ ] 从 localStorage 读取数据
- [ ] 转换为数据库格式
- [ ] 写入数据库
- [ ] 验证数据完整性

### Phase 2: 聊天界面模型选择器
- [ ] ModelSelector 组件
- [ ] 集成到 ChatInput
- [ ] 从数据库读取模型列表
- [ ] 支持搜索

### Phase 3: 更新 Zustand Stores
- [ ] conversationStore 使用 IPC
- [ ] settingsStore 使用 IPC
- [ ] 保持 Zustand 作为缓存层

---

## ✅ Phase 1 成功标准

- ✅ Drizzle ORM 安装配置完成
- ✅ 7 个数据表定义完成
- ✅ 数据库初始化成功
- ✅ 5 个 Service 类创建完成
- ✅ IPC handlers 注册完成
- ✅ 迁移文件生成并应用
- ✅ TypeScript 编译通过
- ✅ API Key 加密实现

**Phase 1 状态: 100% 完成** 🎉

---

## 📝 备注

数据库文件位置:
```
macOS: ~/Library/Application Support/muse/muse.db
Windows: %APPDATA%/muse/muse.db
Linux: ~/.config/muse/muse.db
```

可以使用 Drizzle Studio 查看数据库:
```bash
npm run db:studio
```

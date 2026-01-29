# 贡献指南

感谢您对 Muse 项目的兴趣！我们欢迎各种形式的贡献。

## 🤝 如何贡献

### 报告 Bug

如果您发现了 Bug，请：

1. 检查 [Issues](https://github.com/yourusername/muse/issues) 确认问题未被报告
2. 创建新的 Issue，包含:
   - 清晰的标题
   - 详细的描述
   - 重现步骤
   - 期望行为 vs 实际行为
   - 截图（如果适用）
   - 系统信息（操作系统、Muse 版本）
   - 错误日志

### 提交功能请求

1. 检查 [Issues](https://github.com/yourusername/muse/issues) 确认功能未被请求
2. 创建新的 Issue，标记为 "enhancement"
3. 描述:
   - 功能的用途
   - 解决的问题
   - 期望的行为
   - 可选的实现方式

### 贡献代码

#### 开发流程

1. **Fork 项目**
   ```bash
   # 点击 GitHub 上的 "Fork" 按钮
   git clone https://github.com/YOUR_USERNAME/muse.git
   cd muse
   ```

2. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b bugfix/your-bug-fix
   ```

3. **安装依赖**
   ```bash
   npm install
   ```

4. **开发**
   - 遵循代码风格
   - 添加必要的测试
   - 更新文档
   - 运行类型检查: `npm run typecheck`
   - 运行 Linting: `npm run lint`

5. **提交更改**
   ```bash
   git add .
   git commit -m "feat(providers): add Gemini provider support"
   ```

6. **推送到 Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **创建 Pull Request**
   - 访问 GitHub 仓库
   - 点击 "New Pull Request"
   - 填写 PR 模板
   - 等待 Review

#### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 添加测试
- `chore`: 构建/工具配置

**示例**:
```
feat(providers): add Gemini provider support

- Implement GeminiProvider class
- Add Gemini API integration
- Update provider factory

Closes #123
```

#### 代码风格

- **TypeScript**: 100% 类型覆盖，避免 `any`
- **组件**: 使用函数组件 + Hooks
- **命名**:
  - 组件: PascalCase (`ModelSelector`)
  - 函数: camelCase (`handleSubmit`)
  - 常量: UPPER_SNAKE_CASE (`PROVIDER_TEMPLATES`)
- **文件**:
  - 组件: PascalCase (`ModelSelector.tsx`)
  - 工具: camelCase (`validator.ts`)

#### 目录结构

新组件放在合适的目录:
- `src/renderer/src/components/chat/` - 聊天相关
- `src/renderer/src/components/settings/` - 设置相关
- `src/renderer/src/components/layout/` - 布局组件
- `src/renderer/src/components/ui/` - 基础 UI 组件

---

## 🧪 测试

### 运行测试

```bash
# 单元测试
npm run test

# 监听模式
npm run test:watch

# 覆盖率
npm run test:coverage

# E2E 测试
npm run test:e2e
```

### 编写测试

```typescript
// 示例: Provider 测试
describe('GeminiProvider', () => {
  it('should send message successfully', async () => {
    const provider = new GeminiProvider()
    const result = await provider.sendMessage(
      [{ role: 'user', content: 'Hi' }],
      { apiKey: 'test-key', model: 'gemini-pro' }
    )
    expect(result).toBeTruthy()
  })
})
```

---

## 📝 文档

### 更新文档

当您添加或修改功能时，请更新:

1. **代码注释** - 复杂逻辑添加注释
2. **类型定义** - 保持类型准确
3. **README** - 重大功能更新主 README
4. **USER_GUIDE.md** - 用户可见的功能
5. **DEVELOPMENT.md** - 开发相关的变更

### 文档风格

- 使用清晰的标题层次
- 提供代码示例
- 添加截图（UI 相关）
- 保持简洁明了

---

## 🏗️ 架构决策

### 添加新 AI Provider

1. **创建 Provider 类**
   ```typescript
   // src/api/services/ai/providers/yourprovider.ts
   export class YourProvider extends BaseAIProvider {
     readonly name = 'yourprovider'
     readonly supportedModels = ['model-1', 'model-2']

     getDefaultModel(): string {
       return 'model-1'
     }

     async sendMessage(messages, config, onChunk?) {
       // 实现 API 调用
     }
   }
   ```

2. **注册到 Factory**
   ```typescript
   // src/api/services/ai/factory.ts
   private static providers = new Map([
     // ...
     ['yourprovider', new YourProvider()],
   ])
   ```

3. **添加模板**
   ```typescript
   // src/renderer/src/components/settings/AddProviderDialog.tsx
   const PROVIDER_TEMPLATES = [
     // ...
     {
       name: 'Your Provider',
       type: 'yourprovider',
       baseURL: 'https://api.yourprovider.com/v1',
       models: ['model-1', 'model-2'],
     },
   ]
   ```

4. **添加图标和颜色**
   ```typescript
   // src/renderer/src/components/settings/ProviderCard.tsx
   const PROVIDER_ICONS = {
     // ...
     yourprovider: '🎯',
   }

   const PROVIDER_COLORS = {
     // ...
     yourprovider: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
   }
   ```

### 添加新 UI 组件

1. 基础组件放在 `src/renderer/src/components/ui/`
2. 业务组件放在对应的功能目录
3. 使用 Radix UI 作为基础（无障碍性）
4. 使用 TailwindCSS 样式
5. 保持组件小而专注

### 添加新数据库表

1. **更新 Schema**
   ```typescript
   // src/main/db/schema.ts
   export const yourTable = sqliteTable('your_table', {
     id: text('id').primaryKey(),
     // ...
   })
   ```

2. **生成迁移**
   ```bash
   npm run db:generate
   ```

3. **创建 Service**
   ```typescript
   // src/main/db/services/yourService.ts
   export class YourService {
     static async create(data) { /* ... */ }
     static async getAll() { /* ... */ }
     // ...
   }
   ```

4. **添加 IPC Handler**
   ```typescript
   // src/main/index.ts
   ipcMain.handle('db:your:create', async (_, data) => {
     return await YourService.create(data)
   })
   ```

---

## 🔍 Code Review 标准

PR 将根据以下标准审查:

### 必需
- ✅ TypeScript 编译通过
- ✅ Linting 通过
- ✅ 代码风格一致
- ✅ 无明显 Bug
- ✅ 更新相关文档

### 推荐
- ✅ 添加单元测试
- ✅ 添加注释
- ✅ 性能优化
- ✅ 无障碍性考虑

### 拒绝标准
- ❌ 破坏现有功能
- ❌ 添加不必要的依赖
- ❌ 代码质量差
- ❌ 无文档说明
- ❌ 安全风险

---

## 🎯 优先级标签

Issues 和 PRs 使用以下标签:

| 标签 | 说明 |
|------|------|
| `priority:critical` | 紧急修复，阻塞功能 |
| `priority:high` | 重要功能或修复 |
| `priority:medium` | 一般功能改进 |
| `priority:low` | 优化和小改进 |
| `good first issue` | 适合新贡献者 |
| `help wanted` | 需要帮助 |
| `documentation` | 文档相关 |
| `enhancement` | 新功能 |
| `bug` | Bug 修复 |

---

## 🌟 贡献者

感谢所有贡献者！

<!-- 贡献者列表将自动生成 -->

---

## 📞 联系

有问题？欢迎联系:

- **Discord**: https://discord.gg/...
- **Email**: dev@example.com
- **GitHub Discussions**: 提问和讨论

---

## 📜 行为准则

我们致力于提供一个友好、安全、欢迎的环境。请遵循:

1. **尊重**: 尊重所有贡献者
2. **包容**: 欢迎不同观点
3. **建设性**: 提供建设性反馈
4. **专业**: 保持专业和礼貌

违反行为准则可能导致禁止参与项目。

---

**感谢您的贡献！** 🎉

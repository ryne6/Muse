# Muse 多提供商 AI 助手 - 用户指南

## 📖 目录

1. [快速开始](#快速开始)
2. [系统要求](#系统要求)
3. [安装和运行](#安装和运行)
4. [添加 AI Provider](#添加-ai-provider)
5. [使用聊天功能](#使用聊天功能)
6. [管理 Provider](#管理-provider)
7. [常见问题](#常见问题)
8. [故障排除](#故障排除)

---

## 快速开始

Muse 是一个支持多个 AI 提供商的桌面聊天应用，让您可以在一个界面中使用多个 AI 模型。

### 5 分钟上手
1. 启动应用
2. 打开 Settings → Providers
3. 添加您的第一个 AI Provider (例如 Claude、OpenAI、Gemini)
4. 返回聊天界面，选择模型
5. 开始对话！

---

## 系统要求

### 硬件要求
- **处理器**: 64位，双核或更高
- **内存**: 4GB RAM (推荐 8GB+)
- **存储**: 500MB 可用空间
- **网络**: 互联网连接（用于 AI API 调用）

### 软件要求
- **操作系统**:
  - macOS 10.13 或更高
  - Windows 10 或更高
  - Linux (Ubuntu 18.04+ 或同等版本)
- **Node.js**: 18.0 或更高 (开发环境)
- **Bun**: 1.0 或更高 (运行 API Server)

---

## 安装和运行

### 开发环境

#### 1. 克隆仓库
```bash
git clone <repository-url>
cd Muse
```

#### 2. 安装依赖
```bash
npm install
```

#### 3. 启动 API Server
```bash
# 在终端 1
bun src/api/index.ts
```

您应该看到:
```
🚀 Hono API Server starting on port 3000
✅ Server running at http://localhost:3000
```

#### 4. 启动 Electron 应用
```bash
# 在终端 2
npm run dev
```

应用将自动打开。

### 生产构建

```bash
# 构建应用
npm run build

# 打包为可执行文件 (macOS/Windows/Linux)
npm run package
```

---

## 添加 AI Provider

### 支持的 Provider

Muse 内置支持以下 AI 提供商:

| Provider | 类型 | 需要 API Key | 默认端点 |
|----------|------|-------------|---------|
| **Claude** | claude | ✅ | api.anthropic.com |
| **OpenAI** | openai | ✅ | api.openai.com |
| **Google Gemini** | gemini | ✅ | generativelanguage.googleapis.com |
| **DeepSeek** | deepseek | ✅ | api.deepseek.com |
| **Moonshot** | moonshot | ✅ | api.moonshot.cn |
| **OpenRouter** | openrouter | ✅ | openrouter.ai/api/v1 |
| **Custom** | custom | ✅ | (自定义) |

### 添加步骤

#### 方法 1: 使用模板 (推荐)

1. **打开设置**
   - 点击左下角 ⚙️ 图标
   - 或按快捷键 `Cmd/Ctrl + ,`

2. **进入 Providers 标签**
   - 点击左侧 "Providers"

3. **添加 Provider**
   - 点击 "Add Provider" 按钮
   - 选择一个模板（例如 "Google Gemini"）

4. **填写信息**
   - **Name**: 自动填充（可修改）
   - **API Key**: 粘贴您的 API Key
   - **Base URL**: 自动填充（通常无需修改）

5. **测试连接** (可选但推荐)
   - 点击 "Test" 按钮
   - 等待验证结果
   - ✅ "Valid" = API Key 有效
   - ❌ "Invalid" = 需要检查 API Key

6. **完成添加**
   - 点击 "Add Provider"
   - 看到成功提示

#### 方法 2: 自定义 Provider

用于添加其他 OpenAI 兼容的 API:

1. 选择 "Custom Provider" 模板
2. 填写:
   - Name: 自定义名称
   - API Key: 您的 API Key
   - Base URL: 自定义 API 端点 (例如 `https://your-api.com/v1`)
3. 添加后需要手动创建模型

### 获取 API Key

#### Claude (Anthropic)
1. 访问 https://console.anthropic.com
2. 登录或注册账号
3. 进入 "API Keys"
4. 点击 "Create Key"
5. 复制 API Key (格式: `sk-ant-...`)

#### OpenAI
1. 访问 https://platform.openai.com
2. 登录账号
3. 进入 "API Keys"
4. 点击 "Create new secret key"
5. 复制 API Key (格式: `sk-...`)

#### Google Gemini
1. 访问 https://makersuite.google.com/app/apikey
2. 登录 Google 账号
3. 点击 "Create API Key"
4. 选择或创建项目
5. 复制 API Key (格式: `AIza...`)

#### DeepSeek
1. 访问 https://platform.deepseek.com
2. 注册账号
3. 进入 "API Keys"
4. 创建并复制 API Key

---

## 使用聊天功能

### 基础对话

#### 1. 选择模型
- 点击聊天输入框上方的模型选择器
- 按 Provider 分组显示所有可用模型
- 点击选择想要使用的模型

#### 2. 调整 Temperature
- 点击温度计 🌡️ 图标
- 拖动滑块调整 (0-2)
- 或选择预设值:
  - **Precise (0)**: 确定性输出，专注
  - **Balanced (1)**: 默认，通用
  - **Creative (1.5)**: 更多样化
  - **Very Creative (2)**: 最大创造力

#### 3. 发送消息
- 在输入框输入消息
- 按 `Enter` 发送
- 按 `Shift + Enter` 换行

#### 4. 查看响应
- AI 响应将流式显示
- 支持 Markdown 格式
- 代码块自动高亮

### 高级功能

#### 多轮对话
- 所有对话自动保存
- 上下文会被保留
- 可以随时继续之前的对话

#### 切换模型
- 在同一对话中切换不同模型
- 新消息将使用当前选中的模型
- 历史消息保留原始模型信息

#### 管理对话
- **创建新对话**: 点击左上角 "New Chat"
- **重命名对话**: 第一条消息自动作为标题
- **删除对话**: 点击对话列表中的删除按钮

---

## 管理 Provider

### 查看 Provider 列表

Settings → Providers 显示所有已配置的 Provider:

```
┌─────────────┬─────────────┐
│ 🤖 Claude   │ 🔮 OpenAI   │
│ ● Active    │ ○ Inactive  │
├─────────────┼─────────────┤
│ ✨ Gemini   │ 🔍 DeepSeek │
│ ● Active    │ ● Active    │
└─────────────┴─────────────┘
```

### 配置 Provider

1. 点击 Provider 卡片右上角 `⋮` 菜单
2. 选择 "Configure"
3. 修改:
   - API Key (可以显示/隐藏)
   - Base URL
4. 点击 "Save Changes"

### 启用/禁用 Provider

1. 点击 `⋮` 菜单
2. 选择 "Disable" 或 "Enable"
3. 状态徽章立即更新
4. 禁用的 Provider 不会在模型选择器中显示

### 删除 Provider

1. 点击 `⋮` 菜单
2. 选择 "Delete"
3. 确认删除
4. Provider 及其所有模型将被删除
5. 对话历史保留

---

## 常见问题

### Q: 支持哪些 AI 模型？

**A:** 完整列表:

**Claude (6 个模型)**
- claude-3-5-sonnet-20241022 (推荐)
- claude-3-opus-20240229
- claude-3-sonnet-20240229
- claude-3-haiku-20240307
- claude-2.1
- claude-2.0

**OpenAI (8 个模型)**
- gpt-4-turbo-preview
- gpt-4-turbo
- gpt-4
- gpt-4-32k
- gpt-3.5-turbo
- gpt-3.5-turbo-16k
- gpt-3.5-turbo-instruct

**Gemini (5 个模型)**
- gemini-pro
- gemini-pro-vision
- gemini-ultra
- gemini-1.5-pro
- gemini-1.5-flash

**DeepSeek (3 个模型)**
- deepseek-chat
- deepseek-coder
- deepseek-reasoner

### Q: API Key 是否安全？

**A:** 是的，非常安全:
- 使用 AES-256-CBC 加密存储
- 本地 SQLite 数据库
- 从不明文存储
- 仅在需要时解密

### Q: 数据存储在哪里？

**A:** 所有数据存储在本地:
- **数据库**: `~/Library/Application Support/Muse/muse.db` (macOS)
- **对话历史**: 数据库的 conversations 表
- **API Keys**: 加密存储在 providers 表
- **无云同步**: 数据不会离开您的设备

### Q: 是否支持离线使用？

**A:** 部分支持:
- ✅ 浏览历史对话
- ✅ 管理 Provider 配置
- ❌ 发送新消息（需要互联网连接调用 AI API）

### Q: 如何备份对话？

**A:** 两种方法:
1. **备份数据库文件**:
   - 复制 `muse.db` 文件到安全位置
   - 恢复时替换回来

2. **导出对话** (未来功能):
   - 将支持导出为 JSON/Markdown

### Q: 可以同时使用多个 API Key 吗？

**A:** 是的:
- 每个 Provider 可以配置独立的 API Key
- 可以添加多个同类型的 Provider (例如 2 个 Claude Provider)
- 只需给它们不同的名称

### Q: Temperature 参数如何影响响应？

**A:**
- **0 (Precise)**: 最确定性，总是选择最可能的词
- **1 (Balanced)**: 默认值，平衡创造力和准确性
- **1.5 (Creative)**: 更多样化，适合创意写作
- **2 (Very Creative)**: 最大随机性，可能产生意外结果

---

## 故障排除

### API Server 离线

**症状**: 侧边栏显示 "API Server Offline" (红色)

**解决方法**:
1. 检查 API Server 是否运行:
   ```bash
   # 应该在终端看到
   ✅ Server running at http://localhost:3000
   ```

2. 如果未运行，启动 Server:
   ```bash
   bun src/api/index.ts
   ```

3. 检查端口 3000 是否被占用:
   ```bash
   # macOS/Linux
   lsof -i :3000

   # Windows
   netstat -ano | findstr :3000
   ```

4. 如果被占用，杀掉进程或更改端口

### API Key 无效

**症状**: 发送消息时显示 "Invalid API key"

**解决方法**:
1. 打开 Settings → Providers
2. 点击对应 Provider 的 `⋮` → Configure
3. 使用 "Test" 按钮验证 API Key
4. 如果仍然无效:
   - 检查 API Key 是否正确复制（无多余空格）
   - 确认 API Key 未过期
   - 检查 API Key 权限
   - 尝试重新生成 API Key

### 速率限制

**症状**: "Rate limit exceeded"

**解决方法**:
1. 等待几分钟后重试
2. 检查您的 API 配额:
   - Claude: https://console.anthropic.com
   - OpenAI: https://platform.openai.com/usage
   - Gemini: https://makersuite.google.com
3. 考虑升级 API 计划
4. 使用其他 Provider 作为备份

### 连接超时

**症状**: "Request timeout"

**解决方法**:
1. 检查网络连接
2. 尝试访问 Provider 官网确认服务状态
3. 检查防火墙设置
4. 尝试更改 DNS (使用 8.8.8.8)
5. 如果使用代理，确保正确配置

### 对话未保存

**症状**: 关闭应用后对话丢失

**解决方法**:
1. 检查数据库文件是否存在:
   ```bash
   # macOS
   ls ~/Library/Application\ Support/Muse/muse.db
   ```

2. 检查文件权限
3. 查看控制台错误日志
4. 尝试重启应用

### 数据迁移失败

**症状**: 从旧版本升级后数据丢失

**解决方法**:
1. 检查 localStorage 是否有旧数据:
   - 打开开发者工具 (Cmd/Ctrl + Shift + I)
   - Application → Local Storage
   - 查找 `muse-conversations`

2. 手动触发迁移:
   - 删除 `muse.db` 文件
   - 重启应用
   - MigrationHandler 会自动检测并迁移

3. 如果仍有问题，联系支持

### 性能问题

**症状**: 应用卡顿或响应缓慢

**解决方法**:
1. 检查数据库大小:
   ```bash
   du -h ~/Library/Application\ Support/Muse/muse.db
   ```

2. 如果 > 100MB，考虑清理旧对话
3. 关闭其他占用资源的应用
4. 确保有足够的可用内存 (推荐 4GB+)
5. 重启应用

---

## 快捷键

### 全局
- `Cmd/Ctrl + ,` - 打开设置
- `Cmd/Ctrl + N` - 新建对话
- `Cmd/Ctrl + W` - 关闭窗口

### 聊天
- `Enter` - 发送消息
- `Shift + Enter` - 换行
- `Cmd/Ctrl + L` - 清空输入框
- `Cmd/Ctrl + K` - 打开模型选择器

### 导航
- `Cmd/Ctrl + [` - 上一个对话
- `Cmd/Ctrl + ]` - 下一个对话
- `Cmd/Ctrl + 1-9` - 快速切换到第 N 个对话

---

## 技术支持

### 报告问题
- GitHub Issues: https://github.com/yourusername/muse/issues
- Email: support@example.com

### 功能请求
- 在 GitHub Issues 中标记为 "enhancement"
- 提供详细的用例说明

### 社区
- Discord: https://discord.gg/...
- Twitter: @MuseAI

---

## 更新日志

### v0.1.0-beta (2026-01-25)
- ✨ 首次发布
- 🎉 支持 7 种 AI Provider
- 🔒 API Key 加密存储
- 💬 流式响应支持
- 📊 SQLite 数据库
- 🎨 现代化 UI
- ✅ Provider 验证功能
- 🔄 自动数据迁移

---

**祝您使用愉快！**

如有问题，请查看 [故障排除](#故障排除) 或联系技术支持。

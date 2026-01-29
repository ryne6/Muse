# Muse - 多提供商 AI 助手

<div align="center">

**一个支持多个 AI 提供商的现代化桌面聊天应用**

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-Latest-47848F)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB)](https://reactjs.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-C5F74F)](https://orm.drizzle.team/)

[特性](#-特性) • [快速开始](#-快速开始) • [文档](#-文档) • [技术栈](#️-技术栈) • [路线图](#️-路线图)

</div>

---

## ✨ 特性

### 🤖 多 AI 提供商支持
- **7 种内置 Provider**: Claude, OpenAI, Gemini, DeepSeek, Moonshot, OpenRouter, Custom
- **22+ 种模型**: 覆盖主流和新兴 AI 模型
- **无缝切换**: 在同一对话中轻松切换不同模型
- **统一界面**: 一个应用管理所有 AI 提供商

### 🔒 安全与隐私
- **本地存储**: 所有数据存储在本地 SQLite 数据库
- **API Key 加密**: AES-256-CBC 加密保护您的凭证
- **无云同步**: 数据永不离开您的设备
- **开源**: 完全透明的代码

### 💬 强大的聊天功能
- **流式响应**: 实时显示 AI 回复
- **多轮对话**: 自动保存上下文
- **Markdown 支持**: 代码高亮、格式化文本
- **对话管理**: 创建、重命名、删除对话
- **历史记录**: 永久保存所有对话

### 🎨 现代化 UI/UX
- **直观设计**: 简洁清晰的用户界面
- **实时验证**: 添加 Provider 前测试 API Key
- **状态监控**: API Server 健康实时显示
- **即时反馈**: Toast 通知和友好错误提示
- **响应式布局**: 适配各种屏幕尺寸

### ⚡ 开发者友好
- **100% TypeScript**: 完整类型安全
- **模块化架构**: 易于扩展新功能
- **Drizzle ORM**: 类型安全的数据库操作
- **热重载**: 快速开发体验
- **完整文档**: 详细的技术文档和用户指南

---

## 🚀 快速开始

### 先决条件

- Node.js 18+
- Bun 1.0+
- Git

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd Muse

# 安装依赖
npm install
```

### 运行

#### 开发模式

**终端 1: 启动 API Server**
```bash
bun src/api/index.ts
```

您应该看到:
```
🚀 Hono API Server starting on port 3000
✅ Server running at http://localhost:3000
```

**终端 2: 启动 Electron 应用**
```bash
npm run dev
```

#### 生产构建

```bash
# 构建应用
npm run build

# 打包为可执行文件
npm run package
```

---

## 📖 文档

### 使用指南

#### 1. 添加 AI Provider

1. 点击左下角 ⚙️ 打开设置
2. 进入 "Providers" 标签
3. 点击 "Add Provider"
4. 选择模板（例如 Google Gemini）
5. 输入 API Key
6. 点击 "Test" 验证连接 (推荐)
7. 点击 "Add Provider" 完成

#### 2. 开始对话

1. 在模型选择器中选择想要使用的模型
2. 调整 Temperature（可选，0-2）
3. 输入消息并按 Enter 发送
4. 享受流式 AI 响应

#### 3. 管理 Provider

- **配置**: 点击 Provider 卡片的 `⋮` → Configure
- **启用/禁用**: `⋮` → Enable/Disable
- **删除**: `⋮` → Delete

### 详细文档

- **[用户指南](docs/USER_GUIDE.md)** - 完整的使用说明
- **[完整实现报告](docs/00-complete-implementation-report.md)** - 技术实现详情
- **[Provider 管理](docs/30-phase3-provider-management-completion.md)** - Provider 管理功能
- **[API 实现](docs/35-phase35-provider-api-implementation.md)** - Provider API 实现
- **[端到端集成](docs/40-phase4-end-to-end-integration.md)** - 系统集成
- **[错误处理](docs/50-phase5-error-handling-ux.md)** - 错误处理和 UX

---

## 🎯 支持的 AI Provider

| Provider | 模型数 | 默认端点 | 获取 API Key |
|----------|--------|---------|--------------|
| **Claude** | 6 | api.anthropic.com | [console.anthropic.com](https://console.anthropic.com) |
| **OpenAI** | 8 | api.openai.com | [platform.openai.com](https://platform.openai.com) |
| **Gemini** | 5 | generativelanguage.googleapis.com | [makersuite.google.com](https://makersuite.google.com/app/apikey) |
| **DeepSeek** | 3 | api.deepseek.com | [platform.deepseek.com](https://platform.deepseek.com) |
| **Moonshot** | 动态 | api.moonshot.cn | [platform.moonshot.cn](https://platform.moonshot.cn) |
| **OpenRouter** | 动态 | openrouter.ai/api/v1 | [openrouter.ai](https://openrouter.ai) |
| **Custom** | 动态 | 自定义 | 您的 API 提供商 |

---

## 🏗️ 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **状态管理**: Zustand
- **UI 组件**: Radix UI
- **样式**: TailwindCSS
- **构建工具**: Vite

### 后端
- **Runtime**: Bun
- **Web 框架**: Hono
- **数据库**: SQLite + Drizzle ORM
- **进程间通信**: Electron IPC

### 桌面
- **框架**: Electron
- **安全**: Sandboxed renderer

---

## 📂 项目结构

```
Muse/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── db/                  # 数据库层 (Drizzle ORM)
│   │   │   ├── schema.ts        # Schema 定义
│   │   │   ├── services/        # CRUD Services
│   │   │   └── migration.ts     # 数据迁移
│   │   └── index.ts             # 主进程入口 + IPC
│   │
│   ├── renderer/                # React 前端
│   │   ├── components/
│   │   │   ├── chat/            # 聊天组件
│   │   │   ├── settings/        # 设置组件
│   │   │   ├── layout/          # 布局组件
│   │   │   └── ui/              # 基础 UI 组件
│   │   ├── stores/              # Zustand Stores
│   │   └── services/            # API 客户端
│   │
│   ├── api/                     # Hono API Server
│   │   ├── services/ai/
│   │   │   ├── providers/       # AI Provider 实现
│   │   │   ├── factory.ts       # Provider 工厂
│   │   │   ├── manager.ts       # AI Manager
│   │   │   └── validator.ts     # Provider 验证
│   │   └── routes/              # API 路由
│   │
│   └── shared/                  # 共享类型和常量
│       └── types/
│
├── docs/                        # 项目文档
└── drizzle/                     # 数据库迁移文件
```

---

## 🛠️ 开发

### 数据库管理

```bash
# 生成迁移文件
npm run db:generate

# 推送 Schema 到数据库
npm run db:push

# 打开 Drizzle Studio (可视化管理)
npm run db:studio
```

### 类型检查

```bash
npm run typecheck
```

### 构建

```bash
# 开发构建
npm run build:dev

# 生产构建
npm run build

# 打包
npm run package
```

---

## 🗺️ 路线图

### ✅ v0.1.0-beta (已完成 - 2026-01-25)
- [x] SQLite 数据库集成 (Drizzle ORM)
- [x] 数据迁移 (localStorage → SQLite)
- [x] Provider 管理 UI
- [x] 7 种 AI Provider 支持
- [x] 聊天界面模型选择器
- [x] Temperature 控制
- [x] 流式响应支持
- [x] API Key 加密存储
- [x] Provider 验证功能
- [x] 增强错误处理

### 🔄 v0.2.0 (计划中)
- [ ] 深色/浅色主题切换
- [ ] 导出对话 (JSON/Markdown)
- [ ] 搜索历史对话
- [ ] Token 使用统计
- [ ] 快捷键自定义
- [ ] 文件上传支持

### 📋 v0.3.0 (计划中)
- [ ] Function Calling 支持
- [ ] Vision 模型支持
- [ ] 音频输入/输出
- [ ] 插件系统
- [ ] 云同步 (可选)

### 🌟 v1.0.0 (计划中)
- [ ] 移动端支持
- [ ] 多语言界面
- [ ] 团队协作功能
- [ ] 企业版功能
- [ ] 高级分析和洞察

---

## 🐛 故障排除

### API Server 离线

```bash
# 确保 API Server 正在运行
bun src/api/index.ts

# 检查端口 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

### 数据库问题

```bash
# 查看数据库位置
# macOS: ~/Library/Application Support/Muse/muse.db
# Windows: %APPDATA%/Muse/muse.db
# Linux: ~/.config/Muse/muse.db

# 重置数据库
rm muse.db
npm run db:push
```

### API Key 无效

1. 在 Settings → Providers 中点击 "Test" 验证
2. 检查 API Key 是否正确复制 (无多余空格)
3. 确认 API Key 未过期
4. 检查 API Key 权限

更多帮助请参考 [用户指南](docs/USER_GUIDE.md#故障排除)。

---

## 🤝 贡献

欢迎贡献！请查看 [贡献指南](CONTRIBUTING.md)。

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 🙏 致谢

- [Electron](https://www.electronjs.org/) - 桌面应用框架
- [React](https://reactjs.org/) - UI 框架
- [Drizzle ORM](https://orm.drizzle.team/) - TypeScript ORM
- [Hono](https://hono.dev/) - Web 框架
- [Bun](https://bun.sh/) - JavaScript 运行时
- [Radix UI](https://www.radix-ui.com/) - 无障碍 UI 组件
- [TailwindCSS](https://tailwindcss.com/) - CSS 框架
- [Anthropic](https://anthropic.com) - Claude AI
- [OpenAI](https://openai.com) - GPT Models
- [Google](https://ai.google.dev) - Gemini AI
- [DeepSeek](https://www.deepseek.com) - DeepSeek AI

---

## 📧 联系

- **Issues**: [GitHub Issues](https://github.com/yourusername/muse/issues)
- **Email**: support@example.com
- **Discord**: https://discord.gg/...

---

<div align="center">

**由 Claude Code 构建 | 2026-01-25**

[文档](docs/) · [报告问题](https://github.com/yourusername/muse/issues) · [功能请求](https://github.com/yourusername/muse/issues)

</div>

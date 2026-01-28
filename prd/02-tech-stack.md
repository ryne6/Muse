# Muse 技术栈规划

**文档版本**: v1.0
**创建日期**: 2026-01-24
**状态**: ✅ 已确定

---

## 1. 整体技术架构

### 1.1 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     Muse Desktop App                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────┐          ┌─────────────────────┐   │
│  │  Renderer Process  │   IPC    │   Main Process      │   │
│  │  (React + Vite)    │◄────────►│   (Node.js)         │   │
│  │                    │          │                     │   │
│  │  - UI Components   │          │  - Window Manager   │   │
│  │  - State (Zustand) │          │  - IPC Handlers     │   │
│  │  - Router          │          │  - Security Control │   │
│  └────────────────────┘          └──────────┬──────────┘   │
│                                               │              │
│                                               │ HTTP         │
│                                               ▼              │
│                                  ┌────────────────────────┐ │
│                                  │   API Service          │ │
│                                  │   (Hono.js)           │ │
│                                  │                        │ │
│                                  │  - Claude SDK         │ │
│                                  │  - Tool System        │ │
│                                  │  - SQLite DB          │ │
│                                  │  - File Operations    │ │
│                                  │  - Sandbox Manager    │ │
│                                  └────────────────────────┘ │
│                                  (As Electron Sidecar)      │
└─────────────────────────────────────────────────────────────┘
```

**架构说明**：
- **三层架构**：Renderer（UI 层） → Main（系统层） → API（业务层）
- **前后端分离**：API 服务独立，便于测试和维护
- **Sidecar 模式**：API 打包为独立进程，Main Process 启动并管理
- **职责清晰**：UI 只管展示，Main 管系统调用，API 管业务逻辑

---

## 2. 技术栈清单

### 2.1 桌面框架

#### Electron `v28.x`
**选择理由**：
- ✅ 生态成熟，文档完善，社区活跃
- ✅ 开发效率高，纯 JavaScript/TypeScript
- ✅ 跨平台支持完善（Windows, macOS, Linux）
- ✅ 丰富的 API 和插件
- ❌ 包体积较大（~100-150 MB）
- ❌ 内存占用高

**未来优化路径**：
- MVP 阶段使用 Electron 快速开发
- 产品验证后可考虑 Tauri 重构（轻量版）

**相关包**：
```json
{
  "electron": "^28.0.0",
  "electron-builder": "^24.0.0",
  "electron-updater": "^6.1.0"
}
```

---

### 2.2 前端技术栈

#### React `v18.x`
**选择理由**：
- ✅ 最流行的 UI 框架，生态完善
- ✅ Hooks 开发体验好
- ✅ 社区资源丰富

#### TypeScript `v5.x`
**选择理由**：
- ✅ 类型安全，减少 bug
- ✅ 更好的 IDE 支持
- ✅ 大型项目必备

#### Vite `v5.x`
**选择理由**：
- ✅ 极快的热更新（HMR）
- ✅ 开箱即用的 TypeScript 支持
- ✅ 现代化构建工具

**相关包**：
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.3.0",
  "vite": "^5.0.0",
  "@vitejs/plugin-react": "^4.2.0",
  "vite-plugin-electron": "^0.28.0"
}
```

---

### 2.3 UI 框架与样式

#### Tailwind CSS `v3.x`
**选择理由**：
- ✅ 原子化 CSS，开发快速
- ✅ 可定制性强
- ✅ 打包体积小（按需）

#### shadcn/ui
**选择理由**：
- ✅ 现代设计，美观
- ✅ 基于 Radix UI（无障碍访问）
- ✅ 复制粘贴式组件，完全可控
- ✅ WorkAny 在用，经过验证

**相关包**：
```json
{
  "tailwindcss": "^3.4.0",
  "@tailwindcss/typography": "^0.5.10",
  "tailwind-merge": "^2.2.0",
  "clsx": "^2.1.0",
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-dropdown-menu": "^2.0.6",
  "@radix-ui/react-select": "^2.0.0",
  "lucide-react": "^0.312.0"
}
```

---

### 2.4 状态管理

#### Zustand `v4.x`
**选择理由**：
- ✅ 轻量级（~1KB）
- ✅ API 简单易用
- ✅ 无需 Provider 包裹
- ✅ 支持中间件（持久化、DevTools）

**替代方案**：
- Redux Toolkit（如果需要强大的 DevTools）
- Jotai（如果需要原子化状态）

**相关包**：
```json
{
  "zustand": "^4.4.7"
}
```

---

### 2.5 后端 API 服务

#### Hono.js `v4.x`
**选择理由**：
- ✅ 极快的性能（比 Express 快 10 倍）
- ✅ 轻量级（~12KB）
- ✅ TypeScript 原生支持
- ✅ Express 风格 API，易上手
- ✅ WorkAny 在用

**替代方案**：
- Express（如果需要更成熟的生态）
- Fastify（如果需要更多插件）

**相关包**：
```json
{
  "hono": "^4.0.0",
  "@hono/node-server": "^1.8.0"
}
```

---

### 2.6 AI 与工具系统

#### Anthropic SDK `v0.x`
**官方 SDK**：
```json
{
  "@anthropic-ai/sdk": "^0.17.0"
}
```

#### Claude Agent SDK（可选）
**如果需要更高级的 Agent 能力**：
```json
{
  "@anthropic-ai/agent-sdk": "^0.x.x"
}
```

**工具系统自研**：
- 参考 Claude Code 的工具设计
- 实现 Read、Write、Edit、Bash、Glob、Grep 等工具

---

### 2.7 数据存储

#### Better-SQLite3 `v9.x`
**选择理由**：
- ✅ 轻量级嵌入式数据库
- ✅ 无需安装额外服务
- ✅ 性能好（同步 API）
- ✅ 适合本地存储

**用途**：
- 会话历史
- 消息记录
- 工作区配置

**相关包**：
```json
{
  "better-sqlite3": "^9.3.0",
  "@types/better-sqlite3": "^7.6.8"
}
```

---

### 2.8 代码编辑器

#### Monaco Editor `v0.x`
**VS Code 同款编辑器**：
- ✅ 功能强大（语法高亮、自动补全、Diff）
- ✅ 支持多种语言
- ✅ 可定制主题

**相关包**：
```json
{
  "@monaco-editor/react": "^4.6.0",
  "monaco-editor": "^0.45.0"
}
```

---

### 2.9 Markdown 渲染

#### React-Markdown `v9.x`
**选择理由**：
- ✅ React 组件式使用
- ✅ 支持插件扩展
- ✅ 代码高亮支持

**相关包**：
```json
{
  "react-markdown": "^9.0.1",
  "remark-gfm": "^4.0.0",
  "rehype-highlight": "^7.0.0",
  "highlight.js": "^11.9.0"
}
```

---

### 2.10 工具库

#### 文件操作
```json
{
  "chokidar": "^3.5.3",       // 文件监听
  "fast-glob": "^3.3.2",      // 文件匹配（Glob 工具）
  "fs-extra": "^11.2.0"       // 增强文件操作
}
```

#### Git 操作
```json
{
  "simple-git": "^3.22.0"     // Git 命令封装
}
```

#### 工具函数
```json
{
  "lodash-es": "^4.17.21",    // 工具函数库
  "nanoid": "^5.0.4",         // UUID 生成
  "dayjs": "^1.11.10"         // 日期处理
}
```

#### 进程管理
```json
{
  "execa": "^8.0.1",          // 更好的 child_process
  "cross-env": "^7.0.3"       // 跨平台环境变量
}
```

---

### 2.11 开发工具

#### 代码规范
```json
{
  "eslint": "^8.56.0",
  "@typescript-eslint/eslint-plugin": "^6.19.0",
  "@typescript-eslint/parser": "^6.19.0",
  "eslint-config-prettier": "^9.1.0",
  "eslint-plugin-react": "^7.33.2",
  "eslint-plugin-react-hooks": "^4.6.0",
  "prettier": "^3.2.4"
}
```

#### 类型检查
```json
{
  "@types/node": "^20.11.0",
  "@types/react": "^18.2.48",
  "@types/react-dom": "^18.2.18"
}
```

#### 测试（可选，MVP 可暂时不用）
```json
{
  "vitest": "^1.2.0",
  "@testing-library/react": "^14.1.2"
}
```

---

## 3. 项目结构

```
muse/
├── src/
│   ├── main/                    # Electron Main Process
│   │   ├── index.ts            # 主进程入口
│   │   ├── window.ts           # 窗口管理
│   │   ├── ipc/                # IPC 处理器
│   │   │   ├── chat.ts
│   │   │   ├── files.ts
│   │   │   ├── workspace.ts
│   │   │   └── settings.ts
│   │   ├── api/                # API 服务启动器
│   │   │   └── sidecar.ts     # 启动 Hono API
│   │   └── utils/
│   │
│   ├── api/                     # 独立 API 服务 (Hono)
│   │   ├── index.ts            # API 入口
│   │   ├── routes/             # 路由
│   │   │   ├── chat.ts
│   │   │   ├── tools.ts
│   │   │   └── sessions.ts
│   │   ├── services/           # 业务逻辑
│   │   │   ├── claude.ts       # Claude SDK 封装
│   │   │   ├── tools/          # 工具系统
│   │   │   │   ├── read.ts
│   │   │   │   ├── write.ts
│   │   │   │   ├── edit.ts
│   │   │   │   ├── bash.ts
│   │   │   │   └── index.ts    # 工具注册
│   │   │   └── storage.ts      # SQLite 存储
│   │   └── types/              # 类型定义
│   │
│   ├── renderer/                # React UI
│   │   ├── src/
│   │   │   ├── main.tsx        # React 入口
│   │   │   ├── App.tsx
│   │   │   ├── components/     # UI 组件
│   │   │   │   ├── ui/         # shadcn/ui 组件
│   │   │   │   ├── chat/       # Chat 相关
│   │   │   │   ├── sidebar/    # 侧边栏
│   │   │   │   └── editor/     # 代码编辑器
│   │   │   ├── pages/          # 页面
│   │   │   │   ├── Chat.tsx
│   │   │   │   └── Settings.tsx
│   │   │   ├── stores/         # Zustand 状态
│   │   │   │   ├── chatStore.ts
│   │   │   │   ├── workspaceStore.ts
│   │   │   │   └── settingsStore.ts
│   │   │   ├── hooks/          # 自定义 Hooks
│   │   │   ├── utils/          # 工具函数
│   │   │   └── styles/         # 全局样式
│   │   ├── index.html
│   │   └── vite.config.ts
│   │
│   └── shared/                  # 共享类型和常量
│       ├── types/
│       └── constants/
│
├── resources/                   # 资源文件
│   ├── icon.png
│   └── icon.icns
│
├── scripts/                     # 构建脚本
│   ├── build.js
│   └── notarize.js             # macOS 签名
│
├── prd/                         # PRD 文档
│   ├── 01-product-overview.md
│   ├── 02-tech-stack.md        # 本文档
│   ├── 03-ui-design.md
│   └── 04-dev-guidelines.md
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── electron-builder.yml
├── .eslintrc.js
├── .prettierrc
└── README.md
```

---

## 4. 技术决策记录

### 4.1 为什么选 Electron 而不是 Tauri？

| 考量因素 | Electron | Tauri | 决策 |
|---------|----------|-------|------|
| 开发速度 | ⭐⭐⭐⭐⭐ 纯 JS/TS | ⭐⭐⭐ 需学 Rust | ✅ Electron |
| 生态成熟度 | ⭐⭐⭐⭐⭐ 非常成熟 | ⭐⭐⭐ 快速发展 | ✅ Electron |
| 包体积 | ❌ ~100-150 MB | ✅ ~20-50 MB | ⭐ Tauri |
| 性能 | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐⭐ 优秀 | ⭐ Tauri |
| 问题解决 | ⭐⭐⭐⭐⭐ 容易找答案 | ⭐⭐⭐ 相对较少 | ✅ Electron |

**最终决策**: **Electron**
**理由**:
1. MVP 阶段优先开发速度和稳定性
2. 团队对 JS/TS 更熟悉，Rust 有学习成本
3. 遇到问题容易找到解决方案
4. 包体积虽大，但对桌面应用可接受
5. 未来可考虑 Tauri 重构（优化版）

---

### 4.2 为什么前后端分离（API Sidecar）？

**传统方案**: Main Process 直接处理业务逻辑

**Sidecar 方案**: 独立 API 服务（Hono）

**Sidecar 优势**:
1. ✅ **职责分离**: Main Process 专注系统调用，API 专注业务
2. ✅ **易于测试**: API 可独立测试，无需启动 Electron
3. ✅ **代码复用**: API 可被其他客户端调用（未来 Web 版）
4. ✅ **性能隔离**: API 崩溃不影响 Main Process
5. ✅ **开发体验**: API 可独立开发和热更新

**WorkAny 验证**: WorkAny 使用此架构，证明可行

---

### 4.3 为什么选 shadcn/ui？

| 组件库 | 优势 | 劣势 | 适配度 |
|--------|------|------|--------|
| **shadcn/ui** | 现代设计、可定制、轻量 | 需手动复制组件 | ⭐⭐⭐⭐⭐ |
| Ant Design | 企业级、功能强大 | 样式传统、定制困难 | ⭐⭐⭐ |
| MUI | Material Design、成熟 | 样式固定、包体积大 | ⭐⭐ |
| 自己设计 | 完全自由 | 工作量巨大 | ⭐ |

**最终决策**: **shadcn/ui**
**理由**:
1. ✅ 极简对话风格需要现代设计（符合 PRD）
2. ✅ Tailwind CSS 生态，定制性强
3. ✅ WorkAny 在用，经过验证
4. ✅ 基于 Radix UI，无障碍访问好
5. ✅ 复制粘贴式，完全可控，不是 npm 依赖

---

### 4.4 为什么选 Zustand？

| 状态管理 | 包体积 | API 复杂度 | DevTools | 适配度 |
|---------|--------|-----------|----------|--------|
| **Zustand** | ~1KB | 简单 | 支持 | ⭐⭐⭐⭐⭐ |
| Redux Toolkit | ~10KB | 中等 | 强大 | ⭐⭐⭐⭐ |
| Jotai | ~3KB | 简单 | 支持 | ⭐⭐⭐⭐ |
| Context API | 0 | 简单 | 无 | ⭐⭐⭐ |

**最终决策**: **Zustand**
**理由**:
1. ✅ 轻量级，包体积小
2. ✅ API 简单，学习成本低
3. ✅ 无需 Provider，使用方便
4. ✅ 支持持久化中间件
5. ✅ Muse 状态管理不复杂，Zustand 足够

---

## 5. 性能优化策略

### 5.1 包体积优化
- ✅ 使用 Vite 的代码分割
- ✅ 按需加载 Monaco Editor
- ✅ Tailwind CSS 按需打包
- ✅ 压缩打包产物

**目标**: 精简版安装包 < 80 MB

---

### 5.2 启动速度优化
- ✅ 预编译 V8 快照
- ✅ 延迟加载非关键模块
- ✅ SQLite 数据库优化索引

**目标**: 冷启动 < 3 秒

---

### 5.3 内存优化
- ✅ 限制对话历史加载数量
- ✅ Monaco Editor 懒加载
- ✅ 图片资源懒加载

**目标**: 空闲内存占用 < 200 MB

---

## 6. 安全策略

### 6.1 Electron 安全
```typescript
// webPreferences 配置
{
  nodeIntegration: false,        // 禁用 Node.js 集成
  contextIsolation: true,        // 启用上下文隔离
  sandbox: true,                 // 启用沙箱
  webSecurity: true,             // 启用 Web 安全
  allowRunningInsecureContent: false
}
```

### 6.2 IPC 安全
- ✅ 使用 `contextBridge` 暴露有限 API
- ✅ 验证所有 IPC 消息参数
- ✅ 避免传递敏感信息

### 6.3 API Key 安全
- ✅ 使用 `safeStorage` 加密存储
- ✅ 仅在 Main Process 使用
- ✅ 不发送到 Renderer Process

---

## 7. 依赖版本锁定

**package.json 策略**:
```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

**版本管理**:
- 主要依赖使用 `^` (自动更新补丁版本)
- 关键依赖使用精确版本
- 定期更新依赖，检查安全漏洞

---

## 8. 下一步行动

- [ ] 初始化项目，安装依赖
- [ ] 搭建 Electron + Vite 开发环境
- [ ] 配置 TypeScript、ESLint、Prettier
- [ ] 配置 Tailwind CSS + shadcn/ui
- [ ] 搭建 Hono API 服务
- [ ] 实现 IPC 通信基础框架

---

**文档结束**

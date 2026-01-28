# Muse 开发配置指南

## 🔧 环境配置

### 必需软件

| 软件 | 版本要求 | 用途 | 安装命令 |
|------|---------|------|---------|
| Node.js | >= 18.0.0 | JavaScript 运行时 | https://nodejs.org |
| Bun | >= 1.0.0 | API Server 运行时 | `curl -fsSL https://bun.sh/install \| bash` |
| Git | 最新 | 版本控制 | https://git-scm.com |

### 可选软件

| 软件 | 用途 |
|------|------|
| Drizzle Kit | 数据库可视化管理 |
| VSCode | 推荐的代码编辑器 |
| React DevTools | React 调试 |

---

## 📦 依赖安装

### 生产依赖
```bash
npm install
```

主要依赖:
- `electron` - 桌面应用框架
- `react` + `react-dom` - UI 框架
- `zustand` - 状态管理
- `drizzle-orm` - TypeScript ORM
- `better-sqlite3` - SQLite 数据库
- `hono` - Web 框架

### 开发依赖
自动安装的开发工具:
- `typescript` - 类型检查
- `vite` - 构建工具
- `tailwindcss` - CSS 框架
- `drizzle-kit` - 数据库迁移工具
- `electron-builder` - 打包工具

---

## 🚀 启动脚本

### macOS/Linux
```bash
# 使用启动脚本 (推荐)
./start-dev.sh

# 或手动启动
# 终端 1
bun src/api/index.ts

# 终端 2
npm run dev
```

### Windows
```bash
# 使用启动脚本 (推荐)
start-dev.bat

# 或手动启动
# 终端 1
bun src\api\index.ts

# 终端 2
npm run dev
```

---

## 🗄️ 数据库配置

### 数据库文件位置

| 平台 | 路径 |
|------|------|
| macOS | `~/Library/Application Support/Muse/muse.db` |
| Windows | `%APPDATA%\Muse\muse.db` |
| Linux | `~/.config/Muse/muse.db` |

### 数据库管理命令

```bash
# 生成迁移文件
npm run db:generate

# 推送 Schema 到数据库
npm run db:push

# 打开 Drizzle Studio (http://localhost:4983)
npm run db:studio

# 查看数据库 Schema
sqlite3 muse.db ".schema"

# 导出数据
sqlite3 muse.db ".dump" > backup.sql

# 恢复数据
sqlite3 muse.db < backup.sql
```

---

## 🔐 环境变量

Muse 不需要 `.env` 文件，所有配置通过 UI 管理。

### API Server 配置

可通过环境变量自定义 API Server:

```bash
# 自定义端口 (默认 3000)
PORT=3001 bun src/api/index.ts

# 自定义日志级别
LOG_LEVEL=debug bun src/api/index.ts
```

### 加密密钥

数据库加密使用的密钥在 `src/main/db/crypto.ts` 中定义。

**生产环境**: 建议使用环境变量:
```bash
export MUSE_ENCRYPTION_KEY="your-32-byte-hex-string"
```

---

## 🧪 测试配置

### 单元测试 (计划中)
```bash
npm run test
npm run test:watch
npm run test:coverage
```

### E2E 测试 (计划中)
```bash
npm run test:e2e
```

### 类型检查
```bash
npm run typecheck
npm run typecheck:watch
```

---

## 🎨 开发工具

### VSCode 推荐扩展

创建 `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "drizzle.drizzle-vscode",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### VSCode 设置

创建 `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "['\"`]([^'\"`]*)['\"`]"]
  ]
}
```

---

## 🔍 调试配置

### Electron 主进程调试

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceRoot}",
      "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/electron",
      "windows": {
        "runtimeExecutable": "${workspaceRoot}/node_modules/.bin/electron.cmd"
      },
      "args": ["."],
      "outputCapture": "std"
    }
  ]
}
```

### 渲染进程调试

1. 启动应用: `npm run dev`
2. 打开 DevTools: `Cmd/Ctrl + Shift + I`
3. 使用 React DevTools 扩展

---

## 📊 性能优化

### 构建优化

```bash
# 分析构建大小
npm run build -- --analyze

# 生产构建
npm run build

# 检查打包大小
ls -lh out/
```

### 数据库优化

```typescript
// 已启用的优化
- WAL 模式 (Write-Ahead Logging)
- Foreign Keys 约束
- 自动 VACUUM
- 索引优化
```

### 渲染优化

```typescript
// 已实现的优化
- React.memo() 用于列表项
- useCallback() 避免重复渲染
- 虚拟滚动 (计划中)
- 代码分割 (动态 import)
```

---

## 🐛 常见开发问题

### 1. TypeScript 错误

```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install

# 重启 TypeScript 服务器 (VSCode)
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### 2. 数据库锁定

```bash
# 关闭所有使用数据库的进程
pkill -9 electron
pkill -9 bun

# 删除 WAL 文件
rm muse.db-wal muse.db-shm

# 重启应用
npm run dev
```

### 3. 端口占用

```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 4. 热重载不工作

```bash
# 清理缓存
rm -rf node_modules/.vite
rm -rf out/
rm -rf dist/

# 重新构建
npm run dev
```

---

## 📝 Git 工作流

### 分支策略

```
main          # 生产分支
  ↓
develop       # 开发分支
  ↓
feature/*     # 功能分支
bugfix/*      # 修复分支
```

### 提交规范

```bash
# 格式
<type>(<scope>): <subject>

# 示例
feat(providers): add Gemini provider support
fix(chat): resolve streaming issue
docs(readme): update installation guide
refactor(db): optimize query performance
test(providers): add unit tests
```

### 类型说明

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

---

## 🔒 安全配置

### API Key 管理

**开发环境**:
- 直接在 UI 中添加 API Key
- 存储在本地数据库（加密）

**生产环境**:
- 建议使用密钥管理服务
- 定期轮换 API Key
- 监控 API 使用量

### 数据库安全

```bash
# 设置数据库文件权限
chmod 600 ~/Library/Application\ Support/Muse/muse.db

# 备份数据库
cp ~/Library/Application\ Support/Muse/muse.db ~/backups/muse-$(date +%Y%m%d).db
```

---

## 📊 监控和日志

### 日志文件

| 类型 | 路径 |
|------|------|
| API Server | `/tmp/muse-api.log` |
| Electron Main | Console output |
| Renderer | DevTools Console |

### 查看日志

```bash
# API Server 日志
tail -f /tmp/muse-api.log

# 实时监控
watch -n 1 'curl -s http://localhost:3000/health | jq'
```

---

## 🚀 部署配置

### 构建配置

`electron-builder.yml`:
```yaml
appId: com.example.muse
productName: Muse
directories:
  output: dist
  buildResources: build

mac:
  category: public.app-category.developer-tools
  target:
    - dmg
    - zip

win:
  target:
    - nsis
    - portable

linux:
  target:
    - AppImage
    - deb
```

### 打包命令

```bash
# 所有平台
npm run package

# 特定平台
npm run package:mac
npm run package:win
npm run package:linux
```

---

## 📚 额外资源

### 官方文档
- [Electron 文档](https://www.electronjs.org/docs)
- [React 文档](https://react.dev)
- [Drizzle ORM 文档](https://orm.drizzle.team)
- [Hono 文档](https://hono.dev)
- [Bun 文档](https://bun.sh/docs)

### AI Provider 文档
- [Anthropic API](https://docs.anthropic.com)
- [OpenAI API](https://platform.openai.com/docs)
- [Gemini API](https://ai.google.dev/docs)
- [DeepSeek API](https://platform.deepseek.com/api-docs)

### 社区资源
- GitHub Discussions
- Discord 社区
- Stack Overflow

---

## 🤝 贡献指南

1. **代码风格**: 遵循 ESLint + Prettier 配置
2. **提交信息**: 使用 Conventional Commits
3. **测试**: 添加测试覆盖新功能
4. **文档**: 更新相关文档
5. **PR 模板**: 填写完整的 PR 描述

---

## 📞 获取帮助

### 开发问题
- 查看 [故障排除](#-常见开发问题)
- 搜索 [GitHub Issues](https://github.com/yourusername/muse/issues)
- 在 Discord 提问

### Bug 报告
提供以下信息:
1. 操作系统和版本
2. Muse 版本
3. 重现步骤
4. 期望行为
5. 实际行为
6. 错误日志

---

**最后更新**: 2026-01-25
**版本**: v0.1.0-beta
**维护者**: Claude Code

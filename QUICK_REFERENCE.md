# Muse 快速参考

## 🚀 一分钟上手

```bash
# 1. 安装依赖
npm install

# 2. 启动应用
./start-dev.sh  # macOS/Linux
start-dev.bat   # Windows

# 3. 添加 Provider
Settings → Providers → Add Provider → 选择模板 → 输入 API Key

# 4. 开始聊天
选择模型 → 输入消息 → Enter
```

---

## 📋 常用命令

### 开发
```bash
npm run dev              # 启动开发环境
bun src/api/index.ts     # 只启动 API Server
npm run typecheck        # 类型检查
npm run lint             # 代码检查
npm run format           # 格式化代码
```

### 数据库
```bash
npm run db:generate      # 生成迁移
npm run db:push          # 推送 Schema
npm run db:studio        # 可视化管理
```

### 构建
```bash
npm run build            # 构建应用
npm run package          # 打包可执行文件
npm run package:mac      # 仅 macOS
npm run package:win      # 仅 Windows
npm run package:linux    # 仅 Linux
```

---

## 🎯 快捷键

| 功能 | macOS | Windows/Linux |
|------|-------|---------------|
| 打开设置 | `Cmd + ,` | `Ctrl + ,` |
| 新建对话 | `Cmd + N` | `Ctrl + N` |
| 关闭窗口 | `Cmd + W` | `Ctrl + W` |
| 发送消息 | `Enter` | `Enter` |
| 换行 | `Shift + Enter` | `Shift + Enter` |
| 打开 DevTools | `Cmd + Shift + I` | `Ctrl + Shift + I` |

---

## 🤖 支持的 Provider

| Provider | 类型 | 获取 API Key |
|----------|------|-------------|
| Claude | `claude` | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | `openai` | [platform.openai.com](https://platform.openai.com) |
| Gemini | `gemini` | [makersuite.google.com](https://makersuite.google.com/app/apikey) |
| DeepSeek | `deepseek` | [platform.deepseek.com](https://platform.deepseek.com) |
| Moonshot | `moonshot` | [platform.moonshot.cn](https://platform.moonshot.cn) |
| OpenRouter | `openrouter` | [openrouter.ai](https://openrouter.ai/keys) |
| Custom | `custom` | 您的 API 提供商 |

---

## 🎨 Temperature 参数

| 值 | 名称 | 适用场景 |
|----|------|---------|
| 0 | Precise | 代码生成、事实问答 |
| 1 | Balanced | 通用对话 (默认) |
| 1.5 | Creative | 创意写作、头脑风暴 |
| 2 | Very Creative | 艺术创作、实验性输出 |

---

## 🔧 故障排除

### API Server 离线

```bash
# 检查端口
lsof -i :3000           # macOS/Linux
netstat -ano | findstr :3000  # Windows

# 重启 Server
pkill -9 bun            # macOS/Linux
taskkill /F /IM bun.exe # Windows
bun src/api/index.ts
```

### API Key 无效

1. Settings → Providers
2. 点击 `⋮` → Configure
3. 点击 "Test" 验证
4. 如果失败，检查 API Key 是否正确

### 数据丢失

```bash
# 检查数据库
ls ~/Library/Application\ Support/Muse/muse.db  # macOS

# 查看数据
npm run db:studio
```

---

## 📂 重要文件路径

### 配置
- 数据库: `~/Library/Application Support/Muse/muse.db` (macOS)
- 日志: `/tmp/muse-api.log`

### 源代码
- 主进程: `src/main/`
- 渲染进程: `src/renderer/`
- API Server: `src/api/`
- 数据库: `src/main/db/`

---

## 🔗 快速链接

- [完整文档](docs/)
- [用户指南](docs/USER_GUIDE.md)
- [开发指南](docs/DEVELOPMENT.md)
- [贡献指南](CONTRIBUTING.md)
- [发布说明](RELEASE_NOTES.md)

---

## 📞 获取帮助

- **文档**: [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/muse/issues)
- **Discord**: https://discord.gg/...

---

**快速参考 | v0.1.0-beta | 2026-01-25**

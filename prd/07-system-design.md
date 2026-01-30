# Muse 系统设计文档（当前项目版）

**更新日期**: 2026-01-27
**范围**: 当前代码库的系统组织、组件划分、关键数据流、待完善项与改进路径。

---

## 1. 设计目标与约束

### 目标
- 支持多 AI Provider 的桌面聊天应用（Electron）。
- 本地优先：对话与配置持久化在本地 SQLite。
- 统一模型/配置入口，支持流式响应。

### 关键约束
- **Renderer 进程 sandboxed**，必须通过 IPC 访问系统资源。
- **API Server 本地运行**（Hono），与 UI 通过 HTTP 通讯。
- **多 Provider 兼容**：不同厂商协议统一抽象。

---

## 2. 系统架构总览

```
+-------------------+        HTTP (3000)         +-----------------------+
|  Renderer (React) | <------------------------> |  Local API Server     |
|  UI + Stores      |                            |  Hono + AI Providers  |
+---------+---------+                            +-----------+-----------+
          | IPC (Electron)                                   |
          |                                                  |
          v                                                  v
+-------------------+                            +-----------------------+
| Main Process      |                            | External AI Providers |
| IPC handlers      |                            | (OpenAI/Claude/...)   |
| DB + FS services  |                            +-----------------------+
+---------+---------+
          |
          v
+-------------------+
| SQLite (Drizzle)  |
+-------------------+

(IPC Bridge: 3001, 用于 HTTP 形式的 IPC 访问)
```

---

## 3. 代码组织（模块与职责）

### 3.1 `src/main`（Electron 主进程）
- 入口与生命周期：`src/main/index.ts`
  - 初始化数据库、注册 IPC、启动 API Server 与 IPC Bridge。
- IPC 通道：`ipcMain.handle(...)`
  - DB CRUD、文件系统、workspace、命令执行、健康检查。
- 文件系统服务：`src/main/services/fileSystemService.ts`
  - 文件读取/写入、目录列表、命令执行（含基本安全限制）。
- 数据库：`src/main/db/*`
  - `schema.ts` 定义表结构；`services/*` 为 CRUD 服务；`migration.ts` 负责 localStorage → SQLite 迁移。

### 3.2 `src/renderer`（UI 渲染进程）
- 组件：`src/renderer/src/components/*`
  - Chat、Settings、Layout、Explorer 等 UI 组件。
- 状态管理（Zustand）：`src/renderer/src/stores/*`
  - 对话、设置、聊天状态（V2 store 与 DB 同步）。
- 客户端服务：`src/renderer/src/services/*`
  - `apiClient.ts` 访问 Hono API。
  - `dbClient.ts` 通过 `window.api.ipc.invoke` 访问主进程 DB。

### 3.3 `src/api`（本地 API Server）
- Hono 服务入口：`src/api/index.ts`
- 路由：`src/api/routes/chat.ts`
  - `/chat`、`/chat/stream`、`/providers/*`、`/providers/validate`。
- AI 业务层：`src/api/services/ai/*`
  - `manager.ts`（策略调度）
  - `factory.ts`（Provider 工厂）
  - `validator.ts`（Provider 验证）
  - `providers/*`（各厂商协议适配）
  - `tools/*`（工具定义与执行）

### 3.4 `src/shared`
- 共享类型定义（AI、DB、IPC）。

---

## 4. 数据模型（SQLite + Drizzle）

**表结构**（见 `src/main/db/schema.ts`）：
- `conversations`：对话基本信息、provider/model 记录。
- `messages`：对话消息（用户/助手）。
- `tool_calls`：工具调用请求。
- `tool_results`：工具调用结果。
- `providers`：AI Provider 配置（API key 加密）。
- `models`：Provider 下的模型列表（含自定义模型）。
- `settings`：应用级设置（JSON 值）。

**关系**：
- conversations → messages（级联删除）
- messages → tool_calls → tool_results（级联删除）
- providers → models（级联删除）

---

## 5. 关键业务流程

### 5.1 流式聊天
1) UI 选中 Provider/Model → `settingsStore` 保存。
2) `ChatInput` 触发 `chatStore.sendMessage`。
3) `apiClient.sendMessageStream` → `POST /api/chat/stream`。
4) API Server → `AIManager` → `ProviderFactory` → 对应 Provider。
5) 解析流式数据 → chunk 回调 → UI 实时更新消息内容。

### 5.2 Provider 管理
1) UI 通过 `dbClient.providers.*` 调用 IPC → 主进程 ProviderService。
2) API key 在主进程加密入库。
3) `ProviderValidator` 可对 API key 进行在线验证。

### 5.3 文件浏览器
1) UI 通过 `window.api.workspace.get/set/select` 获取工作区。
2) `FileSystemService.listFiles` 读取目录并过滤隐藏文件。

### 5.4 数据迁移
1) `MigrationHandler` 检测 localStorage 数据。
2) 调用 IPC `db:migration:run` → SQLite 写入。

---

## 6. 已实现能力与现状

**已实现**（基于现有代码与文档）：
- 多 Provider 支持（Claude/OpenAI/Gemini/DeepSeek/Generic 等）。
- Provider 管理 UI 与配置。
- 本地 SQLite + Drizzle ORM + 数据迁移。
- 流式聊天。
- 基础 File Explorer。

**测试现状**（摘自已有测试与报告）：
- DB 服务层单测较完备。
- UI 组件测试覆盖部分核心组件，缺少 API/main/store 层测试。

---

## 7. 待完善功能与改进方向

### 7.1 可靠性与错误处理（短期优先）
- **现状**：错误提示与恢复策略有限。
- **改进**：
  - API 层统一错误映射（429/5xx/超时）。
  - UI 端 toast 分级展示 + 重试提示。
  - 关键路径加指数退避重试。

### 7.2 Provider/模型可用性验证
- **现状**：可校验 API key，但模型可用性/健康检查不足。
- **改进**：
  - Provider 级健康检查与模型列表验证。
  - 将可用性缓存到 DB，UI 显示状态。

### 7.3 会话能力完善
- **现状**：基本对话管理已完成。
- **改进**：
  - 搜索历史对话（DB 索引 + UI 搜索）。
  - 对话导出（Markdown/JSON）。
  - Token 使用统计（DB 新增字段 + UI 汇总）。

### 7.4 UI/体验
- **现状**：功能完备但主题与可配置性不足。
- **改进**：
  - 深色/浅色主题切换（设置持久化）。
  - 键盘快捷键增强。
  - 更清晰的加载/错误状态。

### 7.5 高级 AI 能力（中期）
- **计划**：
  - Function Calling/Tooling UI 衔接。
  - Vision 模型输入。
  - 文件上传与上下文引用。

### 7.6 测试与质量保障
- **现状**：缺少 API/main/store 层单测、缺少集成/E2E。
- **改进**：
  - 增加 API & main 进程测试。
  - 补齐 store 单测与集成测试。
  - 建立关键用户路径 E2E（Playwright）。

---

## 8. 改进落地建议（按路径拆解）

### A. Chat 核心链路增强
1) API 层增加错误分类与重试策略。
2) UI 增加“重试/继续生成”交互。
3) DB 保存 token 消耗与模型响应元数据。

### B. Provider 管理增强
1) Provider 配置增加“模型验证”与“健康状态”。
2) UI 显示模型不可用原因与修复建议。

### C. 系统可测试性增强
1) 新增 API/main/store 单测（详见 `prd/06-test-coverage-plan.md`）。
2) 关键路径集成测试：发送消息、切换模型、保存对话。

---

## 9. 交付边界与非目标
- 本文档仅覆盖当前仓库代码与已规划路线，不扩展到外部服务或云端同步方案。
- 后续功能以 README 路线图为主线推进。

---

## 10. 关联文档
- `README_NEW.md`
- `docs/00-complete-implementation-report.md`
- `docs/40-phase4-end-to-end-integration.md`
- `prd/06-test-coverage-plan.md`


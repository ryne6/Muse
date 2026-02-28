# Web Search 重构 — 实现计划

基于 `docs/plans/2026-02-28-web-search-brainstorm-summary.md`

## 目标

用 Electron BrowserWindow + Google 持久化登录态替换已失效的 DuckDuckGo axios 方案。

## 现状

- `src/main/services/webService.ts` — axios + DDG HTML 解析，已失效
- IPC: `web:search` / `web:fetch` 在 `ipcBridge.ts`（Hono HTTP server）
- Tool executor 通过 HTTP POST `/ipc/web:search` 调用
- 无 Settings UI，无 settingsStore 状态

## 任务拆分（3 个并行工作流）

### Phase 0: 共享类型（Team Lead，阻塞后续）

**T0: 更新 IPC 类型定义**
- `src/shared/types/ipc.ts` — web 命名空间新增：
  - `openLogin: (engine: 'google' | 'bing') => Promise<void>`
  - `sessionStatus: () => Promise<{ status: 'logged_in' | 'logged_out' | 'unknown' }>`
  - `clearSession: () => Promise<void>`

---

### Phase 1: 并行执行

#### 工作流 A: Backend（backend-agent）

**T1: 创建 webBrowserService.ts**
- 文件: `src/main/services/webBrowserService.ts`
- `partition: 'persist:websearch'`
- `openLoginWindow(engine)` — 可见 BrowserWindow，用户手动登录
- `search(query, options)` — 隐藏窗口 + 串行锁，Google DOM 提取
- `fetch(url, maxLength)` — 隐藏窗口抓取页面
- `getSessionStatus()` — 检查 SID cookie
- `clearSession()` — 清除 partition 数据
- 安全配置: nodeIntegration:false, contextIsolation:true, sandbox:true
- 搜索间隔 2-10s 随机延迟

**T2: IPC 接线**
- `src/main/ipcBridge.ts` — 新增 3 个 case: `web:openLogin`, `web:sessionStatus`, `web:clearSession`
- `src/preload/index.ts` — web 命名空间新增 3 个绑定
- 保持 `web:search` / `web:fetch` 向后兼容，内部委托给新服务

**T3: 迁移旧服务**
- `webService.ts` 的 `search()` 和 `fetch()` 委托给 `WebBrowserService`
- 或直接在 ipcBridge 中替换调用目标

#### 工作流 B: Frontend（frontend-agent）

**T4: settingsStore 扩展**
- `src/renderer/src/stores/settingsStore.ts` 新增:
  - `webSearchEngine: 'google' | 'bing'`（持久化）
  - `setWebSearchEngine(engine)` action

**T5: WebSearchSettings.tsx**
- 文件: `src/renderer/src/components/settings/WebSearchSettings.tsx`
- 搜索引擎选择（Google/Bing）
- "Login to Google" 按钮 → `window.api.web.openLogin(engine)`
- Session 状态指示器（绿/红/灰）→ 轮询 `window.api.web.sessionStatus()`
- "Clear Session" 按钮 → `window.api.web.clearSession()`

**T6: 挂载到 Settings 页面**
- 在 Settings 布局中添加 "Web Search" tab，渲染 WebSearchSettings

---

### Phase 2: 集成验证（Team Lead）

**T7: 端到端测试**
- 启动 dev 模式验证：登录 → 搜索 → fetch → session 管理
- Tool executor 通过 AI 调用 WebSearch 验证

## 文件改动清单

| 文件 | 操作 | 负责 |
|------|------|------|
| `src/shared/types/ipc.ts` | 修改 | Lead |
| `src/main/services/webBrowserService.ts` | 新增 | Backend |
| `src/main/services/webService.ts` | 修改（委托） | Backend |
| `src/main/ipcBridge.ts` | 修改 | Backend |
| `src/preload/index.ts` | 修改 | Backend |
| `src/renderer/src/stores/settingsStore.ts` | 修改 | Frontend |
| `src/renderer/src/components/settings/WebSearchSettings.tsx` | 新增 | Frontend |
| Settings 布局文件 | 修改 | Frontend |

## 风险与注意

- Google DOM 结构可能变化，`h3` 锚点提取需要容错
- BrowserWindow 生命周期管理：搜索完成后及时销毁隐藏窗口
- 串行锁防止并发搜索触发 rate limit
- UA 用 `process.versions.chrome` 匹配 Electron 内置 Chromium

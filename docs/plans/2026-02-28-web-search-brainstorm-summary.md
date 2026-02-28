# Web Search 重构 — 头脑风暴汇总

## 背景

当前 `webService.ts` 用 axios 抓 DuckDuckGo `/html/` 端点，DDG 已对无浏览器指纹的请求返回验证码页面，搜索功能完全失效。

## 最终方案：BrowserWindow + 持久化登录态

用户登录一次 Google → cookie 持久化 → 后续自动搜索复用登录态。

### 核心技术

- `partition: 'persist:websearch'` — cookie 存在 `~/Library/Application Support/Crow/Partitions/websearch/`，重启不丢
- 登录窗口和搜索窗口共享同一 partition = 共享 cookie
- 检测登录态：查 `.google.com` 域下是否有 `SID` cookie
- UA：`process.versions.chrome` 获取 Electron 内置 Chromium 版本号
- 搜索间隔 2-10s 随机延迟，日上限 ~100 次

### 可行性评估

| 维度 | 评估 |
|------|------|
| CAPTCHA 减少 | 中等改善，不能完全消除 |
| 行为分析绕过 | 不能 — SearchGuard 仍然监控 |
| 日搜索量 50-100 次 | 安全（配合自然间隔） |
| 账号封禁风险 | 低（个人低频使用） |
| Cookie 有效期 | SID/HSID ~2年，实际几个月需重登 |

### 架构设计

新增 `src/main/services/webBrowserService.ts`：

```typescript
export class WebBrowserService {
  private static SESSION = 'persist:websearch'

  // 可见窗口，用户手动登录 Google/Bing
  static async openLoginWindow(engine: 'google' | 'bing'): Promise<void>

  // 隐藏窗口 + 串行锁，Google DOM 提取
  static async search(query: string, options?: {
    engine?: 'google' | 'bing'
    limit?: number
    recencyDays?: number
    domains?: string[]
  }): Promise<SearchResult[]>

  // 隐藏窗口抓取页面内容
  static async fetch(url: string, maxLength?: number): Promise<string>

  // 检查 cookie 有效性
  static async getSessionStatus(): Promise<'logged_in' | 'logged_out' | 'unknown'>

  // 清除 session
  static async clearSession(): Promise<void>
}
```

### IPC 接口

保持向后兼容 + 新增：
- `web:search` — 不变
- `web:fetch` — 不变
- `web:openLogin` — NEW
- `web:sessionStatus` — NEW
- `web:clearSession` — NEW

### 需要改动的文件

| 文件 | 改动 |
|------|------|
| `src/main/services/webBrowserService.ts` | **新增** — 核心 BrowserWindow 服务 |
| `src/main/services/webService.ts` | 委托给新服务或废弃 |
| `src/main/index.ts` | 新增 3 个 IPC handler |
| `src/preload/index.ts` | 暴露新 IPC 方法 |
| `src/shared/types/ipc.ts` | 新增类型 |
| `src/renderer/src/components/settings/WebSearchSettings.tsx` | **新增** — 登录/session 管理 UI |
| `src/renderer/src/stores/settingsStore.ts` | 新增 webSearch 相关状态 |

### Settings UI

新增 "Web Search" tab：
- 搜索引擎选择（Google/Bing）
- "Login to Google" 按钮 → 打开可见 BrowserWindow
- Session 状态指示器（绿 Active / 红 Expired / 灰 Not configured）
- "Clear Session" 按钮

### BrowserWindow 安全配置

```typescript
webPreferences: {
  partition: 'persist:websearch',
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
}
```

### Google DOM 提取策略

用 `h3` 元素作为锚点（最稳定），通过 URL 模式跳过广告：

```javascript
Array.from(document.querySelectorAll('h3')).map(h3 => {
  const link = h3.closest('a')
  if (!link || link.href.includes('/aclk?') || link.href.includes('googleadservices')) return null
  const container = h3.closest('[data-hveid]') || h3.parentElement?.parentElement
  return {
    title: h3.textContent,
    url: link.href,
    snippet: container?.querySelector('[data-sncf]')?.textContent || ''
  }
}).filter(Boolean).slice(0, limit)
```

### Google URL 参数

```
https://www.google.com/search?q={query}&num={count}&hl=en&pws=0
tbs=qdr:d (天) / qdr:w (周) / qdr:m (月) / qdr:y (年)
domains → site:domain1 OR site:domain2 拼入 query
```

### Bing 备选 DOM 提取

```javascript
Array.from(document.querySelectorAll('li.b_algo')).map(el => ({
  title: el.querySelector('h2 a')?.textContent || '',
  url: el.querySelector('h2 a')?.href || '',
  snippet: el.querySelector('.b_caption p')?.textContent || ''
}))
```

### 被否决的方案

1. **纯 axios + DDG** — 已坏，DDG 返回验证码
2. **匿名 BrowserWindow + Google** — SearchGuard 行为分析太强
3. **搜索 API（Brave 等）** — 有限额 + 需要额外 key
4. **Electron net 模块** — 不执行 JS，绕不过验证码

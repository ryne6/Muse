# Muse TODO 修改方案 PRD

## 概述

本 PRD 针对 Muse AI 桌面编程助手的 13 个待办事项，涵盖状态管理 Bug、UI/样式改进、功能 Bug 和代码重构。

## 用户确认的需求

- **主题色**: Tailwind Orange (#F97316, HSL 24 95% 53%)
- **Workspace 空状态**: 未选择时隐藏整个 FileExplorer 区域
- **LobeChat 参考范围**: 卡片样式、页面布局、交互动效、Model 列表
- **实施范围**: 全部实现

---

## 优先级矩阵

| 优先级 | 问题 | 影响 | 工作量 | 分类 |
|--------|------|------|--------|------|
| P0 | #4 图片附件未传到接口 | 高 | 中 | 功能 Bug |
| P0 | #1 Provider/Model 不刷新 | 高 | 低 | 状态管理 |
| P0 | #2 Workspace 选择后不更新 | 高 | 中 | 状态管理 |
| P1 | #7 Model 启用状态显示反了 | 高 | 低 | 功能 Bug |
| P1 | #5 Search 功能不可用 | 中 | 中 | 功能 Bug |
| P1 | #6 修改 Provider 字段不完整 | 中 | 低 | 功能 Bug |
| P2 | #3 主题色改为橙色 | 中 | 低 | UI/样式 |
| P2 | GenericProvider 策略模式重构 | 中 | 高 | 重构 |
| P3 | #8 AI Provider 样式重构 | 低 | 高 | UI/样式 |
| P3 | #9 全局 Loading 效果 | 低 | 中 | UI/样式 |
| P3 | #10 局部 Loading 效果 | 低 | 中 | UI/样式 |
| P3 | #11 动画效果设计 | 低 | 高 | UI/样式 |
| P3 | dragEvent 未定义错误 | 低 | 低 | Bug |
| P3 | CORS 配置动态化 | 低 | 低 | 配置 |

---

## Phase 1: 关键 Bug 修复

### Issue #1: Provider/Model 新增后 Chat 页面不刷新

**根因**: `ModelSelector` 组件只在挂载时调用 `loadData()`，外部变更不会触发重新渲染。

**方案**: 在 settingsStore 添加 `lastUpdated` 时间戳触发刷新。

**修改文件**:
- `src/renderer/src/stores/settingsStore.ts` - 添加 lastUpdated 字段
- `src/renderer/src/components/chat/ModelSelector.tsx` - 监听 lastUpdated
- `src/renderer/src/components/settings/AddProviderDialog.tsx` - 调用 triggerRefresh
- `src/renderer/src/components/settings/ManageModelsDialog.tsx` - 调用 triggerRefresh

---

### Issue #2: Workspace 选择后右侧不更新

**根因**: WorkspaceSelector 和 FileExplorer 各自维护本地状态，无共享机制。

**方案**: 创建 `workspaceStore` 集中管理 workspace 状态。

**修改文件**:
- 新建: `src/renderer/src/stores/workspaceStore.ts`
- 修改: `src/renderer/src/components/layout/WorkspaceSelector.tsx`
- 修改: `src/renderer/src/components/explorer/FileExplorer.tsx`

---

### Issue #4: 图片附件未传到接口

**根因**: `chatStore.ts` 处理历史消息时只添加文本内容，未处理 attachments 中的图片。

**方案**: 修复消息历史处理逻辑，包含图片附件。

**修改文件**:
- `src/renderer/src/stores/chatStore.ts` (lines 59-79)
- `src/shared/types/conversation.ts` (如需添加 attachments 字段)

---

### Issue #7: Model 启用状态显示反了

**根因**: SQLite 布尔值存储为 0/1，可能存在转换问题。

**方案**: 检查 `toggleEnabled` 实现，确保布尔值正确处理。

**修改文件**:
- `src/renderer/src/services/dbClient.ts`
- `src/main/db/services/modelService.ts`

---

## Phase 2: 功能修复

### Issue #5: Search 功能不可用

**根因**: 可能是 IPC handler 未注册或 search_index 表未初始化。

**方案**:
1. 验证 IPC handler 存在
2. 添加搜索索引初始化检查

**修改文件**:
- `src/main/index.ts` - 验证/添加 IPC handlers
- `src/main/db/index.ts` - 添加索引初始化

---

### Issue #6: 修改 Provider 字段不完整

**根因**: `ProviderConfigDialog` 只允许编辑 apiKey 和 baseURL。

**方案**: 扩展表单包含 name、apiFormat、enabled 字段。

**修改文件**:
- `src/renderer/src/components/settings/ProviderConfigDialog.tsx`

---

## Phase 3: UI/样式改进

### Issue #3: 主题色改为橙色

**方案**: 更新 CSS 变量为橙色调。

```css
--accent: 24 95% 53%;  /* #F97316 */
--primary: 24 95% 53%;
--ring: 24 95% 53%;
```

**修改文件**:
- `src/renderer/src/index.css`

---

### Issue #9 & #10: Loading 效果

**方案**: 创建统一的 Loading 组件系统。

**新建文件**:
- `src/renderer/src/components/ui/loading.tsx`
- `src/renderer/src/stores/loadingStore.ts`

---

### Issue #11: 动画效果

**方案**: 添加 Framer Motion 或 CSS 动画。

**新建文件**:
- `src/renderer/src/utils/animations.ts`

---

## Phase 4: 重构

### GenericProvider 策略模式重构

**方案**: 应用策略模式 + DIP 原则。

**新建文件**:
- `src/api/services/ai/providers/strategies/index.ts` - 接口定义
- `src/api/services/ai/providers/strategies/openai.ts`
- `src/api/services/ai/providers/strategies/anthropic.ts`

**修改文件**:
- `src/api/services/ai/providers/generic.ts`

---

### Issue #8: AI Provider 样式重构

**方案**: 参考 LobeChat 重新设计 Provider 卡片。

**新建文件**:
- `src/renderer/src/components/settings/ProviderCard.tsx`

**修改文件**:
- `src/renderer/src/components/settings/ProviderList.tsx`

---

## 其他问题

### dragEvent 未定义错误

**方案**: 检查拖放相关代码，确保事件对象正确处理。

**检查文件**:
- `src/renderer/src/components/chat/ImageDropZone.tsx`

---

### CORS 配置动态化

**方案**: 使用环境变量配置 CORS origins。

**修改文件**:
- `src/api/index.ts`

---

## 验证方法

### P0 问题验证
1. **图片附件**: 发送带图片的消息，检查 Network 请求体包含图片数据
2. **Provider 刷新**: 新增 Provider 后，Chat 页面下拉框立即显示
3. **Workspace 更新**: 选择文件夹后，FileExplorer 立即显示内容
4. **Model 状态**: 切换启用状态，UI 正确反映

### 整体验证
```bash
# 运行测试
npm run test

# 启动开发模式验证
npm run dev
```

---

## 关键文件清单

| 文件 | 修改类型 | 优先级 |
|------|----------|--------|
| `src/renderer/src/stores/settingsStore.ts` | 修改 | P0 |
| `src/renderer/src/stores/chatStore.ts` | 修改 | P0 |
| `src/renderer/src/stores/workspaceStore.ts` | 新建 | P0 |
| `src/renderer/src/index.css` | 修改 | P2 |
| `src/api/services/ai/providers/generic.ts` | 重构 | P2 |
| `src/renderer/src/components/settings/ProviderConfigDialog.tsx` | 修改 | P1 |

---

## 补充：详细修复方案与验收标准

### 统一假设/边界
- 图片附件在发送给模型时使用 base64（不含 dataURL 头），单图大小限制沿用 `MAX_ATTACHMENT_SIZE`（10MB）。
- Workspace 空状态时 **不渲染** `FileExplorer` 区域，右侧空间留给聊天区。
- Search 在索引空/缺失时允许自动重建，避免用户手动触发。
- CORS 动态化默认保留本地开发白名单，新增环境变量覆盖。

### 验收标准（逐项）
1. **Issue #1 Provider/Model 不刷新**：在 Settings 中新增/删除/编辑 Provider 或 Model 后，Chat 页 `ModelSelector` 在 1 秒内展示最新列表，无需重启/切页。
2. **Issue #2 Workspace 不更新**：选择工作区后 FileExplorer 立即刷新内容；清空工作区后 FileExplorer 列完全隐藏。
3. **Issue #4 图片附件未传到接口**：包含历史图片的会话再次发送时，请求体内包含图片块（mimeType + base64），图片与文字顺序正确。
4. **Issue #7 Model 启用状态反了**：启用/禁用按钮与数据库状态一致，切换后立刻反映在 UI。
5. **Issue #5 Search 不可用**：即使旧数据索引为空，也能搜索到历史会话/消息/工具调用/附件注释。
6. **Issue #6 Provider 字段不完整**：编辑对话框可修改 name、apiKey、baseURL、apiFormat、enabled，保存后立刻生效。
7. **Issue #3 主题色改为橙色**：primary/accent/ring/hover 全部替换为 `#F97316` 体系，UI 主色一致。
8. **GenericProvider 重构**：OpenAI/Responses/Anthropic 三种格式均可正常请求/流式响应，无功能回归。
9. **Issue #8 Provider 样式重构**：卡片布局、状态、交互贴近 LobeChat 参考（卡片层级、按钮密度、动效）。
10. **Issue #9/#10 Loading 效果**：全局与局部 Loading 可独立控制，不遮挡关键交互。
11. **Issue #11 动画效果**：Provider 列表/弹窗进入有轻量动效；支持关闭系统减少动画。
12. **dragEvent 未定义错误**：拖拽/粘贴图片不再抛出 `dragEvent is not defined`。
13. **CORS 配置动态化**：可通过环境变量配置允许源，未配置时使用默认白名单。

### 详细实施计划
# TODO Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 PRD 中全部 P0-P3 问题并补齐验收与测试，确保状态刷新、搜索、附件、工作区、Provider 管理、UI/样式一致可验证。

**Architecture:** 以 Zustand store 作为状态中枢，renderer 组件只读 store + 触发 action；DB/IPC 层保证数据一致性并提供搜索索引与附件数据；UI/样式通过新增可复用 Loading/Animation 工具与新 Provider 卡片统一。

**Tech Stack:** Electron, React 18, Zustand, Drizzle ORM (SQLite), Hono, Tailwind, Vitest.

### Task 1: Issue #1 Provider/Model 新增后 Chat 页面不刷新

**Files:**
- Modify: `src/renderer/src/stores/settingsStore.ts`
- Modify: `src/renderer/src/components/chat/ModelSelector.tsx`
- Modify: `src/renderer/src/components/settings/AddProviderDialog.tsx`
- Modify: `src/renderer/src/components/settings/ManageModelsDialog.tsx`
- Modify: `src/renderer/src/components/settings/ProviderConfigDialog.tsx`
- Test: `src/renderer/src/stores/__tests__/settingsStore.test.ts`

**Step 1: Write the failing test**
```ts
it('should bump lastUpdated when triggerRefresh is called', () => {
  const prev = useSettingsStoreV2.getState().lastUpdated
  useSettingsStoreV2.getState().triggerRefresh()
  expect(useSettingsStoreV2.getState().lastUpdated).toBeGreaterThan(prev)
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/settingsStore.test.ts`
Expected: FAIL (lastUpdated undefined or triggerRefresh not implemented)

**Step 3: Write minimal implementation**
```ts
// settingsStore.ts
lastUpdated: Date.now(),
triggerRefresh: () => set({ lastUpdated: Date.now() }),
```
```ts
// ModelSelector.tsx
const { loadData, lastUpdated } = useSettingsStoreV2()
useEffect(() => { loadData() }, [loadData, lastUpdated])
```
```ts
// AddProviderDialog / ManageModelsDialog / ProviderConfigDialog
const { triggerRefresh } = useSettingsStoreV2()
// after successful create/update/delete
triggerRefresh()
```

**Step 4: Run test to verify it passes**
Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/settingsStore.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/renderer/src/stores/settingsStore.ts \
  src/renderer/src/components/chat/ModelSelector.tsx \
  src/renderer/src/components/settings/AddProviderDialog.tsx \
  src/renderer/src/components/settings/ManageModelsDialog.tsx \
  src/renderer/src/components/settings/ProviderConfigDialog.tsx \
  src/renderer/src/stores/__tests__/settingsStore.test.ts

git commit -m "fix: refresh model selector after provider/model updates"
```

### Task 2: Issue #2 Workspace 选择后右侧不更新 + 空状态隐藏 FileExplorer

**Files:**
- Create: `src/renderer/src/stores/workspaceStore.ts`
- Modify: `src/renderer/src/components/layout/WorkspaceSelector.tsx`
- Modify: `src/renderer/src/components/explorer/FileExplorer.tsx`
- Modify: `src/renderer/src/components/layout/AppLayout.tsx`
- Test: `src/renderer/src/components/explorer/__tests__/FileExplorer.test.tsx`
- Test: `src/renderer/src/stores/__tests__/workspaceStore.test.ts`

**Step 1: Write the failing test**
```ts
it('should update workspacePath when selectWorkspace resolves', async () => {
  const store = useWorkspaceStore.getState()
  await store.selectWorkspace()
  expect(useWorkspaceStore.getState().workspacePath).toBe('/test/workspace')
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/workspaceStore.test.ts`
Expected: FAIL (store not implemented)

**Step 3: Write minimal implementation**
```ts
// workspaceStore.ts
workspacePath: null,
loadWorkspace: async () => { const { path } = await window.api.workspace.get(); set({ workspacePath: path || null }) },
selectWorkspace: async () => { const { path } = await window.api.workspace.select(); set({ workspacePath: path || null }) },
clearWorkspace: async () => { await window.api.workspace.set(''); set({ workspacePath: null }) },
```
```tsx
// AppLayout.tsx
const { workspacePath } = useWorkspaceStore()
{workspacePath ? <FileExplorer /> : null}
```
```tsx
// WorkspaceSelector / FileExplorer use store instead of local state
```

**Step 4: Run test to verify it passes**
Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/workspaceStore.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/renderer/src/stores/workspaceStore.ts \
  src/renderer/src/components/layout/WorkspaceSelector.tsx \
  src/renderer/src/components/explorer/FileExplorer.tsx \
  src/renderer/src/components/layout/AppLayout.tsx \
  src/renderer/src/components/explorer/__tests__/FileExplorer.test.tsx \
  src/renderer/src/stores/__tests__/workspaceStore.test.ts

git commit -m "fix: centralize workspace state and hide explorer when empty"
```

### Task 3: Issue #4 图片附件未传到接口（历史消息）

**Files:**
- Modify: `src/renderer/src/stores/conversationStore.ts`
- Modify: `src/renderer/src/stores/chatStore.ts`
- Test: `src/renderer/src/stores/__tests__/chatStore.test.ts`

**Step 1: Write the failing test**
```ts
it('should include image blocks for prior attachments in aiMessages', async () => {
  // mock window.api.attachments.getBase64 to return base64
  // load conversation with message.attachments
  // expect apiClient.sendMessageStream to receive content blocks with image
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/chatStore.test.ts`
Expected: FAIL (no image blocks from history)

**Step 3: Write minimal implementation**
```ts
// conversationStore.ts - load attachments previews for messages
const attachments = await window.api.attachments.getPreviewsByMessageId(msg.id)
return { ...msg, attachments }
```
```ts
// chatStore.ts - when mapping history
const contentBlocks: MessageContent[] = []
if (m.content) contentBlocks.push({ type: 'text', text: m.content })
if (m.attachments?.length) {
  const images = await Promise.all(m.attachments.map(async (a) => {
    const base64 = await window.api.attachments.getBase64(a.id)
    return base64 ? { type: 'image', mimeType: a.mimeType, data: base64, note: a.note || undefined } : null
  }))
  contentBlocks.push(...images.filter(Boolean))
}
```

**Step 4: Run test to verify it passes**
Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/chatStore.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/renderer/src/stores/conversationStore.ts \
  src/renderer/src/stores/chatStore.ts \
  src/renderer/src/stores/__tests__/chatStore.test.ts

git commit -m "fix: include attachments in history messages sent to API"
```

### Task 4: Issue #7 Model 启用状态显示反了

**Files:**
- Modify: `src/main/db/services/modelService.ts`
- Modify: `src/renderer/src/services/dbClient.ts` (如需类型归一)
- Test: `src/main/db/services/__tests__/modelService.test.ts`

**Step 1: Write the failing test**
```ts
it('toggleEnabled should flip enabled boolean correctly', async () => {
  const created = await ModelService.create({ providerId, modelId: 'm', name: 'M', enabled: true })
  const toggled = await ModelService.toggleEnabled(created.id)
  expect(toggled?.enabled).toBe(false)
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test:main -- src/main/db/services/__tests__/modelService.test.ts`
Expected: FAIL if enabled cast is inverted

**Step 3: Write minimal implementation**
```ts
// ensure enabled is boolean when reading from DB if needed
const model = await this.getById(id)
const current = !!model?.enabled
await db.update(models).set({ enabled: !current }).where(eq(models.id, id))
```

**Step 4: Run test to verify it passes**
Run: `npm run test:main -- src/main/db/services/__tests__/modelService.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/main/db/services/modelService.ts \
  src/main/db/services/__tests__/modelService.test.ts

git commit -m "fix: correct model enabled toggle"
```

### Task 5: Issue #5 Search 功能不可用

**Files:**
- Modify: `src/main/db/services/searchService.ts`
- Modify: `src/main/index.ts` (如需初始化 hook)
- Test: `src/main/db/services/__tests__/searchService.test.ts`

**Step 1: Write the failing test**
```ts
it('should rebuild index when search_index is empty', async () => {
  // clear search_index table then call SearchService.search
  // expect rebuildIndex to be invoked or results to be non-empty after rebuild
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test:main -- src/main/db/services/__tests__/searchService.test.ts`
Expected: FAIL (no auto rebuild)

**Step 3: Write minimal implementation**
```ts
// searchService.ts
static async ensureIndexReady() {
  const db = getDatabase()
  const count = db.get(sql`SELECT COUNT(*) as total FROM search_index`) as any
  if (!count || count.total === 0) await this.rebuildIndex()
}
// call ensureIndexReady() at start of search()
```

**Step 4: Run test to verify it passes**
Run: `npm run test:main -- src/main/db/services/__tests__/searchService.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/main/db/services/searchService.ts \
  src/main/db/services/__tests__/searchService.test.ts

git commit -m "fix: ensure search index initialized before queries"
```

### Task 6: Issue #6 修改 Provider 字段不完整

**Files:**
- Modify: `src/renderer/src/components/settings/ProviderConfigDialog.tsx`
- Test: `src/renderer/src/components/settings/__tests__/ProviderConfigDialog.test.tsx` (create if missing)

**Step 1: Write the failing test**
```tsx
it('should allow editing name, apiFormat, enabled', async () => {
  render(<ProviderConfigDialog ... />)
  expect(screen.getByLabelText('Name')).toBeInTheDocument()
  expect(screen.getByLabelText('API Format')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test:renderer -- src/renderer/src/components/settings/__tests__/ProviderConfigDialog.test.tsx`
Expected: FAIL (fields missing)

**Step 3: Write minimal implementation**
```tsx
// add fields: name, apiFormat (select), enabled (toggle)
await dbClient.providers.update(provider.id, { name, apiKey, baseURL, apiFormat, enabled })
```

**Step 4: Run test to verify it passes**
Run: `npm run test:renderer -- src/renderer/src/components/settings/__tests__/ProviderConfigDialog.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/renderer/src/components/settings/ProviderConfigDialog.tsx \
  src/renderer/src/components/settings/__tests__/ProviderConfigDialog.test.tsx

git commit -m "feat: allow full provider config editing"
```

### Task 7: Issue #3 主题色改为橙色

**Files:**
- Modify: `src/renderer/src/index.css`
- Test: `src/renderer/src/__tests__/theme.test.ts` (new)

**Step 1: Write the failing test**
```ts
it('should expose orange accent tokens', async () => {
  const css = await fs.promises.readFile('src/renderer/src/index.css', 'utf-8')
  expect(css).toContain('--accent: 24 95% 53%')
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test:renderer -- src/renderer/src/__tests__/theme.test.ts`
Expected: FAIL (old blue tokens)

**Step 3: Write minimal implementation**
```css
--accent: 24 95% 53%;
--primary: 24 95% 53%;
--ring: 24 95% 53%;
--accent-hover: 24 90% 48%;
```

**Step 4: Run test to verify it passes**
Run: `npm run test:renderer -- src/renderer/src/__tests__/theme.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/renderer/src/index.css src/renderer/src/__tests__/theme.test.ts

git commit -m "style: switch theme tokens to orange"
```

### Task 8: Issue #9 & #10 Loading 效果（全局/局部）

**Files:**
- Create: `src/renderer/src/components/ui/loading.tsx`
- Create: `src/renderer/src/stores/loadingStore.ts`
- Modify: `src/renderer/src/components/layout/AppLayout.tsx` (global overlay)
- Modify: `src/renderer/src/components/layout/SearchResults.tsx` (local)
- Test: `src/renderer/src/components/ui/__tests__/loading.test.tsx`

**Step 1: Write the failing test**
```tsx
it('should render LoadingOverlay when loadingStore.isGlobalLoading', () => {
  useLoadingStore.setState({ global: true })
  render(<LoadingOverlay />)
  expect(screen.getByText('Loading')).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test:renderer -- src/renderer/src/components/ui/__tests__/loading.test.tsx`
Expected: FAIL (component/store missing)

**Step 3: Write minimal implementation**
```tsx
export function LoadingOverlay() { return <div className="fixed inset-0">Loading</div> }
```
```ts
export const useLoadingStore = create(() => ({ global: false, local: {} }))
```

**Step 4: Run test to verify it passes**
Run: `npm run test:renderer -- src/renderer/src/components/ui/__tests__/loading.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/renderer/src/components/ui/loading.tsx \
  src/renderer/src/stores/loadingStore.ts \
  src/renderer/src/components/layout/AppLayout.tsx \
  src/renderer/src/components/layout/SearchResults.tsx \
  src/renderer/src/components/ui/__tests__/loading.test.tsx

git commit -m "feat: add global and local loading system"
```

### Task 9: Issue #11 动画效果设计

**Files:**
- Create: `src/renderer/src/utils/animations.ts`
- Modify: `src/renderer/src/components/settings/ProviderList.tsx`
- Test: `src/renderer/src/utils/__tests__/animations.test.ts`

**Step 1: Write the failing test**
```ts
import { fadeInUp } from '../animations'
expect(fadeInUp).toBeDefined()
```

**Step 2: Run test to verify it fails**
Run: `npm run test:renderer -- src/renderer/src/utils/__tests__/animations.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
```ts
export const fadeInUp = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }
```

**Step 4: Run test to verify it passes**
Run: `npm run test:renderer -- src/renderer/src/utils/__tests__/animations.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/renderer/src/utils/animations.ts \
  src/renderer/src/utils/__tests__/animations.test.ts \
  src/renderer/src/components/settings/ProviderList.tsx

git commit -m "feat: add shared animation presets"
```

### Task 10: GenericProvider 策略模式重构

**Files:**
- Create: `src/api/services/ai/providers/strategies/index.ts`
- Create: `src/api/services/ai/providers/strategies/openai.ts`
- Create: `src/api/services/ai/providers/strategies/anthropic.ts`
- Modify: `src/api/services/ai/providers/generic.ts`
- Test: `src/api/services/ai/providers/__tests__/genericProvider.test.ts`

**Step 1: Write the failing test**
```ts
it('should choose anthropic strategy when apiFormat=anthropic-messages', async () => {
  // expect anthropic headers/body
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test:api -- src/api/services/ai/providers/__tests__/genericProvider.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
```ts
export interface ProviderStrategy { buildHeaders(...): Record<string,string>; buildBody(...): any }
export const strategies = { 'chat-completions': openaiStrategy, 'responses': openaiStrategy, 'anthropic-messages': anthropicStrategy }
```

**Step 4: Run test to verify it passes**
Run: `npm run test:api -- src/api/services/ai/providers/__tests__/genericProvider.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/api/services/ai/providers/strategies \
  src/api/services/ai/providers/generic.ts \
  src/api/services/ai/providers/__tests__/genericProvider.test.ts

git commit -m "refactor: split generic provider into strategies"
```

### Task 11: Issue #8 AI Provider 样式重构（参考 LobeChat）

**Files:**
- Create: `src/renderer/src/components/settings/ProviderCard.tsx`
- Modify: `src/renderer/src/components/settings/ProviderList.tsx`
- Test: `src/renderer/src/components/settings/__tests__/ProviderList.test.tsx`

**Step 1: Write the failing test**
```tsx
it('should render ProviderCard for each provider', async () => {
  render(<ProviderList />)
  expect(screen.getAllByTestId('provider-card').length).toBeGreaterThan(0)
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test:renderer -- src/renderer/src/components/settings/__tests__/ProviderList.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**
```tsx
// ProviderList.tsx
import { ProviderCard } from './ProviderCard'
// map to ProviderCard with data-testid="provider-card"
```

**Step 4: Run test to verify it passes**
Run: `npm run test:renderer -- src/renderer/src/components/settings/__tests__/ProviderList.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/renderer/src/components/settings/ProviderCard.tsx \
  src/renderer/src/components/settings/ProviderList.tsx \
  src/renderer/src/components/settings/__tests__/ProviderList.test.tsx

git commit -m "style: refresh provider cards"
```

### Task 12: dragEvent 未定义错误

**Files:**
- Modify: `src/renderer/src/components/chat/ImageDropZone.tsx`
- Test: `src/renderer/src/components/chat/__tests__/ImageDropZone.test.tsx`

**Step 1: Write the failing test**
```tsx
it('should not reference undefined dragEvent', async () => {
  render(<ImageDropZone onImagesDropped={() => {}}>X</ImageDropZone>)
  // trigger drag events without errors
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test:renderer -- src/renderer/src/components/chat/__tests__/ImageDropZone.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**
```tsx
// ensure handlers use e: React.DragEvent and no free variable dragEvent
```

**Step 4: Run test to verify it passes**
Run: `npm run test:renderer -- src/renderer/src/components/chat/__tests__/ImageDropZone.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/renderer/src/components/chat/ImageDropZone.tsx \
  src/renderer/src/components/chat/__tests__/ImageDropZone.test.tsx

git commit -m "fix: remove undefined dragEvent usage"
```

### Task 13: CORS 配置动态化

**Files:**
- Modify: `src/api/index.ts`
- Test: `src/api/__tests__/cors.test.ts`

**Step 1: Write the failing test**
```ts
it('should parse CORS origins from env', () => {
  process.env.MUSE_API_CORS_ORIGINS = 'http://a.com,http://b.com'
  expect(parseCorsOrigins()).toEqual(['http://a.com','http://b.com'])
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test:api -- src/api/__tests__/cors.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
```ts
const defaultOrigins = ['http://localhost:5173','http://localhost:5174','http://localhost:4173']
const origins = (process.env.MUSE_API_CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
app.use('*', cors({ origin: origins.length ? origins : defaultOrigins, credentials: true }))
```

**Step 4: Run test to verify it passes**
Run: `npm run test:api -- src/api/__tests__/cors.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/api/index.ts src/api/__tests__/cors.test.ts

git commit -m "chore: make CORS origins configurable"
```

# TODO Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 PRD 中全部 P0-P3 问题并补齐验收与测试，确保状态刷新、搜索、附件、工作区、Provider 管理、UI/样式一致可验证。

**Architecture:** 以 Zustand store 作为状态中枢，renderer 组件只读 store + 触发 action；DB/IPC 层保证数据一致性并提供搜索索引与附件数据；UI/样式通过新增可复用 Loading/Animation 工具与新 Provider 卡片统一。

**Tech Stack:** Electron, React 18, Zustand, Drizzle ORM (SQLite), Hono, Tailwind, Vitest.

**Plan Adjustments (from review):**
- 附件历史消息需要异步拼装，多处用 `Promise.all`，避免在同步 map 中 `await`。
- 动画不引入 Framer Motion；使用 CSS 动画 + `prefers-reduced-motion`。
- `dragEvent` 报错需先定位源码位置；若不存在则将问题标注为“已消失/来源变更”。
- 主题色更新同时覆盖 `.dark` tokens 与 `--accent-hover`。
- 计划文件以 `docs/plans/2026-01-29-todo-fixes-plan.md` 为准；根目录 `docs/2026-01-29-todo-fixes-plan.md` 同步。

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
loadWorkspace: async () => {
  const { path } = await window.api.workspace.get()
  set({ workspacePath: path || null })
},
selectWorkspace: async () => {
  const { path } = await window.api.workspace.select()
  set({ workspacePath: path || null })
},
clearWorkspace: async () => {
  await window.api.workspace.set('')
  set({ workspacePath: null })
},
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
const attachments = window.api?.attachments?.getPreviewsByMessageId
  ? await window.api.attachments.getPreviewsByMessageId(msg.id)
  : []
return { ...msg, attachments }
```
```ts
// chatStore.ts - async build messages with history attachments
const buildContentBlocks = async (m: Message) => {
  const blocks: MessageContent[] = []
  if (m.content) blocks.push({ type: 'text', text: m.content })
  if (m.attachments?.length && window.api?.attachments?.getBase64) {
    const imageBlocks = await Promise.all(
      m.attachments.map(async (a) => {
        const base64 = await window.api.attachments.getBase64(a.id)
        return base64
          ? { type: 'image', mimeType: a.mimeType, data: base64, note: a.note || undefined }
          : null
      })
    )
    blocks.push(...imageBlocks.filter(Boolean))
  }
  return blocks
}

const aiMessages: AIMessage[] = await Promise.all(
  conversation.messages.map(async (m) => {
    if (m.attachments && m.attachments.length > 0) {
      return { role: m.role as 'user' | 'assistant', content: await buildContentBlocks(m) }
    }
    return { role: m.role as 'user' | 'assistant', content: m.content }
  })
)
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
- Modify: `src/main/index.ts` (可选：启动后重建)
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
  try {
    const count = db.get(sql`SELECT COUNT(*) as total FROM search_index`) as any
    const dataCount = db.get(sql`SELECT COUNT(*) as total FROM messages`) as any
    if (!count || count.total === 0) {
      if (!dataCount || dataCount.total > 0) await this.rebuildIndex()
    }
  } catch {
    await this.rebuildIndex()
  }
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
:root {
  --accent: 24 95% 53%;
  --primary: 24 95% 53%;
  --ring: 24 95% 53%;
  --accent-hover: 24 90% 48%;
}
.dark {
  --accent: 24 95% 53%;
  --primary: 24 95% 53%;
  --ring: 24 95% 53%;
  --accent-hover: 24 90% 48%;
}
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

### Task 9: Issue #11 动画效果设计（CSS-only）

**Files:**
- Create: `src/renderer/src/utils/animations.ts`
- Modify: `src/renderer/src/index.css` (keyframes + reduced motion)
- Modify: `src/renderer/src/components/settings/ProviderList.tsx`
- Test: `src/renderer/src/utils/__tests__/animations.test.ts`

**Step 1: Write the failing test**
```ts
import { fadeInUpClass } from '../animations'
expect(fadeInUpClass).toBeDefined()
```

**Step 2: Run test to verify it fails**
Run: `npm run test:renderer -- src/renderer/src/utils/__tests__/animations.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
```ts
export const fadeInUpClass = 'animate-fade-in-up'
```
```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in-up { animation: none; }
}
.animate-fade-in-up {
  animation: fade-in-up 220ms ease-out both;
}
```

**Step 4: Run test to verify it passes**
Run: `npm run test:renderer -- src/renderer/src/utils/__tests__/animations.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/renderer/src/utils/animations.ts \
  src/renderer/src/index.css \
  src/renderer/src/utils/__tests__/animations.test.ts \
  src/renderer/src/components/settings/ProviderList.tsx

git commit -m "feat: add css animation presets"
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

### Task 12: dragEvent 未定义错误（先定位再修）

**Files:**
- Modify: `src/renderer/src/components/chat/ImageDropZone.tsx` (if source is here)
- Test: `src/renderer/src/components/chat/__tests__/ImageDropZone.test.tsx`

**Step 1: Locate the error source**
Run: `rg -n "dragEvent" src/renderer/src`
Expected: find offending reference (if none, note as not present)

**Step 2: Write the failing test (if source confirmed)**
```tsx
it('should not reference undefined dragEvent', async () => {
  render(<ImageDropZone onImagesDropped={() => {}}>X</ImageDropZone>)
  // trigger drag events without errors
})
```

**Step 3: Implement fix**
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

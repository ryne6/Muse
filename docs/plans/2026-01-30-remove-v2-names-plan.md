# Remove V2 Naming Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将已正式使用的 V2 实现统一改为默认命名（去掉 V2），删除旧 V1 代码，迁移 settings 持久化键到无版本名并清理旧键，同时更新所有测试/文档/字面量引用。

**Architecture:** 仅做命名与存储键迁移，保持运行时行为不变。通过重命名文件/导出、更新 import、调整 data-testid/CSS 注释与文档引用；settings store 通过自定义 storage + migrate 从 `muse-settings-v2` 读取并写入 `muse-settings`。

**Tech Stack:** Electron, React 18, Zustand, Vitest, Tailwind.

**Assumptions/Notes:**
- 只改“代码命名/文档引用”的 V2（例如 `Settings`、`settingsStore`、`provider-card`）；不改产品/依赖版本号（如 `v2.0`、`v22.2.0`）。
- 若同时存在 `muse-settings-v2` 与旧 `muse-settings`，优先迁移 V2 数据并覆盖旧键。
- 删除旧 V1 store 后，MigrationHandler 不再依赖 V1 store；如需迁移旧 localStorage 数据，改为直接读取 legacy key。

### Task 1: 重命名 Conversation Store 并清理旧 V1

**Files:**
- Delete: `src/renderer/src/stores/conversationStore.ts`
- Move: `src/renderer/src/stores/conversationStore.ts` → `src/renderer/src/stores/conversationStore.ts`
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/stores/chatStore.ts`
- Modify: `src/renderer/src/components/MigrationHandler.tsx`
- Modify: `src/renderer/src/components/layout/ConversationList.tsx`
- Modify: `src/renderer/src/components/layout/ConversationItem.tsx`
- Modify: `src/renderer/src/components/layout/SearchResults.tsx`
- Modify: `src/renderer/src/components/chat/ChatInput.tsx`
- Modify: `src/renderer/src/components/chat/ChatHeader.tsx`
- Modify: `src/renderer/src/components/chat/MessageList.tsx`
- Modify: `src/renderer/src/components/chat/__tests__/ChatInput.test.tsx`
- Modify: `src/renderer/src/components/chat/__tests__/MessageList.test.tsx`
- Modify: `src/renderer/src/components/layout/__tests__/ConversationList.test.tsx`
- Modify: `src/renderer/src/stores/__tests__/chatStore.test.ts`
- Move: `src/renderer/src/stores/__tests__/conversationStore.test.ts` → `src/renderer/src/stores/__tests__/conversationStore.test.ts`

**Step 1: Write the failing test**
```ts
// conversationStore.test.ts
import { useConversationStore } from '../conversationStore'

describe('ConversationStore', () => {
  // existing tests (renamed) stay the same
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/conversationStore.test.ts`
Expected: FAIL (module not found: conversationStore)

**Step 3: Write minimal implementation**
```ts
// Update imports everywhere
import { useConversationStore } from '@/stores/conversationStore'
```
- Rename the store file to `conversationStore.ts` and remove the old V1 file.
- Update all imports/mocks from `conversationStore` → `conversationStore`.
- Update test describe name to `ConversationStore`.

**Step 4: Run test to verify it passes**
Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/conversationStore.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/renderer/src/stores/conversationStore.ts \
  src/renderer/src/App.tsx \
  src/renderer/src/stores/chatStore.ts \
  src/renderer/src/components/MigrationHandler.tsx \
  src/renderer/src/components/layout/ConversationList.tsx \
  src/renderer/src/components/layout/ConversationItem.tsx \
  src/renderer/src/components/layout/SearchResults.tsx \
  src/renderer/src/components/chat/ChatInput.tsx \
  src/renderer/src/components/chat/ChatHeader.tsx \
  src/renderer/src/components/chat/MessageList.tsx \
  src/renderer/src/components/chat/__tests__/ChatInput.test.tsx \
  src/renderer/src/components/chat/__tests__/MessageList.test.tsx \
  src/renderer/src/components/layout/__tests__/ConversationList.test.tsx \
  src/renderer/src/stores/__tests__/chatStore.test.ts \
  src/renderer/src/stores/__tests__/conversationStore.test.ts

git commit -m "refactor: rename conversation store to default"
```

### Task 2: 重命名 Settings Store + 迁移持久化键

**Files:**
- Delete: `src/renderer/src/stores/settingsStore.ts`
- Move: `src/renderer/src/stores/settingsStore.ts` → `src/renderer/src/stores/settingsStore.ts`
- Modify: `src/renderer/src/components/settings/AddProviderDialog.tsx`
- Modify: `src/renderer/src/components/settings/ManageModelsDialog.tsx`
- Modify: `src/renderer/src/components/settings/ProviderConfigDialog.tsx`
- Modify: `src/renderer/src/components/chat/ModelSelector.tsx`
- Modify: `src/renderer/src/components/chat/TemperatureControl.tsx`
- Modify: `src/renderer/src/components/chat/ChatInput.tsx`
- Modify: `src/renderer/src/components/chat/__tests__/ChatInput.test.tsx`
- Modify: `src/renderer/src/components/MigrationHandler.tsx`
- Move: `src/renderer/src/stores/__tests__/settingsStore.test.ts` → `src/renderer/src/stores/__tests__/settingsStore.test.ts`

**Step 1: Write the failing test**
```ts
// settingsStore.test.ts
import { useSettingsStore } from '../settingsStore'

describe('SettingsStore', () => {
  // existing tests (renamed) stay the same
})
```

**Step 2: Run test to verify it fails**
Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/settingsStore.test.ts`
Expected: FAIL (module not found: settingsStore)

**Step 3: Write minimal implementation**
```ts
// settingsStore.ts
const SETTINGS_STORAGE_KEY = 'muse-settings'
const LEGACY_SETTINGS_KEY = 'muse-settings-v2'

const legacyAwareStorage = {
  getItem: (name: string) => {
    const legacy = localStorage.getItem(LEGACY_SETTINGS_KEY)
    return legacy ?? localStorage.getItem(name)
  },
  setItem: (name: string, value: string) => {
    localStorage.setItem(name, value)
    localStorage.removeItem(LEGACY_SETTINGS_KEY)
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name)
    localStorage.removeItem(LEGACY_SETTINGS_KEY)
  }
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({ /* existing store body */ }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => legacyAwareStorage),
      partialize: (state) => ({
        currentProviderId: state.currentProviderId,
        currentModelId: state.currentModelId,
        temperature: state.temperature,
      }),
      migrate: (persisted: any) => ({
        currentProviderId: persisted?.state?.currentProviderId ?? null,
        currentModelId: persisted?.state?.currentModelId ?? null,
        temperature: typeof persisted?.state?.temperature === 'number' ? persisted.state.temperature : 1,
      }),
    }
  )
)
```
```ts
// Update imports everywhere
import { useSettingsStore } from '@/stores/settingsStore'
```
- Rename `SettingsStoreV2` → `SettingsStore`, `useSettingsStoreV2` → `useSettingsStore`.
- Remove old V1 settings store file.
- Update MigrationHandler to drop V1 store import and, if needed, read legacy localStorage directly (see Task 3 for data-testid/doc updates).

**Step 4: Run test to verify it passes**
Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/settingsStore.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/renderer/src/stores/settingsStore.ts \
  src/renderer/src/components/settings/AddProviderDialog.tsx \
  src/renderer/src/components/settings/ManageModelsDialog.tsx \
  src/renderer/src/components/settings/ProviderConfigDialog.tsx \
  src/renderer/src/components/chat/ModelSelector.tsx \
  src/renderer/src/components/chat/TemperatureControl.tsx \
  src/renderer/src/components/chat/ChatInput.tsx \
  src/renderer/src/components/chat/__tests__/ChatInput.test.tsx \
  src/renderer/src/components/MigrationHandler.tsx \
  src/renderer/src/stores/__tests__/settingsStore.test.ts

git commit -m "refactor: rename settings store and migrate storage key"
```

### Task 3: 重命名 Settings/ProviderCard 组件 + 更新 data-testid

**Files:**
- Move: `src/renderer/src/components/layout/Settings.tsx` → `src/renderer/src/components/layout/Settings.tsx`
- Move: `src/renderer/src/components/settings/ProviderCard.tsx` → `src/renderer/src/components/settings/ProviderCard.tsx`
- Modify: `src/renderer/src/components/layout/Sidebar.tsx`
- Modify: `src/renderer/src/components/settings/ProviderList.tsx`
- Move: `src/renderer/src/components/layout/__tests__/Settings.test.tsx` → `src/renderer/src/components/layout/__tests__/Settings.test.tsx`
- Modify: `src/renderer/src/components/settings/__tests__/ProviderList.test.tsx`

**Step 1: Write the failing test**
```ts
// Settings.test.tsx
import { Settings } from '../Settings'

describe('Settings', () => { /* existing tests */ })
```
```ts
// ProviderList.test.tsx (mock)
vi.mock('../ProviderCard', () => ({
  ProviderCard: () => <div data-testid="provider-card" />
}))
```

**Step 2: Run test to verify it fails**
Run: `npm run test:renderer -- src/renderer/src/components/layout/__tests__/Settings.test.tsx`
Expected: FAIL (module not found: Settings)

**Step 3: Write minimal implementation**
```tsx
// ProviderCard.tsx
export function ProviderCard(...) {
  return <div data-testid="provider-card">...</div>
}
```
```tsx
// ProviderList.tsx
import { ProviderCard } from './ProviderCard'
```
```tsx
// Sidebar.tsx
import { Settings } from './Settings'
```
- Rename Settings/ProviderCard files and exports.
- Update test IDs from `provider-card` → `provider-card` in code + tests.

**Step 4: Run test to verify it passes**
Run: `npm run test:renderer -- src/renderer/src/components/layout/__tests__/Settings.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/renderer/src/components/layout/Settings.tsx \
  src/renderer/src/components/settings/ProviderCard.tsx \
  src/renderer/src/components/layout/Sidebar.tsx \
  src/renderer/src/components/settings/ProviderList.tsx \
  src/renderer/src/components/layout/__tests__/Settings.test.tsx \
  src/renderer/src/components/settings/__tests__/ProviderList.test.tsx

git commit -m "refactor: rename settings/provider components"
```

### Task 4: 更新 CSS 注释/文档引用/计划文件中的 V2 命名

**Files:**
- Modify: `src/renderer/src/index.css`
- Modify: `docs/00-complete-implementation-report.md`
- Modify: `docs/PRD_TODO_FIXES.md`
- Modify: `docs/99-project-completion-summary.md`
- Modify: `docs/30-phase3-provider-management-completion.md`
- Modify: `docs/28-phase1.5-migration-completion.md`
- Modify: `docs/40-phase4-end-to-end-integration.md`
- Modify: `docs/2026-01-29-todo-fixes-plan.md`
- Modify: `docs/plans/2026-01-29-todo-fixes-plan.md`
- Modify: `docs/plans/2026-01-29-lobe-layout-implementation.md`
- Modify: `docs/plans/2026-01-29-lobe-ui-migration.md`
- Modify: `docs/plans/provider-card-layout-fix.md`
- Modify: `prd/07-system-design.md`
- Modify: `prd/06-test-coverage-plan.md`
- Modify: `prd/11-test-failures-report.md`
- Move: `prd/09-ui-design-system.md` → `prd/09-ui-design-system.md`
- Move: `prd/10-ui-implementation-gaps.md` → `prd/10-ui-implementation-gaps.md`

**Step 1: Write the failing test**
```md
// Example doc updates (conceptual)
- Settings → Settings
- ProviderCard → ProviderCard
- settingsStore → settingsStore
- conversationStore → conversationStore
- provider-card → provider-card
```

**Step 2: Run check to verify it fails**
Run: `rg -n "Settings|ProviderCard|settingsStore|conversationStore|provider-card" docs prd src`
Expected: Hits still present

**Step 3: Write minimal implementation**
```css
/* index.css */
/* Surface layers */
/* Text layers */
/* Interaction states */
```
```md
// prd/10-ui-implementation-gaps.md
**范围**: 对照 `prd/09-ui-design-system.md` 与当前实现，列出未符合项与优先级。
```
- 更新文档/计划中的 V2 命名、路径和 data-testid。
- 重命名 PRD 文件并修正引用路径。

**Step 4: Run check to verify it passes**
Run: `rg -n "Settings|ProviderCard|settingsStore|conversationStore|provider-card" docs prd src`
Expected: No matches (except product/依赖版本号)

**Step 5: Commit**
```bash
git add src/renderer/src/index.css \
  docs/00-complete-implementation-report.md \
  docs/PRD_TODO_FIXES.md \
  docs/99-project-completion-summary.md \
  docs/30-phase3-provider-management-completion.md \
  docs/28-phase1.5-migration-completion.md \
  docs/40-phase4-end-to-end-integration.md \
  docs/2026-01-29-todo-fixes-plan.md \
  docs/plans/2026-01-29-todo-fixes-plan.md \
  docs/plans/2026-01-29-lobe-layout-implementation.md \
  docs/plans/2026-01-29-lobe-ui-migration.md \
  docs/plans/provider-card-layout-fix.md \
  prd/07-system-design.md \
  prd/06-test-coverage-plan.md \
  prd/11-test-failures-report.md \
  prd/09-ui-design-system.md \
  prd/10-ui-implementation-gaps.md

git commit -m "docs: remove V2 naming from references"
```

### Task 5: 全局回归检查

**Files:**
- None (verification only)

**Step 1: Run targeted tests**
Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/conversationStore.test.ts`
Expected: PASS

**Step 2: Run targeted tests**
Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/settingsStore.test.ts`
Expected: PASS

**Step 3: Run targeted tests**
Run: `npm run test:renderer -- src/renderer/src/components/layout/__tests__/Settings.test.tsx`
Expected: PASS

**Step 4: Final search**
Run: `rg -n "Settings|ProviderCard|settingsStore|conversationStore|provider-card" src docs prd`
Expected: No matches

**Step 5: Commit**
```bash
# no code changes, optional
```

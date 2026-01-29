# Lobe Layout Clone Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Lobe-style layout/theme (from `demo.html`) across the main app UI and add system-font selection in Settings.

**Architecture:** Centralize Lobe tokens in `src/renderer/src/index.css`, then refactor layout components to match the two-column structure (sidebar + main chat). Add a `ChatHeader` for model/plugin tags, align message list/item and input styles to the demo, and persist a user-selected UI font in the settings DB, applying it via a root CSS variable.

**Tech Stack:** React 18, Tailwind CSS, Zustand, Electron, Vitest.

---

### Task 1: Lobe Theme Tokens in `index.css`

**Files:**
- Modify: `src/renderer/src/index.css`
- Create: `src/renderer/src/__tests__/themeTokens.test.ts`

**Step 1: Write the failing test**

```ts
// src/renderer/src/__tests__/themeTokens.test.ts
import fs from 'node:fs/promises'

it('defines Lobe theme tokens', async () => {
  const css = await fs.readFile('src/renderer/src/index.css', 'utf-8')
  expect(css).toContain('--background: 0 0% 100%')
  expect(css).toContain('--bg-sidebar: 210 17% 98%')
  expect(css).toContain('--border: 0 0% 90%')
  expect(css).toContain('--text-muted: 0 0% 60%')
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:renderer -- src/renderer/src/__tests__/themeTokens.test.ts`
Expected: FAIL (missing tokens).

**Step 3: Write minimal implementation**

Update `:root` in `src/renderer/src/index.css` to align with demo tokens (HSL values computed from hex):

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 13%;
  --border: 0 0% 90%;
  --input: 0 0% 90%;
  --ring: 0 0% 0%;
  --muted-foreground: 0 0% 60%;
  --bg-sidebar: 210 17% 98%;
  --bg-main: 0 0% 100%;
  --surface-1: 0 0% 100%;
  --surface-2: 0 0% 96%;
  --surface-3: 0 0% 98%;
  --text-strong: 0 0% 13%;
  --text: 0 0% 40%;
  --text-muted: 0 0% 60%;
  --accent: 0 0% 0%;
}

body {
  font-family: var(--font-ui, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:renderer -- src/renderer/src/__tests__/themeTokens.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/src/index.css src/renderer/src/__tests__/themeTokens.test.ts
git commit -m "style: align base tokens with demo html"
```

---

### Task 2: Sidebar + Conversation List Layout

**Files:**
- Modify: `src/renderer/src/components/layout/AppLayout.tsx`
- Modify: `src/renderer/src/components/layout/Sidebar.tsx`
- Modify: `src/renderer/src/components/layout/ConversationList.tsx`
- Modify: `src/renderer/src/components/layout/ConversationGroup.tsx`
- Modify: `src/renderer/src/components/layout/ConversationItem.tsx`
- Modify: `src/renderer/src/components/layout/SearchBar.tsx`
- Modify: `src/renderer/src/components/layout/SearchResults.tsx`
- Test: `src/renderer/src/components/layout/__tests__/ConversationList.test.tsx`

**Step 1: Write the failing test**

Update `ConversationList.test.tsx` to reflect new labels and CTA:

```ts
expect(screen.getByText('开启新话题')).toBeInTheDocument()
expect(screen.getByText('# 昨天')).toBeInTheDocument()
```

**Step 2: Run test to verify it fails**

Run: `npm run test:renderer -- src/renderer/src/components/layout/__tests__/ConversationList.test.tsx`
Expected: FAIL (text not found).

**Step 3: Write minimal implementation**

- `AppLayout`: remove `FileExplorer` rendering to enforce two-column layout; set root background to `bg-main` and align with new sidebar width.
- `Sidebar`: match demo structure (brand row + new chat + search + list + settings), use `w-[280px]` and `bg-[hsl(var(--bg-sidebar))]`.
- `ConversationList`: update CTA to “开启新话题”, apply demo-style spacing, and update group labels to Chinese (e.g., `# 昨天`, `# 本周`, `# 本月`, `# 2025`).
- `ConversationItem`: remove accent bar; use neutral active background (`bg-[#E8E8E8]` via token), smaller icon, and simpler layout.
- `SearchBar`: default state shows icon + “搜索” text in a subtle row; expanded input uses `bg-white` + subtle border.
- `SearchResults`: adjust heading and list spacing to match muted style.

**Step 4: Run test to verify it passes**

Run: `npm run test:renderer -- src/renderer/src/components/layout/__tests__/ConversationList.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/src/components/layout/AppLayout.tsx \
  src/renderer/src/components/layout/Sidebar.tsx \
  src/renderer/src/components/layout/ConversationList.tsx \
  src/renderer/src/components/layout/ConversationGroup.tsx \
  src/renderer/src/components/layout/ConversationItem.tsx \
  src/renderer/src/components/layout/SearchBar.tsx \
  src/renderer/src/components/layout/SearchResults.tsx \
  src/renderer/src/components/layout/__tests__/ConversationList.test.tsx

git commit -m "style: align sidebar and conversations with demo"
```

---

### Task 3: Chat Header + Message List/Item Styling

**Files:**
- Create: `src/renderer/src/components/chat/ChatHeader.tsx`
- Modify: `src/renderer/src/components/chat/ChatView.tsx`
- Modify: `src/renderer/src/components/chat/MessageList.tsx`
- Modify: `src/renderer/src/components/chat/MessageItem.tsx`
- Modify: `src/renderer/src/components/chat/MarkdownRenderer.tsx`
- Test: `src/renderer/src/components/chat/__tests__/MessageItem.test.tsx`

**Step 1: Write the failing test**

```ts
// src/renderer/src/components/chat/__tests__/MessageItem.test.tsx
import { render, screen } from '@testing-library/react'
import { MessageItem } from '../MessageItem'

const baseMessage = {
  id: 'm1',
  role: 'assistant',
  content: 'Hello',
  timestamp: Date.now(),
  attachments: [],
} as any

it('renders assistant header with name and timestamp', () => {
  render(<MessageItem message={baseMessage} />)
  expect(screen.getByText('Lobe AI')).toBeInTheDocument()
  expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument()
})

it('renders user message as a bubble only', () => {
  render(<MessageItem message={{ ...baseMessage, role: 'user', content: 'hi' }} />)
  expect(screen.getByText('hi').closest('[data-user-bubble]')).toBeTruthy()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:renderer -- src/renderer/src/components/chat/__tests__/MessageItem.test.tsx`
Expected: FAIL (name/bubble not found).

**Step 3: Write minimal implementation**

- Add `ChatHeader` to show current model (from `settingsStoreV2`) and a static “联网搜索” tag (no right-side icons).
- `MessageList`: center messages with `max-w-[800px]`, increase vertical spacing to 24px, align with demo padding.
- `MessageItem`: keep avatar from existing logic; for assistant, render header row (avatar + name + timestamp) and body without bubble; for user, render a single bubble with padding `10px 16px` and `rounded-xl` and `data-user-bubble` attribute for test.
- `MarkdownRenderer`: set code blocks to `bg-[hsl(var(--surface-2))]` and border with `--border` to mimic demo.

**Step 4: Run test to verify it passes**

Run: `npm run test:renderer -- src/renderer/src/components/chat/__tests__/MessageItem.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/src/components/chat/ChatHeader.tsx \
  src/renderer/src/components/chat/ChatView.tsx \
  src/renderer/src/components/chat/MessageList.tsx \
  src/renderer/src/components/chat/MessageItem.tsx \
  src/renderer/src/components/chat/MarkdownRenderer.tsx \
  src/renderer/src/components/chat/__tests__/MessageItem.test.tsx

git commit -m "style: align chat header and messages with demo"
```

---

### Task 4: Chat Input Layout (Lobe Style)

**Files:**
- Modify: `src/renderer/src/components/chat/ChatInput.tsx`
- Test: `src/renderer/src/components/chat/__tests__/ChatInput.test.tsx`

**Step 1: Write the failing test**

Add expectation for new placeholder and absence of Model/Temperature controls in ChatInput tests:

```ts
expect(screen.getByPlaceholderText('从任何想法开始…')).toBeInTheDocument()
expect(screen.queryByText('Temperature')).not.toBeInTheDocument()
```

**Step 2: Run test to verify it fails**

Run: `npm run test:renderer -- src/renderer/src/components/chat/__tests__/ChatInput.test.tsx`
Expected: FAIL (placeholder / controls still present).

**Step 3: Write minimal implementation**

- Remove `ModelSelector` and `TemperatureControl` UI blocks from ChatInput.
- Restructure input container to match demo: white background, subtle border, `rounded-xl`, `shadow` only on main input box, with an icon row and bottom row for textarea + send button.
- Keep all send logic and image uploads unchanged.

**Step 4: Run test to verify it passes**

Run: `npm run test:renderer -- src/renderer/src/components/chat/__tests__/ChatInput.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/src/components/chat/ChatInput.tsx \
  src/renderer/src/components/chat/__tests__/ChatInput.test.tsx

git commit -m "style: match chat input layout to demo"
```

---

### Task 5: System Font Selection (Settings → General)

**Files:**
- Create: `src/renderer/src/services/fontService.ts`
- Modify: `src/renderer/src/components/layout/SettingsV2.tsx`
- Modify: `src/renderer/src/components/layout/AppLayout.tsx`
- Modify: `src/renderer/src/services/dbClient.ts` (if typing needs a new helper)
- Test: `src/renderer/src/components/layout/__tests__/SettingsV2.test.tsx`

**Step 1: Write the failing test**

```ts
// in SettingsV2.test.tsx
await user.click(screen.getByText('Settings'))
await user.click(screen.getByText('General'))
expect(screen.getByLabelText('UI Font')).toBeInTheDocument()
```

**Step 2: Run test to verify it fails**

Run: `npm run test:renderer -- src/renderer/src/components/layout/__tests__/SettingsV2.test.tsx`
Expected: FAIL (UI Font control missing).

**Step 3: Write minimal implementation**

- `fontService.ts`: expose `getSystemFonts()` using `window.queryLocalFonts?.()` with fallback to a small default list and a manual text input.
- `SettingsV2`: render a select/input in General tab labeled “UI Font”; on change, persist to `dbClient.settings.set('uiFont', font)` and apply to `document.documentElement.style.setProperty('--font-ui', font)`.
- `AppLayout`: on mount, read `dbClient.settings.get('uiFont')` and apply it (fallback to system stack).

**Step 4: Run test to verify it passes**

Run: `npm run test:renderer -- src/renderer/src/components/layout/__tests__/SettingsV2.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/renderer/src/services/fontService.ts \
  src/renderer/src/components/layout/SettingsV2.tsx \
  src/renderer/src/components/layout/AppLayout.tsx \
  src/renderer/src/components/layout/__tests__/SettingsV2.test.tsx

git commit -m "feat: add UI font selection in settings"
```

---

## Baseline Verification

Before any implementation steps, verify baseline still passes:

Run: `npm run test:renderer -- src/renderer/src/components/layout/__tests__/ConversationList.test.tsx`
Expected: PASS (already verified in worktree).

## Final Verification

Run the focused renderer tests for changed areas:

```bash
npm run test:renderer -- src/renderer/src/__tests__/themeTokens.test.ts \
  src/renderer/src/components/layout/__tests__/ConversationList.test.tsx \
  src/renderer/src/components/chat/__tests__/MessageItem.test.tsx \
  src/renderer/src/components/chat/__tests__/ChatInput.test.tsx \
  src/renderer/src/components/layout/__tests__/SettingsV2.test.tsx
```


# Claude-Style Tools (Direct Replacement) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace existing tool names with Claude Code–style tools (Bash/Read/Write/Edit/LS/TodoWrite) and implement Edit + TodoWrite behavior without breaking tool execution flow.

**Architecture:** Keep the current ToolExecutor → IPC bridge → FileSystemService pipeline. Replace tool definitions/names, add Edit handling via a new IPC route, and implement TodoWrite directly in the ToolExecutor (no persistence). Update UI tool name mapping for display.

**Tech Stack:** TypeScript, Electron, Hono IPC bridge, Vitest.

---

### Task 1: Update tool definitions (names + schemas)

**Files:**
- Modify: `src/api/services/ai/tools/definitions.ts`
- Modify: `src/api/services/ai/tools/__tests__/definitions.test.ts`

**Step 1: Write the failing test**

Update `src/api/services/ai/tools/__tests__/definitions.test.ts` to assert:
- Exactly 6 tools
- Names: `Bash`, `Read`, `Write`, `Edit`, `LS`, `TodoWrite`
- Schemas contain required fields (per design)

**Step 2: Run test to verify it fails**

Run: `npm run test:api -- src/api/services/ai/tools/__tests__/definitions.test.ts`
Expected: FAIL (tool count/names mismatch)

**Step 3: Write minimal implementation**

Update `src/api/services/ai/tools/definitions.ts`:
- Replace existing tool entries with the 6 new tools
- Define input schemas:
  - `Bash`: `{ command, cwd? }`
  - `Read`: `{ path }`
  - `Write`: `{ path, content }`
  - `Edit`: `{ path, old_text, new_text, replace_all? }`
  - `LS`: `{ path, pattern? }`
  - `TodoWrite`: `{ todos: [{ id, title, status, notes? }] }`

**Step 4: Run test to verify it passes**

Run: `npm run test:api -- src/api/services/ai/tools/__tests__/definitions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/api/services/ai/tools/definitions.ts src/api/services/ai/tools/__tests__/definitions.test.ts
git commit -m "feat: replace tool definitions with Claude-style tools"
```

---

### Task 2: Add Edit and TodoWrite handling in ToolExecutor

**Files:**
- Modify: `src/api/services/ai/tools/executor.ts`
- Modify: `src/api/services/ai/tools/__tests__/executor.test.ts`

**Step 1: Write the failing test**

Add tests in `src/api/services/ai/tools/__tests__/executor.test.ts` for:
- `Bash` routes to `executeCommand`
- `Read` routes to `readFile`
- `Write` routes to `writeFile`
- `LS` routes to `listFiles`
- `Edit` routes to `editFile` (new IPC)
- `TodoWrite` returns a normalized markdown list

**Step 2: Run test to verify it fails**

Run: `npm run test:api -- src/api/services/ai/tools/__tests__/executor.test.ts`
Expected: FAIL (unknown tools / missing methods)

**Step 3: Write minimal implementation**

Update `src/api/services/ai/tools/executor.ts`:
- Rename tool cases to `Bash`, `Read`, `Write`, `Edit`, `LS`, `TodoWrite`
- Implement `editFile` call via IPC `fs:editFile`
- Implement `TodoWrite` directly: validate status, output markdown like:
  - `[ ] title` for `todo`
  - `[~] title` for `in_progress`
  - `[x] title` for `done`
  Include notes as indented lines if present

**Step 4: Run test to verify it passes**

Run: `npm run test:api -- src/api/services/ai/tools/__tests__/executor.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/api/services/ai/tools/executor.ts src/api/services/ai/tools/__tests__/executor.test.ts
git commit -m "feat: route Claude-style tools in executor"
```

---

### Task 3: Implement editFile in IPC bridge and FileSystemService

**Files:**
- Modify: `src/main/ipcBridge.ts`
- Modify: `src/main/services/fileSystemService.ts`
- (Optional) Modify: `src/shared/types/ipc.ts`

**Step 1: Write the failing test**

If no tests exist for FileSystemService, add one in a new file:
- Create: `src/main/services/__tests__/fileSystemService.test.ts`
Include a test that:
- Writes a temp file
- Calls `editFile` to replace a substring
- Verifies replacement count and file contents

**Step 2: Run test to verify it fails**

Run: `npm run test:main -- src/main/services/__tests__/fileSystemService.test.ts`
Expected: FAIL (editFile not implemented)

**Step 3: Write minimal implementation**

In `src/main/services/fileSystemService.ts`:
- Add `editFile(path, oldText, newText, replaceAll?)`:
  - Read file (respect 10MB limit)
  - If `oldText` not found, throw error
  - Replace once or all
  - Write file
  - Return replace count

In `src/main/ipcBridge.ts`:
- Add route `fs:editFile` to call `editFile` and return `{ replaced: number }`

(Optional) Update `src/shared/types/ipc.ts` to include `editFile` for type completeness.

**Step 4: Run test to verify it passes**

Run: `npm run test:main -- src/main/services/__tests__/fileSystemService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/services/fileSystemService.ts src/main/ipcBridge.ts src/main/services/__tests__/fileSystemService.test.ts src/shared/types/ipc.ts
git commit -m "feat: add editFile IPC support"
```

---

### Task 4: Update tool UI name mappings

**Files:**
- Modify: `src/renderer/src/components/chat/ToolCallCard.tsx`

**Step 1: Write the failing test**

If no UI tests exist for icons, add a minimal test:
- Create: `src/renderer/src/components/chat/__tests__/ToolCallCard.test.tsx`
- Verify that `Bash`, `Read`, `Write`, `Edit`, `LS`, `TodoWrite` map to icons

**Step 2: Run test to verify it fails**

Run: `npm run test:renderer -- src/renderer/src/components/chat/__tests__/ToolCallCard.test.tsx`
Expected: FAIL (no mapping)

**Step 3: Write minimal implementation**

In `src/renderer/src/components/chat/ToolCallCard.tsx`:
- Update `TOOL_ICONS` keys to the new tool names
- Add an icon for `Bash` and `TodoWrite` (fallback is OK if desired)

**Step 4: Run test to verify it passes**

Run: `npm run test:renderer -- src/renderer/src/components/chat/__tests__/ToolCallCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/src/components/chat/ToolCallCard.tsx src/renderer/src/components/chat/__tests__/ToolCallCard.test.tsx
git commit -m "feat: update tool UI labels for Claude-style tools"
```

---

### Task 5: Smoke test tool execution flow (manual)

**Files:**
- None (manual verification)

**Step 1: Run targeted API tests**

Run: `npm run test:api`
Expected: PASS

**Step 2: Manual sanity check (optional)**

- Start app, trigger a tool call (e.g., ask for `Read` a file)
- Confirm tool call + tool result show in UI

**Step 3: Commit (if any docs updated)**

```bash
git add -A
git commit -m "chore: verify Claude-style tools"
```


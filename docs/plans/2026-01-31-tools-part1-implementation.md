# Tools Part 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add TitleCase Glob/Grep/Git/Web tools to the existing ToolExecutor → IPC → Service pipeline with tests.

**Architecture:** Extend tool definitions and executor routing; add FileSystemService glob/grep, introduce GitService and WebService, and wire IPC routes. Outputs are formatted as plain text in ToolExecutor.

**Tech Stack:** TypeScript, Electron, Hono IPC bridge, Vitest, axios, fast-glob.

---

### Task 1: Add tool definitions for Glob/Grep/Git/Web

**Files:**
- Modify: `src/api/services/ai/tools/definitions.ts`
- Modify: `src/api/services/ai/tools/__tests__/definitions.test.ts`

**Step 1: Write the failing test**

Update `src/api/services/ai/tools/__tests__/definitions.test.ts` to assert new tool names exist in order:
`Bash, Read, Write, Edit, LS, TodoWrite, Glob, Grep, GitStatus, GitDiff, GitLog, GitCommit, GitPush, GitCheckout, WebFetch, WebSearch`.

**Step 2: Run test to verify it fails**

Run: `npm run test:api -- src/api/services/ai/tools/__tests__/definitions.test.ts`
Expected: FAIL (missing tools)

**Step 3: Write minimal implementation**

Extend `src/api/services/ai/tools/definitions.ts` with tool schemas for:
- `Glob`, `Grep`
- `GitStatus`, `GitDiff`, `GitLog`, `GitCommit`, `GitPush`, `GitCheckout`
- `WebFetch`, `WebSearch`

**Step 4: Run test to verify it passes**

Run: `npm run test:api -- src/api/services/ai/tools/__tests__/definitions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/api/services/ai/tools/definitions.ts src/api/services/ai/tools/__tests__/definitions.test.ts
git commit -m "feat: add Glob/Grep/Git/Web tool definitions"
```

---

### Task 2: Route new tools in ToolExecutor

**Files:**
- Modify: `src/api/services/ai/tools/executor.ts`
- Modify: `src/api/services/ai/tools/__tests__/executor.test.ts`

**Step 1: Write the failing test**

Add tests for:
- `Glob` → IPC `fs:glob`
- `Grep` → IPC `fs:grep`
- `GitStatus/GitDiff/GitLog/GitCommit/GitPush/GitCheckout` → IPC `git:*`
- `WebFetch/WebSearch` → IPC `web:*`
- Ensure output formatting for Grep/WebSearch is text.

**Step 2: Run test to verify it fails**

Run: `npm run test:api -- src/api/services/ai/tools/__tests__/executor.test.ts`
Expected: FAIL (unknown tools)

**Step 3: Write minimal implementation**

Update `src/api/services/ai/tools/executor.ts`:
- Add routing cases for new tools
- Add formatter helpers:
  - Grep: `path:line content`
  - WebSearch: numbered list `1. Title\n   URL\n   Snippet`

**Step 4: Run test to verify it passes**

Run: `npm run test:api -- src/api/services/ai/tools/__tests__/executor.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/api/services/ai/tools/executor.ts src/api/services/ai/tools/__tests__/executor.test.ts
git commit -m "feat: route Glob/Grep/Git/Web tools in executor"
```

---

### Task 3: Implement FileSystemService glob/grep + IPC

**Files:**
- Modify: `src/main/services/fileSystemService.ts`
- Modify: `src/main/ipcBridge.ts`
- Modify: `src/main/services/__tests__/fileSystemService.test.ts`
- (Optional) Modify: `src/shared/types/ipc.ts`

**Step 1: Write the failing test**

Add unit tests in `src/main/services/__tests__/fileSystemService.test.ts`:
- `glob` returns limited list
- `grep` returns matches with line numbers and content

**Step 2: Run test to verify it fails**

Run: `npm run test:main -- src/main/services/__tests__/fileSystemService.test.ts`
Expected: FAIL (glob/grep missing)

**Step 3: Write minimal implementation**

- Add `glob` using `fast-glob` (limit 500, ignore node_modules/.git)
- Add `grep` that reads files, regex matches lines, limit default 100
- Wire IPC routes `fs:glob` and `fs:grep`
- Update IPC types if needed

**Step 4: Run test to verify it passes**

Run: `npm run test:main -- src/main/services/__tests__/fileSystemService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/services/fileSystemService.ts src/main/ipcBridge.ts src/main/services/__tests__/fileSystemService.test.ts src/shared/types/ipc.ts
git commit -m "feat: add fs glob/grep services"
```

---

### Task 4: Add GitService + IPC

**Files:**
- Create: `src/main/services/gitService.ts`
- Modify: `src/main/ipcBridge.ts`
- Create: `src/main/services/__tests__/gitService.test.ts`
- (Optional) Modify: `src/shared/types/ipc.ts`

**Step 1: Write the failing test**

Create `gitService.test.ts` with mocked exec:
- `status`, `diff`, `log` return stdout
- `commit` stages files if provided and commits
- `push` and `checkout` run with args

**Step 2: Run test to verify it fails**

Run: `npm run test:main -- src/main/services/__tests__/gitService.test.ts`
Expected: FAIL (service missing)

**Step 3: Write minimal implementation**

Implement `GitService` methods that shell out to `git` using `exec`:
- `status(path?)`, `diff(path?, staged?, file?)`, `log(path?, maxCount?)`
- `commit(path?, message, files?)` (if files: stage them)
- `push(path?, remote?, branch?)`
- `checkout(path?, branch, create?)`

Add IPC routes `git:*` to call GitService.

**Step 4: Run test to verify it passes**

Run: `npm run test:main -- src/main/services/__tests__/gitService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/services/gitService.ts src/main/ipcBridge.ts src/main/services/__tests__/gitService.test.ts src/shared/types/ipc.ts
git commit -m "feat: add git service and ipc routes"
```

---

### Task 5: Add WebService + IPC

**Files:**
- Create: `src/main/services/webService.ts`
- Modify: `src/main/ipcBridge.ts`
- Create: `src/main/services/__tests__/webService.test.ts`

**Step 1: Write the failing test**

Create `webService.test.ts` to verify:
- HTTPS-only enforcement
- `fetch` strips HTML
- `search` returns parsed results (mock axios)

**Step 2: Run test to verify it fails**

Run: `npm run test:main -- src/main/services/__tests__/webService.test.ts`
Expected: FAIL (service missing)

**Step 3: Write minimal implementation**

Implement `WebService` with axios:
- `fetch(url, maxLength)` with https-only, htmlToText
- `search(query, limit, recencyDays, domains)` using DuckDuckGo HTML page parsing (simple regex/dom-free parsing)

Wire IPC routes `web:fetch` and `web:search`.

**Step 4: Run test to verify it passes**

Run: `npm run test:main -- src/main/services/__tests__/webService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/main/services/webService.ts src/main/ipcBridge.ts src/main/services/__tests__/webService.test.ts
git commit -m "feat: add web service and ipc routes"
```

---

### Task 6: Targeted API test run

**Files:**
- None

**Step 1: Run targeted tool tests**

Run: `npm run test:api -- src/api/services/ai/tools/__tests__/definitions.test.ts src/api/services/ai/tools/__tests__/executor.test.ts`
Expected: PASS

**Step 2: Commit (if needed)**

No commit unless changes required.


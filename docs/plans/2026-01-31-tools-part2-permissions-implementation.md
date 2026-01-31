# Tools Part 2 (Permissions) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add workspace-scoped tool permissions with inline Allow/Allow All/Deny in chat for dangerous tools.

**Architecture:** ToolExecutor gates dangerous tools and emits a permission-request payload; the UI renders inline buttons and sends a short approval message with a one-shot allow list. Allow All persists per workspace in settings.

**Tech Stack:** TypeScript, Zustand, React, Vitest, Electron IPC, existing AI tool loop.

---

### Task 1: Define shared permission constants + ToolExecutor gating tests

**Files:**
- Create: `src/shared/types/toolPermissions.ts`
- Modify: `src/api/services/ai/tools/__tests__/executor.test.ts`

**Step 1: Write the failing test**

```ts
import { TOOL_PERMISSION_PREFIX } from '@shared/types/toolPermissions'

it('returns permission request for dangerous tool when not allowed', async () => {
  vi.mocked(axios.post).mockResolvedValue({ data: { output: 'ok' } })

  const result = await executor.execute(
    'Bash',
    { command: 'ls' },
    { toolCallId: 'tc-1', toolPermissions: { allowAll: false } }
  )

  expect(result.startsWith(TOOL_PERMISSION_PREFIX)).toBe(true)
  expect(axios.post).not.toHaveBeenCalled()
})

it('allows dangerous tool when allowOnceToolCallIds includes id', async () => {
  vi.mocked(axios.post).mockResolvedValue({ data: { output: 'ok' } })

  await executor.execute(
    'Bash',
    { command: 'ls' },
    { toolCallId: 'tc-1', allowOnceToolCallIds: ['tc-1'] }
  )

  expect(axios.post).toHaveBeenCalled()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:api -- src/api/services/ai/tools/__tests__/executor.test.ts`
Expected: FAIL (missing TOOL_PERMISSION_PREFIX and new execute signature)

**Step 3: Write minimal shared constants**

```ts
export const DANGEROUS_TOOLS = [
  'Bash',
  'Write',
  'Edit',
  'GitCommit',
  'GitPush',
  'GitCheckout',
] as const

export type DangerousToolName = typeof DANGEROUS_TOOLS[number]

export interface ToolPermissionState {
  allowAll: boolean
}

export interface PermissionRequestPayload {
  kind: 'permission_request'
  toolName: string
  toolCallId?: string
}

export const TOOL_PERMISSION_PREFIX = '__tool_permission__:'
```

**Step 4: Run test to verify it still fails**

Run: `npm run test:api -- src/api/services/ai/tools/__tests__/executor.test.ts`
Expected: FAIL (executor still ungated)

**Step 5: Commit**

```bash
git add src/shared/types/toolPermissions.ts src/api/services/ai/tools/__tests__/executor.test.ts
git commit -m "test: add permission gating cases"
```

---

### Task 2: Gate ToolExecutor and pass tool call ids through providers

**Files:**
- Modify: `src/api/services/ai/tools/executor.ts`
- Modify: `src/api/services/ai/providers/claude.ts`
- Modify: `src/api/services/ai/providers/openai.ts`
- Modify: `src/api/services/ai/providers/base.ts`
- Modify: `src/shared/types/ai.ts`

**Step 1: Write failing test (already added in Task 1)**

**Step 2: Run test to verify it fails**

Run: `npm run test:api -- src/api/services/ai/tools/__tests__/executor.test.ts`
Expected: FAIL

**Step 3: Implement ToolExecutor gating**

```ts
import { DANGEROUS_TOOLS, TOOL_PERMISSION_PREFIX } from '@shared/types/toolPermissions'

export interface ToolExecutionOptions {
  toolCallId?: string
  toolPermissions?: { allowAll: boolean }
  allowOnceToolCallIds?: string[]
}

async execute(toolName: string, input: any, options: ToolExecutionOptions = {}): Promise<string> {
  const isDangerous = DANGEROUS_TOOLS.includes(toolName as any)
  const allowAll = options.toolPermissions?.allowAll ?? false
  const allowOnce = options.toolCallId
    ? options.allowOnceToolCallIds?.includes(options.toolCallId)
    : false

  if (isDangerous && !allowAll && !allowOnce) {
    const payload = { kind: 'permission_request', toolName, toolCallId: options.toolCallId }
    return `${TOOL_PERMISSION_PREFIX}${JSON.stringify(payload)}`
  }

  // existing switch...
}
```

**Step 4: Pass toolCallId from providers**

```ts
const result = await toolExecutor.execute(toolUse.name, toolUse.input, {
  toolCallId: toolUse.id,
  toolPermissions: options?.toolPermissions,
  allowOnceToolCallIds: options?.allowOnceToolCallIds,
})
```

Update `AIProvider.sendMessage` signature to accept `options?: AIRequestOptions` and thread it through `AIManager` and both providers (stream + non-stream paths).

**Step 5: Run test to verify it passes**

Run: `npm run test:api -- src/api/services/ai/tools/__tests__/executor.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/api/services/ai/tools/executor.ts src/api/services/ai/providers/*.ts src/shared/types/ai.ts
git commit -m "feat: gate dangerous tools in executor"
```

---

### Task 3: Wire permissions through API route + client

**Files:**
- Modify: `src/api/routes/chat.ts`
- Modify: `src/api/services/ai/manager.ts`
- Modify: `src/renderer/src/services/apiClient.ts`
- Modify: `src/renderer/src/services/__tests__/apiClient.test.ts`

**Step 1: Write failing test**

```ts
await client.sendMessage('openai', [], config, { toolPermissions: { allowAll: true } })
expect(global.fetch).toHaveBeenCalledWith(
  'http://localhost:2323/api/chat',
  expect.objectContaining({
    body: expect.stringContaining('"toolPermissions"')
  })
)
```

**Step 2: Run test to verify it fails**

Run: `npm run test:renderer -- src/renderer/src/services/__tests__/apiClient.test.ts`
Expected: FAIL

**Step 3: Implement request plumbing**

- Extend `ChatRequest` with `toolPermissions?: ToolPermissionState` and `allowOnceToolCallIds?: string[]`.
- Update `AIManager.sendMessage` to accept `options?: AIRequestOptions` and pass into provider.
- Update apiClient `sendMessage`/`sendMessageStream` to accept optional `options` and include in body.

**Step 4: Run test to verify it passes**

Run: `npm run test:renderer -- src/renderer/src/services/__tests__/apiClient.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/api/routes/chat.ts src/api/services/ai/manager.ts src/renderer/src/services/apiClient.ts src/renderer/src/services/__tests__/apiClient.test.ts
git commit -m "feat: send tool permissions in chat requests"
```

---

### Task 4: Persist allowAll per workspace in settings store

**Files:**
- Modify: `src/renderer/src/stores/settingsStore.ts`
- Modify: `src/renderer/src/stores/__tests__/settingsStore.test.ts`

**Step 1: Write failing test**

```ts
useSettingsStore.setState({ toolPermissionsByWorkspace: {} })
useSettingsStore.getState().setToolAllowAll('/repo', true)
expect(useSettingsStore.getState().getToolPermissions('/repo').allowAll).toBe(true)
```

**Step 2: Run test to verify it fails**

Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/settingsStore.test.ts`
Expected: FAIL

**Step 3: Implement state + actions + persistence**

```ts
toolPermissionsByWorkspace: {},
getToolPermissions: (workspacePath) => state.toolPermissionsByWorkspace[key] ?? { allowAll: false },
setToolAllowAll: (workspacePath, allowAll) => set((state) => ({
  toolPermissionsByWorkspace: { ...state.toolPermissionsByWorkspace, [key]: { allowAll } },
})),
```

Include `toolPermissionsByWorkspace` in `partialize` and migration default.

**Step 4: Run test to verify it passes**

Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/settingsStore.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/src/stores/settingsStore.ts src/renderer/src/stores/__tests__/settingsStore.test.ts
git commit -m "feat: persist tool allowAll per workspace"
```

---

### Task 5: Approval action in chat store + inline UI prompt

**Files:**
- Modify: `src/renderer/src/stores/chatStore.ts`
- Modify: `src/renderer/src/stores/__tests__/chatStore.test.ts`
- Modify: `src/renderer/src/components/chat/ToolCallCard.tsx`
- Modify: `src/renderer/src/components/chat/__tests__/ToolCallCard.test.tsx`

**Step 1: Write failing tests**

```ts
// chatStore
await useChatStore.getState().approveToolCall('conv-1', 'tc-1', 'Bash', { allowAll: false })
expect(mockSendMessageStream).toHaveBeenCalledWith(
  'openai',
  expect.any(Array),
  mockConfig,
  expect.any(Function),
  undefined,
  expect.objectContaining({ allowOnceToolCallIds: ['tc-1'] })
)
```

```tsx
// ToolCallCard renders permission prompt
render(<ToolCallCard toolCall={toolCall} toolResult={{ toolCallId: 'tc-1', output: prefixPayload }} />)
expect(screen.getByText('允许')).toBeInTheDocument()
expect(screen.getByText('允许所有')).toBeInTheDocument()
expect(screen.getByText('拒绝')).toBeInTheDocument()
```

**Step 2: Run tests to verify they fail**

Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/chatStore.test.ts src/renderer/src/components/chat/__tests__/ToolCallCard.test.tsx`
Expected: FAIL

**Step 3: Implement chat approvals + UI prompt**

- Add `approveToolCall` action in chat store. It should:
  - build a short user message (`"已允许工具: ${toolName}"`) and call `sendMessage` with `allowOnceToolCallIds: [toolCallId]`.
  - if `allowAll` is true, update settings store for current workspace before sending.
- Update `sendMessage` to read `toolPermissions` from settings (workspace-scoped) and pass to apiClient.
- In `ToolCallCard`, detect `TOOL_PERMISSION_PREFIX` and parse payload; render inline buttons and call `approveToolCall`.

**Step 4: Run tests to verify they pass**

Run: `npm run test:renderer -- src/renderer/src/stores/__tests__/chatStore.test.ts src/renderer/src/components/chat/__tests__/ToolCallCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/src/stores/chatStore.ts src/renderer/src/stores/__tests__/chatStore.test.ts src/renderer/src/components/chat/ToolCallCard.tsx src/renderer/src/components/chat/__tests__/ToolCallCard.test.tsx
git commit -m "feat: add inline tool permission approvals"
```

---

### Task 6: Final verification

**Step 1: Run focused tests**

Run: `npm run test:api -- src/api/services/ai/tools/__tests__/executor.test.ts`
Expected: PASS

Run: `npm run test:renderer -- src/renderer/src/services/__tests__/apiClient.test.ts src/renderer/src/stores/__tests__/settingsStore.test.ts src/renderer/src/stores/__tests__/chatStore.test.ts src/renderer/src/components/chat/__tests__/ToolCallCard.test.tsx`
Expected: PASS

**Step 2: Commit any fixes (if needed)**

```bash
git add -A
git commit -m "test: stabilize permissions tests"
```

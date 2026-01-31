# Tools Part 2 (Permissions) Design

**Goal:** Add workspace-scoped tool permissions with inline chat prompts (no modal). Users can Allow once, Allow all (persisted), or Deny (re-prompt next time).

## Scope
- Gate dangerous tools: `Bash`, `Write`, `Edit`, `GitCommit`, `GitPush`, `GitCheckout`.
- Inline permission UI inside AI/tool message (no modal).
- Allow once for next use; Allow all persists per workspace; Deny prompts again next time.
- No hidden messages or new windows.

## UX Flow
1. Model requests a dangerous tool.
2. ToolExecutor blocks execution and returns a permission-request payload as the tool output.
3. Tool card renders inline buttons: **允许 / 允许所有 / 拒绝**.
4. **允许** sends a short approval message that includes an allow-once override for that tool name.
5. **允许所有** persists allowAll for the current workspace, then sends the same approval message.
6. **拒绝** does nothing; next attempt prompts again.

## Permission State
- **Workspace-scoped**: stored in settings as a map `{ [workspacePath]: { allowAll: boolean } }`.
- **Session**: `allowOnceTools: string[]` carried per chat request.
- **Deny** is not persisted.

## API + Data Flow
- Extend chat request with `toolPermissions` and optional `allowOnceTools`.
- Providers pass permission state to ToolExecutor.
- ToolExecutor checks:
  - if tool is dangerous and `allowAll` is false and `allowOnceTools` does not include the tool name, return a permission-request payload instead of executing.
  - if allowed via `allowOnceTools`, execute and consume one entry.
- Tool output encodes a special prefix + JSON payload so the UI can render buttons.

## Components
- Shared constants/types: `DANGEROUS_TOOLS`, permission state type, permission-request payload prefix.
- ToolExecutor: permission gating + payload encoding.
- Chat store: carry permissions into API calls; provide an action to approve a tool call by sending a short approval message and setting `allowOnceTools`.
- Settings store: persist `allowAll` per workspace.
- Tool UI: parse permission payload, render buttons, trigger approval actions.

## Error Handling
- Malformed permission payload -> render fallback text (“需要权限，但请求无效”).
- Tool execution errors after approval flow through existing error UI.

## Testing
- ToolExecutor: permission gating + allow-once consumption.
- Settings store: allowAll persistence by workspace.
- ToolCallCard: permission prompt rendering + button handlers.
- Chat store: approval action sends message with allowOnceTools.

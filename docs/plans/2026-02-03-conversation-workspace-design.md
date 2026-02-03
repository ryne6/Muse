# Conversation Workspace Design

Date: 2026-02-03

## Goal
为每个会话提供独立的 workspace。会话创建时自动生成默认目录 `~/.Muse/workspaces/<conversationId>`；用户手动选择目录后切换到新路径并舍弃默认目录（默认目录保留但不再使用）。移除“全局 workspace”概念与 UI。历史会话如果缺失 workspace，在打开时自动补齐默认目录。

## Non-Goals
- 不做 workspace 的集中管理 UI（列表、重命名、迁移等）。
- 不强制限制绝对路径访问（暂不加沙箱）。
- 文件树（Explorer）逻辑暂不扩展，仅保证不依赖全局 workspace。

## Decisions
- workspace 存储在 `conversations.workspace` 字段。
- 创建会话时立即创建默认目录。
- 手动选择目录时只更新该会话的 workspace，不迁移默认目录内容。
- 工具执行时使用会话 workspace 作为默认根目录（相对路径解析、cwd 默认值）。

## Data Flow
1. **创建会话**：
   - Renderer 调用 `workspace:ensureForConversation(conversationId)` 获取默认目录并创建。
   - 将 workspace 写入 `db:conversations:create`。
2. **加载会话**：
   - 如果会话 `workspace` 为空，调用 `workspace:ensureForConversation` 补齐并写回 `db:conversations:updateWorkspace`。
3. **发送消息**：
   - Renderer 从当前会话取 `workspace`，通过 API 请求传入 `workspacePath`。
   - API 路由将 `workspacePath` 传给 AI provider。
   - Provider 调用 `ToolExecutor.execute(..., { workspacePath })`。
4. **工具执行**：
   - Read/Write/Edit：相对路径解析到 `workspacePath`。
   - LS/Glob/Grep/Git：未传 path 则默认 `workspacePath`；相对路径同样解析。
   - Bash：未传 cwd 则默认 `workspacePath`；相对 cwd 解析到 `workspacePath`。

## API / IPC Changes
- 新增：`workspace:ensureForConversation(conversationId)` → `{ path }`。
- 移除/弃用：`workspace:get`, `workspace:set`, `workspace:select`（全局 workspace）。

## UI Changes
- 移除全局 workspace 选择器。
- `WorkspaceDropdown` 仅操作当前会话 workspace。

## Testing Plan
- `ConversationStore.createConversation`：创建时写入默认 workspace 且调用 ensure IPC。
- `ConversationStore.loadConversations`：缺失 workspace 时自动补齐并写回 DB。
- `APIClient`：请求体包含 `workspacePath`。
- `ToolExecutor`：相对路径解析、默认 cwd/path 行为。
- 更新/移除原有全局 workspace 相关测试。

## Migration
- 旧会话 `workspace` 为空：在首次打开时自动补齐默认目录。

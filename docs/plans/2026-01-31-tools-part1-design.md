# Tools Part 1 (Glob/Grep/Git/Web) Design

**Goal:** Add TitleCase tools for Glob/Grep/Git/Web into the existing ToolExecutor → IPC → Service pipeline, matching existing tool execution loops.

## Scope
- Tools: `Glob`, `Grep`, `GitStatus`, `GitDiff`, `GitLog`, `GitCommit`, `GitPush`, `GitCheckout`, `WebFetch`, `WebSearch`
- No permission system yet (Part 2)
- No UI changes required beyond tool card icon mapping later if desired

## Tool Schemas
- `Glob`: `{ pattern: string, path?: string }`
- `Grep`: `{ pattern: string, path?: string, glob?: string, ignoreCase?: boolean, maxResults?: number }`
- `GitStatus`: `{ path?: string }`
- `GitDiff`: `{ path?: string, staged?: boolean, file?: string }`
- `GitLog`: `{ path?: string, maxCount?: number }`
- `GitCommit`: `{ path?: string, message: string, files?: string[] }`
- `GitPush`: `{ path?: string, remote?: string, branch?: string }`
- `GitCheckout`: `{ path?: string, branch: string, create?: boolean }`
- `WebFetch`: `{ url: string, maxLength?: number }`
- `WebSearch`: `{ query: string, limit?: number, recencyDays?: number, domains?: string[] }`

## Execution Flow
1. Provider sends tool call (loop already exists in Claude/OpenAI providers).
2. ToolExecutor matches tool name and calls IPC.
3. IPC routes to FileSystemService / GitService / WebService.
4. ToolExecutor formats result as plain text (stable for model consumption).

## Service Responsibilities
- **FileSystemService**: `glob` via `fast-glob` (limit 500), `grep` via glob + regex line scan (limit default 100).
- **GitService**: Wrap `git` CLI via `exec` (status/diff/log/commit/push/checkout) using workspace or input path as cwd.
- **WebService**: `fetch` via axios (HTTPS only). `search` via DuckDuckGo HTML page parse (title/url/snippet), return top N.

## IPC Additions
- `fs:glob`, `fs:grep`
- `git:status`, `git:diff`, `git:log`, `git:commit`, `git:push`, `git:checkout`
- `web:fetch`, `web:search`

## Error Handling
- Services throw errors; ToolExecutor returns `Error: <message>`.
- Outputs are plain text; Git outputs raw stdout, Grep outputs `path:line content`, WebSearch outputs numbered list.

## Testing
- Update `definitions` + `executor` tests for new tools.
- Add unit tests for `glob/grep` in FileSystemService.
- Add unit tests for GitService (mock exec).
- Add unit tests for WebService (https enforcement + htmlToText).
- Update IPC bridge tests for new channels.

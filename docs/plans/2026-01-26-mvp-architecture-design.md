# MVP Architecture and Next Steps (macOS DMG)

Date: 2026-01-26
Owner: Codex
Target: macOS unsigned DMG

## Context and goal
This plan defines the minimum architecture and work required to ship a stable macOS DMG for Muse. The focus is reliability, clear boundaries, and matching documented behavior with implemented behavior. No major refactors are required for the first ship.

## Current gaps vs claims
- Tool naming mismatch: UI references `edit_file`, `search_files`, `list_directory` while the tool system only supports `read_file`, `write_file`, `list_files`, and `execute_command`.
- System status indicator exists but is not mounted in the UI.
- File explorer is tree-only; no preview or syntax highlighting exists.
- Keyboard shortcuts are documented but not implemented.
- Dark mode is described but no toggle or persistence exists.
- Dev scripts depend on Bun while the packaged app uses Node Hono server.

## Target architecture
The MVP keeps a three-layer architecture with clear trust boundaries. The Renderer is a pure UI client (React + Zustand) and never accesses the filesystem or secrets directly. It communicates with the Main process via IPC (through the preload bridge) and with the local API server for AI requests. The Main process owns OS concerns: window lifecycle, workspace selection, secure IPC handlers, and database access. The API server (Hono) runs in-process under Node for the packaged app and exposes `/api` endpoints for chat, provider validation, and model metadata. The IPC bridge exposes a narrow set of filesystem and command endpoints and is only reachable from localhost. Tool execution stays server-side: AI responses emit tool calls, the tool executor dispatches them to the IPC bridge, and results stream back to the renderer for visualization. SQLite (Drizzle) remains the single source of truth, with encrypted API keys and first-run migration.

## MVP scope and priorities
The MVP must deliver: reliable chat, provider management, local persistence, minimal tool calls, and a macOS DMG. Priority is closing gaps between docs and actual behavior, stabilizing startup and health reporting, and ensuring packaging works consistently.

P0 (ship blockers)
- Align tool names and UI mapping.
- Mount system health indicator in the layout.
- Decide: add file preview or remove preview claims from docs.
- Implement or remove documented keyboard shortcuts.
- Add electron-builder config for DMG and app metadata.
- Make API base URL environment-aware (dev vs packaged).
- Improve startup/port failure handling and user-facing errors.

P1 (nice-to-have for first DMG)
- Minimal read-only file preview (text/markdown) in file explorer.
- Basic export of a conversation to markdown.

P2 (post-ship)
- Tool expansion (search/edit), improved file operations.
- Theme toggle and persisted preferences.
- Architecture cleanup (single IPC pipeline, remove dual servers).

## Data flow summary
1. User sends a message in the renderer.
2. Renderer calls the local API server `/api/chat/stream`.
3. API server routes to the provider adapter and streams chunks back.
4. Tool calls in the stream are executed by the tool executor via the IPC bridge.
5. Results are streamed to the renderer and stored in SQLite via IPC-backed stores.

## Error handling and observability
- Startup: detect API/IPC bridge failures and surface in UI.
- Network: map common provider errors to user-friendly messages.
- Tooling: return structured tool errors and render in ToolCallCard.
- Logging: keep lightweight local logs for API and IPC bridge failures.

## Testing and verification
- Manual smoke test: create provider, send message, stream response, verify tool call display.
- DB test: create conversation, restart app, verify persistence.
- Packaging test: build and install DMG, verify startup without dev server.
- Health check: API server offline should show status and guidance.

## Release checklist (unsigned DMG)
- `npm run build`
- `npm run package:mac`
- Verify DMG installs, launches, and stores data locally.
- Update README/USER_GUIDE to match shipped features.

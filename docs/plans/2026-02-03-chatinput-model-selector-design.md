# ChatInput Model Selector Design

Date: 2026-02-03

## Summary
We need to make models selectable in ChatInput after adding providers/models in Settings. The root cause is that ChatInput renders a static “选择模型” button with no behavior, while a fully functional `ModelSelector` component exists but is not mounted anywhere. The fix is to mount `ModelSelector` directly in ChatInput’s toolbar, replacing the static button.

## Goals
- Provide an in-place model selector in ChatInput.
- Reuse existing state and logic in `ModelSelector` and `settingsStore`.
- Keep changes minimal and avoid duplication.

## Non-Goals
- Redesign settings flow or add new provider/model management UX.
- Modify data storage or DB schema.

## Approach
- Replace the static “选择模型” button in `src/renderer/src/components/chat/ChatInput.tsx` with `<ModelSelector />`.
- Rely on `ModelSelector`’s existing `loadData()` and `lastUpdated` refresh behavior to pick up new models after Settings changes.
- Preserve current message sending logic that reads `getCurrentProvider()` and `getCurrentModel()`.

## Data Flow
- Settings dialogs create providers/models and call `triggerRefresh()`.
- `ModelSelector` listens to `lastUpdated`, reloads providers/models, and calls `setCurrentModel()` when a selection is made.
- `ChatInput` reads the selected model/provider from `settingsStore` when sending messages.

## UI/UX Notes
- The selector will appear in the same position as the previous button.
- Display will include the current provider and a shortened model name, matching `ModelSelector`’s behavior.

## Testing
- Run `npm run test:renderer` to ensure no regressions in ChatInput or settings-related tests.
- Adjust ChatInput tests only if the new component changes render output assumptions.

## Rollout
- No migration required. This is a UI-only change using existing state.

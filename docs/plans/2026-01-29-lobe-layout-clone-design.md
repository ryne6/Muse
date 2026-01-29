# Lobe-Style Layout Clone (1440x900) Design

Date: 2026-01-29
Owner: Codex + User
Status: Draft (validated sections 1-3)

## Goals
- Achieve a 1:1 visual feel against the provided screenshot at 1440x900.
- Match layout, typography (system fonts), section background colors, and chat UI style.
- Keep existing functionality; remove only elements not present in the screenshot (right-side header icons).

## Non-Goals
- No new features beyond layout and styling.
- No account system.
- No behavior changes to existing stores, APIs, or data flow.

## Baseline
- Reference size: 1440x900.
- Platform target: cross-platform consistent look using system font stack.

## Layout Overview
- Two-column layout.
  - Left: Sidebar (approx. 260-280px width; tuned to match screenshot proportions).
  - Right: Main content (flex, fills remaining width).
- Vertical structure (right side): Search Header, Chat Area, Input Bar.
- Background layers:
  - App background: warm light gray.
  - Sidebar background: slightly darker than app background.
  - Main background: lighter than sidebar to create soft separation.

## Visual System
- Use CSS variables for all tokens:
  - --bg-app, --bg-sidebar, --bg-main
  - --text-primary, --text-muted
  - --border-subtle, --accent
  - --radius-sm/md/lg
  - --font-ui
- System font stack by default; support user selection of any system-installed font.
- Low-contrast dividers, minimal shadow. Prefer borders or background separation.
- Spacing uses an 8px baseline; align heights to 36-40px for input/buttons.

## LobeChat Tokens (from `demo.html`)
These values are taken from the provided HTML/CSS. Use them as the baseline for the 1:1 clone at 1440x900.

### Root CSS Variables (Observed)
- --bg-sidebar: #F8F9FA
- --bg-main: #FFFFFF
- --text-primary: #222222
- --text-secondary: #666666
- --border-color: #E5E5E5
- --active-item-bg: #E6F7FF (declared, but active item uses #E8E8E8 in demo)
- --code-bg: #F5F5F5
- --accent-color: #000000

### Recommended App Tokens (Mapping)
- --bg-app: #FFFFFF (matches demo body background)
- --bg-sidebar: #F8F9FA
- --bg-main: #FFFFFF
- --text-primary: #222222
- --text-secondary: #666666
- --text-muted: #999999
- --border-subtle: #E5E5E5
- --active-item-bg: #E8E8E8 (use the actual active state from demo)
- --code-bg: #F5F5F5
- --accent: #000000 (use sparingly)

### Typography & Sizes (Observed)
- --font-ui: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
- --font-size-xs: 12px (section titles, sender meta)
- --font-size-sm: 14px (sidebar items, header labels)
- --font-size-md: 15px (message body, input)
- --font-size-lg: 18px (brand title)
- --line-height-normal: 1.6 (message text)

### Radius, Shadow, Spacing (Observed)
- --radius-sm: 6px (search, small buttons)
- --radius-md: 8px (new chat button, code blocks)
- --radius-lg: 12px (user bubble, input box)
- --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.05) (new chat button)
- --shadow-2: 0 4px 12px rgba(0, 0, 0, 0.05) (input box)
- --space-2: 8px
- --space-3: 12px
- --space-4: 16px
- --space-6: 24px

### Layout Constants (Observed)
- --sidebar-width: 280px
- --chat-header-height: 60px
- --content-max-width: 800px
- --chat-padding-x: 24px
- --chat-padding-y: 24px
- --chat-gap-y: 24px
- --avatar-size: 32px
- --message-gap-x: 16px
- --user-bubble-padding: 10px 16px
- --user-bubble-max-width: 80%

### Component Colors (Observed)
- --user-bubble-bg: #F5F5F5
- --sender-name-color: #999999
- --code-header-bg: #F9F9F9
- --code-header-border: #EEEEEE
- --scrollbar-thumb: #DDDDDD
- --input-placeholder: #AAAAAA

### Usage Notes
- Use borders for separation and keep shadows minimal (only on primary inputs/buttons).
- Active item uses a neutral gray (#E8E8E8), not the light blue defined in the variable.
- Keep message body at 15px with 1.6 line-height to match the relaxed feel.

## Component Targets
### Sidebar
- Header: app name + new topic button.
- Search: visible input, consistent with header search styling.
- Conversation list: grouped by date (as in screenshot), styled only.
- Footer: settings entry (no account section).

### Main Header (Search)
- Keep search input centered/left aligned per screenshot.
- Remove right-side icon cluster.

### Chat Area
- Message list with comfortable vertical spacing.
- Assistant message: flat text (no bubble) but includes header row: avatar + name + timestamp.
- User message: bubble only for user messages; bubble size, padding, radius to match screenshot.
- Avatar: use existing avatar logic (no new avatar source required).
- Timestamp: right-aligned, muted, small.

### Input Bar
- 1:1 styling with screenshot.
- Keep existing send logic.
- Move model/temperature controls to Settings (not shown near input bar).

## Data Flow
- Keep existing stores (conversation, settings, search) unchanged.
- Only adjust UI components to consume existing data and render new layout.
- If a message lacks a timestamp, hide the timestamp element.

## Error Handling / Fallbacks
- Font selection: fallback to system stack if chosen font fails.
- Avatar missing: render default placeholder from existing logic.
- Small window: optional future enhancement to auto-collapse sidebar; not required for 1:1.

## Testing
- Smoke test UI at 1440x900.
- Optional snapshot tests for:
  - Sidebar rendering with grouped conversations.
  - MessageItem rendering: assistant header + user bubble + timestamp.

## Implementation Notes
- Primary edits likely in:
  - src/renderer/src/index.css
  - src/renderer/src/components/layout/*
  - src/renderer/src/components/chat/*
  - src/renderer/src/components/ui/*
- Keep token definitions centralized; avoid hard-coded colors in components.

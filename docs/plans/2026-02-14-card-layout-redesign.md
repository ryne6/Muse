# Card-Style Layout Redesign

**Status:** Refined
**Created:** 2026-02-14
**Source:** Figma design comparison — card layout + frosted glass + rounded corners + spacing + shadows
**Scope:** Visual only, no color system or functionality changes

---

## Context

Current UI uses a flat, edge-to-edge layout where sidebar and main area are seamlessly joined. Figma design shows a card-based layout with two visually separated panels floating on a gray background, with frosted glass sidebar and generous rounded corners.

**Key constraints:**
- Keep DraggableSideNav (drag resize + collapse)
- Keep current neutral gray color system
- Keep dark mode working
- 4 files to modify

---

## Source Code Investigation Findings

### DraggableSideNav `styles.content` support

Confirmed via `node_modules/@lobehub/ui/es/DraggableSideNav/type.d.mts:107-114`:

```typescript
styles?: {
  body?: CSSProperties
  container?: CSSProperties
  content?: CSSProperties   // <-- this is what we use
  footer?: CSSProperties
  handle?: CSSProperties
  header?: CSSProperties
}
```

In the runtime code (`DraggableSideNav.mjs:409-411`), `styles.content` is spread directly onto the content FlexBasic div:

```jsx
<FlexBasic
  className={contentClassName}
  style={{ ...cssVariables, ...customStyles?.content }}
>
```

So `borderRadius`, `backdropFilter`, `background`, `border`, `boxShadow` all work as inline CSSProperties. No issues.

### overflow:hidden on sidebar content

The library's `contentContainer` style already has `overflow: hidden` (`style.mjs:49`). The body section has `overflow: hidden auto` for its own scrolling. Adding `overflow: hidden` in `styles.content` is redundant but harmless — body scrolling is unaffected because the body div manages scroll independently.

`borderRadius: 20` on the content container requires `overflow: hidden` to clip children to rounded corners. Since the library already sets this, we're safe. We include it explicitly for clarity.

### showBorder prop

The sidebar currently uses default `showBorder={true}`, which adds `border-inline-end: 1px solid`. For the card layout, we must set `showBorder={false}` to remove the hard right-edge border — the card will have its own `border` via `styles.content`.

### macOS title bar (h-8 drag region)

Current: `bg-[hsl(var(--bg-sidebar))]` — matches sidebar color.

With card layout, the outer container becomes the "gap" background color. The title bar sits above the `px-3 pb-3` padded content area and spans full width. It should match the outer background (`--bg-layout`), not the sidebar. No padding adjustment needed on the title bar itself.

We remove its explicit background so it inherits from the parent `bg-[hsl(var(--bg-layout))]`.

### Dark mode approach: Option C (CSS variables)

Confirmed as cleanest. The existing `:root` and `.dark` blocks in `index.css` already follow this pattern. We add glass-specific variables there, then reference them from AppLayout inline styles via `var(--glass-bg)` etc.

This avoids:
- A) No need for `useTheme` hook or runtime dark mode detection
- B) Can't use Tailwind `dark:` variants on inline styles (DraggableSideNav `styles.content` requires CSSProperties)

---

## Tasks

### Step 1: index.css — Add glass effect CSS variables and layout background

**File:** `src/renderer/src/index.css`

Add to `:root` (after `--accent-hover` line):

```css
/* Card layout */
--bg-layout: 0 0% 95%;
--glass-bg: rgba(255, 255, 255, 0.7);
--glass-border: rgba(255, 255, 255, 0.4);
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
--card-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
```

Add to `.dark` (after `--accent-hover` line):

```css
/* Card layout (dark) */
--bg-layout: 240 10% 6%;
--bg-sidebar: 240 6% 10%;
--glass-bg: rgba(30, 30, 30, 0.7);
--glass-border: rgba(255, 255, 255, 0.08);
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
--card-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
```

**Verify:** No visual change yet — variables are defined but not consumed.

---

### Step 2: AppLayout — Card layout with padding, gap, glass sidebar

**File:** `src/renderer/src/components/layout/AppLayout.tsx`

**Change 1: Outer container background** — becomes the "canvas" behind cards.

```diff
- <div className="flex flex-col h-screen overflow-hidden bg-[hsl(var(--bg-sidebar))]">
+ <div className="flex flex-col h-screen overflow-hidden bg-[hsl(var(--bg-layout))]">
```

**Change 2: Title bar background** — remove explicit bg, inherits canvas color.

```diff
- <div
-   className="h-8 flex-shrink-0 bg-[hsl(var(--bg-sidebar))]"
-   style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
- />
+ <div
+   className="h-8 flex-shrink-0"
+   style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
+ />
```

**Change 3: Main content area** — add padding and gap.

```diff
- <div className="flex flex-1 overflow-hidden">
+ <div className="flex flex-1 overflow-hidden px-3 pb-3 gap-3">
```

Using `px-3 pb-3` (12px) — the title bar already provides top spacing. `gap-3` creates visual separation between sidebar and main card.

**Change 4: DraggableSideNav** — transparent bg + glass content + no border.

```diff
  <DraggableSideNav
    placement="left"
    defaultExpand={defaultExpandRef.current}
    defaultWidth={sidebarWidth}
    minWidth={64}
    maxWidth={400}
    expandable
    resizable
+   showBorder={false}
    onExpandChange={handleExpandChange}
    onWidthChange={handleWidthChange}
-   backgroundColor="hsl(var(--bg-sidebar))"
+   backgroundColor="transparent"
+   styles={{
+     content: {
+       borderRadius: 20,
+       backdropFilter: 'blur(12px)',
+       WebkitBackdropFilter: 'blur(12px)',
+       background: 'var(--glass-bg)',
+       border: '1px solid var(--glass-border)',
+       boxShadow: 'var(--glass-shadow)',
+       overflow: 'hidden',
+     },
+   }}
    header={renderHeader}
    body={renderBody}
    footer={renderFooter}
  />
```

Notes:
- `backgroundColor="transparent"` — makes the Resizable wrapper transparent so gap color shows through
- `showBorder={false}` — removes the library's default `border-inline-end`
- `borderRadius: 20` — slightly less than 24 for sidebar (narrower panel, smaller radius looks better)
- `blur(12px)` — stronger blur for more visible frosted glass effect

**Change 5: Wrap ChatView in card container.**

```diff
- <ChatView />
+ <div className="flex-1 flex flex-col min-w-0 rounded-[20px] bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] shadow-[var(--card-shadow)] overflow-hidden">
+   <ChatView />
+ </div>
```

Notes:
- `bg-[hsl(var(--bg-main))]` — uses existing CSS variable, works in both light/dark
- `rounded-[20px]` — matches sidebar radius
- `shadow-[var(--card-shadow)]` — uses CSS variable for dark mode adaptation
- `min-w-0` — prevents flex child from overflowing

**Full return block after all changes:**

```tsx
return (
  <div className="flex flex-col h-screen overflow-hidden bg-[hsl(var(--bg-layout))]">
    {/* Draggable title bar for macOS */}
    <div
      className="h-8 flex-shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    />
    {/* Main content */}
    <div className="flex flex-1 overflow-hidden px-3 pb-3 gap-3">
      <DraggableSideNav
        placement="left"
        defaultExpand={defaultExpandRef.current}
        defaultWidth={sidebarWidth}
        minWidth={64}
        maxWidth={400}
        expandable
        resizable
        showBorder={false}
        onExpandChange={handleExpandChange}
        onWidthChange={handleWidthChange}
        backgroundColor="transparent"
        styles={{
          content: {
            borderRadius: 20,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--glass-shadow)',
            overflow: 'hidden',
          },
        }}
        header={renderHeader}
        body={renderBody}
        footer={renderFooter}
      />
      <div className="flex-1 flex flex-col min-w-0 rounded-[20px] bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] shadow-[var(--card-shadow)] overflow-hidden">
        <ChatView />
      </div>
    </div>
    <LoadingOverlay />
  </div>
)
```

**Verify:**
- Two visually separated rounded panels with gap between them
- Sidebar has frosted glass effect
- Drag resize and collapse still work
- macOS title bar drag area still functional
- No right-edge border on sidebar

---

### Step 3: ChatHeader — Remove sidebar background

**File:** `src/renderer/src/components/chat/ChatHeader.tsx`

```diff
- <div className="h-14 flex items-center justify-center px-6 bg-[hsl(var(--bg-sidebar))]">
+ <div className="h-14 flex items-center justify-center px-6">
```

The header inherits `bg-[hsl(var(--bg-main))]` from the card wrapper.

**Verify:** Header blends seamlessly into the main card background.

---

### Step 4: ChatInput — Larger border-radius, remove toolbar border

**File:** `src/renderer/src/components/chat/ChatInput.tsx`

**Change 1: Input card border-radius (line 278)**

```diff
- <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-main))] shadow-[0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden">
+ <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg-main))] shadow-[0_4px_12px_rgba(0,0,0,0.05)] overflow-hidden">
```

Using `rounded-2xl` (16px) — the input card is nested inside the main card (20px), so smaller radius provides visual hierarchy. Shadow stays the same (already appropriate for nested card).

**Change 2: Toolbar border removal (line 301)**

```diff
- <div className="flex items-center justify-between px-3 py-2 border-t border-[hsl(var(--border))]">
+ <div className="flex items-center justify-between px-3 py-2">
```

Removes the separator line between textarea and toolbar per Figma design.

**Verify:**
- Input area has larger rounded corners (16px vs 12px)
- Toolbar items flow without separator line

---

### Step 5: Visual QA and edge cases

Manual verification checklist:
- [ ] Sidebar drag resize works, rounded corners maintained at all widths
- [ ] Sidebar collapse/expand animation smooth, no visual glitches
- [ ] Sidebar collapsed state (64px) — glass card still looks correct (20px radius < 32px half-width, no pill shape)
- [ ] Frosted glass effect visible (content behind sidebar shows through)
- [ ] Main area scrolling works within rounded container
- [ ] Input area fullscreen editor still works (FullscreenEditor is a portal, unaffected)
- [ ] Attachment preview area renders correctly inside card
- [ ] Window resize doesn't break layout
- [ ] macOS title bar drag area still functional (inherits canvas background)
- [ ] Dark mode: both panels correct, glass tint appropriate
- [ ] Dark mode: canvas background darker than cards
- [ ] Sidebar toggle handle still visible and clickable (positioned via absolute, outside card)

---

## File Change Summary

| File | Changes | Lines affected |
|------|---------|---------------|
| `index.css` | Add `--bg-layout`, `--glass-bg`, `--glass-border`, `--glass-shadow`, `--card-shadow` to `:root` and `.dark` | ~12 new lines |
| `AppLayout.tsx` | Canvas bg, title bar bg, padding/gap, DraggableSideNav props (transparent bg, showBorder=false, styles.content glass), ChatView card wrapper | ~15 lines changed |
| `ChatHeader.tsx` | Remove `bg-[hsl(var(--bg-sidebar))]` | 1 line |
| `ChatInput.tsx` | `rounded-xl` -> `rounded-2xl`, remove toolbar `border-t` | 2 lines |

## Risk Assessment

**Low risk:**
- All changes are CSS/visual only, no logic changes
- DraggableSideNav `styles.content` is a documented prop with CSSProperties type
- `showBorder={false}` is a simple boolean prop
- CSS variables follow existing project pattern

**Watch for:**
- Sidebar toggle handle positioning — absolutely positioned relative to Resizable container, should still work but verify visually
- Collapsed sidebar (64px width) with 20px border-radius — radius is less than half the width (32px), so no pill shape. Safe.
- `backdropFilter` performance — Electron Chromium supports this well, but if there's jank on resize, reduce blur from 12px to 8px

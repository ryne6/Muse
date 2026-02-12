# BDD Test Scenarios: Chat List Virtualization

> Based on implementation plan: `docs/plan-virtualized-chat.md`
> Target components: MessageList, MessageItem, AutoScroll, BackBottom, MarkdownRenderer
> Dependencies: virtua (VList), fast-deep-equal

---

## Module 1: Virtualized Rendering

### Feature: Virtual list renders only visible messages

```gherkin
Feature: Virtualized message rendering with VList

  Background:
    Given the user has an active conversation
    And the MessageList uses VList from virtua

  # P0
  Scenario: Long conversation maintains constant DOM node count
    Given a conversation with 200 messages is loaded
    When the MessageList renders
    Then the number of rendered message DOM nodes should be less than 30
    And the DOM node count should remain roughly constant regardless of total message count

  # P0
  Scenario: Fast scrolling does not produce blank/white areas
    Given a conversation with 200 messages is loaded
    And the VList bufferSize is set to window.innerHeight
    When the user scrolls rapidly from top to bottom
    Then no blank white areas should be visible during scrolling
    And messages should render continuously without gaps

  # P0
  Scenario: User messages render correctly in virtual list
    Given a conversation contains user messages
    When a user message scrolls into the visible area
    Then it should display with right-aligned bubble layout
    And the message content should be rendered as plain text with whitespace preserved

  # P0
  Scenario: Assistant messages render correctly in virtual list
    Given a conversation contains assistant messages
    When an assistant message scrolls into the visible area
    Then it should display with left-aligned layout with avatar
    And the message content should be rendered through MarkdownRenderer
    And the "Muse" label and timestamp should be visible in the header

  # P0
  Scenario: Messages with thinking blocks render correctly
    Given a conversation contains an assistant message with thinking content
    When that message scrolls into the visible area
    Then the ThinkingBlock component should render above the message content
    And the thinking block should show the thinking process text

  # P0
  Scenario: Messages with tool calls render correctly
    Given a conversation contains an assistant message with tool calls and results
    When that message scrolls into the visible area
    Then the ToolCallsList component should render with all tool calls
    And each tool call should display its name and result

  # P1
  Scenario: Messages with image attachments render correctly
    Given a conversation contains a user message with image attachments
    When that message scrolls into the visible area
    Then all attached images should render via MessageImage components
    And images should maintain their aspect ratio

  # P1
  Scenario: Token stats display correctly for assistant messages
    Given a conversation contains an assistant message with token usage data
    When that message scrolls into the visible area
    Then MessageStats should display input tokens, output tokens, and duration
```

---

## Module 2: Auto-Scroll

### Feature: Automatic scroll following during streaming

```gherkin
Feature: Auto-scroll follows streaming content

  Background:
    Given the user has an active conversation
    And the MessageList uses VList with AutoScroll component
    And the AutoScroll component is placed inside the last VList item

  # P0
  Scenario: Auto-scroll follows during streaming generation
    Given the user is at the bottom of the message list (atBottom = true)
    And the AI is generating a streaming response (isLoading = true)
    When new content chunks arrive and the message content length increases
    Then the list should automatically scroll to keep the latest content visible
    And scrollToBottom should be called with smooth = false (instant scroll)

  # P0
  Scenario: Auto-scroll stops when user scrolls up
    Given the AI is generating a streaming response
    And auto-scroll is actively following
    When the user manually scrolls upward
    Then atBottom should become false
    And auto-scroll should stop following new content
    And the user's scroll position should be preserved

  # P0
  Scenario: Auto-scroll resumes when user scrolls back to bottom
    Given the AI is generating a streaming response
    And the user had previously scrolled up (atBottom = false)
    When the user scrolls back down within 100px of the bottom
    Then atBottom should become true
    And auto-scroll should resume following new content

  # P1
  Scenario: Auto-scroll does not trigger when not generating
    Given the user is at the bottom of the message list
    And the AI is NOT generating (isLoading = false)
    When the message list content does not change
    Then scrollToBottom should NOT be called
    And no unnecessary scroll events should fire

  # P1
  Scenario: Auto-scroll does not trigger while user is actively scrolling
    Given the AI is generating a streaming response
    And the user is at the bottom (atBottom = true)
    And the user is actively scrolling (isScrolling = true)
    When new content chunks arrive
    Then auto-scroll should NOT trigger (shouldAutoScroll = atBottom && isLoading && !isScrolling)
    And the scroll position should remain where the user placed it

  # P1
  Scenario: Auto-scroll handles new message arrival
    Given the user is at the bottom of the message list
    And the AI is generating a response
    When a new assistant message placeholder is added (messages.length increases)
    Then auto-scroll should scroll to show the new message

  # P2
  Scenario: Auto-scroll uses instant scroll, not smooth
    Given auto-scroll is active during streaming
    When scrollToBottom is called by AutoScroll
    Then the scroll behavior should be instant (not smooth)
    And there should be no visible scroll animation lag
```

---

## Module 3: Back-to-Bottom Button

### Feature: Floating button to return to bottom of chat

```gherkin
Feature: Back-to-bottom floating button

  Background:
    Given the user has an active conversation with messages
    And the BackBottom component is rendered outside VList with absolute positioning

  # P0
  Scenario: Button appears when user scrolls up
    Given the user is viewing the message list
    When the user scrolls up so that atBottom becomes false
    Then the back-to-bottom button should become visible
    And it should appear at the bottom-right corner of the message container

  # P0
  Scenario: Button is hidden when at bottom
    Given the user is at the bottom of the message list (atBottom = true)
    Then the back-to-bottom button should NOT be visible

  # P0
  Scenario: Clicking button smoothly scrolls to bottom
    Given the user has scrolled up and the back-to-bottom button is visible
    When the user clicks the back-to-bottom button
    Then scrollToBottom should be called with smooth = true
    And the list should smoothly animate to the bottom
    And the button should disappear after reaching the bottom

  # P1
  Scenario: Button shows with transition animation
    Given the user is at the bottom (button hidden)
    When the user scrolls up past the 100px threshold
    Then the button should appear with a fade/slide transition animation
    When the user scrolls back to the bottom
    Then the button should disappear with a fade/slide transition animation

  # P1
  Scenario: Button does not obscure message content
    Given the back-to-bottom button is visible
    Then it should be positioned so it does not overlap with message text
    And it should have appropriate z-index to float above the scroll container
```

---

## Module 4: Streaming Rendering Performance

### Feature: Optimized rendering during streaming

```gherkin
Feature: Streaming rendering performance optimization

  Background:
    Given the user has a conversation with multiple messages
    And MessageItem components use React.memo with fast-deep-equal
    And MarkdownRenderer uses React.memo with content comparison

  # P0
  Scenario: Only the streaming message re-renders during generation
    Given a conversation has 10 existing messages
    And the AI is generating the 11th message via streaming
    When new content chunks arrive and flushChunks updates the store
    Then only the MessageItem for the 11th message should re-render
    And the other 10 MessageItem components should NOT re-render
    And React DevTools Profiler should confirm zero renders for history messages

  # P0
  Scenario: History messages do not re-render (memo is effective)
    Given a conversation has 20 messages
    And all messages are fully loaded (no streaming)
    When the store updates the last message's content via updateMessage
    Then messages 1-19 should retain their previous React element references
    And memo comparison should return true for all history messages

  # P0
  Scenario: MessageItem ID-driven selector isolates updates
    Given MessageItem receives only an id prop (not the full message object)
    And it uses a Zustand selector to get its message data
    When another message in the conversation is updated
    Then this MessageItem's selector should return the same reference
    And the component should NOT re-render

  # P1
  Scenario: Completed markdown blocks are not re-parsed during streaming
    Given the AI is streaming a response with markdown content
    And the response already contains 3 completed paragraphs
    When a new paragraph is being streamed (4th paragraph)
    Then the MarkdownRenderer should not re-parse the first 3 paragraphs
    And only the new/changing content should trigger parsing

  # P1
  Scenario: MarkdownRenderer does not re-render when content is unchanged
    Given a MessageItem contains a MarkdownRenderer with content "Hello world"
    When the parent component re-renders but the content prop remains "Hello world"
    Then MarkdownRenderer should NOT re-render (memo comparison: prev.content === next.content)

  # P1
  Scenario: Sub-components (ThinkingBlock, ToolCallsList, MessageStats) are memoized
    Given an assistant message has thinking, toolCalls, and token stats
    When the message content updates during streaming
    But thinking, toolCalls, and stats remain unchanged
    Then ThinkingBlock should NOT re-render
    And ToolCallsList should NOT re-render
    And MessageStats should NOT re-render

  # P1
  Scenario: flushChunks preserves non-target message references
    Given a conversation has messages [A, B, C] where C is the streaming target
    When flushChunks runs via updateMessage(convId, C.id, updater)
    Then the reference for message A should be identical (===) before and after
    And the reference for message B should be identical (===) before and after
    And only message C should have a new object reference

  # P2
  Scenario: Long code blocks do not cause frame drops during streaming
    Given the AI is streaming a response containing a large code block (500+ lines)
    When content chunks arrive at high frequency
    Then the frame rate should remain above 30fps
    And the UI should remain responsive to user interactions
```

---

## Module 5: Conversation Switching

### Feature: Correct behavior when switching conversations

```gherkin
Feature: Conversation switching with virtual list

  Background:
    Given the user has multiple conversations loaded
    And the MessageList uses VList

  # P0
  Scenario: Switching conversation scrolls to bottom
    Given the user is viewing conversation A at some scroll position
    When the user switches to conversation B (which has messages)
    Then the VList should scroll to the last message of conversation B
    And the scroll should happen immediately (not smooth)

  # P0
  Scenario: Virtual list resets correctly on conversation switch
    Given the user is viewing conversation A with 100 messages at scroll position mid-list
    When the user switches to conversation B with 50 messages
    Then the VList should render conversation B's messages
    And the messageIds data source should reflect conversation B's message IDs
    And no messages from conversation A should be visible

  # P0
  Scenario: New conversation shows empty state
    Given the user creates a new conversation
    When the MessageList renders for the new conversation
    Then it should display the empty state: "Start a conversation"
    And the VList should NOT render (empty state is shown instead)

  # P1
  Scenario: Switching to a conversation that is still loading shows loading state
    Given conversation B's messages have not been loaded yet
    When the user switches to conversation B
    Then the loading indicator ("加载中...") should be displayed
    And once messages are loaded, the VList should render and scroll to bottom

  # P1
  Scenario: Scroll state (atBottom) resets on conversation switch
    Given the user had scrolled up in conversation A (atBottom = false)
    When the user switches to conversation B
    Then atBottom should be reset to true
    And the BackBottom button should NOT be visible

  # P2
  Scenario: Rapid conversation switching does not cause rendering errors
    Given conversations A, B, and C exist with different message counts
    When the user rapidly switches A -> B -> C within 500ms
    Then the final rendered state should show conversation C's messages
    And no stale messages from A or B should be visible
    And no React errors should appear in the console
```

---

## Module 6: Edge Cases

### Feature: Edge case handling

```gherkin
Feature: Edge cases for virtualized chat

  Background:
    Given the MessageList uses VList from virtua

  # P0
  Scenario: Empty conversation (no messages, has conversation)
    Given the user has selected a conversation with 0 messages
    When the MessageList renders
    Then it should display the empty state: "Start a conversation" / "Type a message below to begin"
    And no VList should be rendered

  # P0
  Scenario: No conversation selected
    Given no conversation is currently selected (currentConversationId = null)
    When the MessageList renders
    Then it should display: "Start a new conversation" / "Click 'New Chat' or start typing below"

  # P0
  Scenario: Single message conversation
    Given a conversation has exactly 1 user message
    When the MessageList renders
    Then the VList should render with 1 item
    And the message should be visible and correctly positioned
    And scrolling should not be necessary

  # P1
  Scenario: Very long message (10000+ characters)
    Given a conversation contains an assistant message with 10000+ characters of content
    When that message scrolls into the visible area
    Then the message should render completely without truncation
    And the VList should correctly calculate the item height (dynamic height)
    And scrolling past this message should work smoothly

  # P1
  Scenario: Message with many image attachments
    Given a conversation contains a user message with 10+ image attachments
    When that message scrolls into the visible area
    Then all images should render in the flex-wrap layout
    And the VList item height should accommodate all images
    And scrolling should remain smooth

  # P1
  Scenario: Tool call permission popup positioning in virtual list
    Given the AI has made a tool call that requires user approval
    And the tool call message is rendered inside the VList
    When the permission approval popup appears
    Then the popup should be correctly positioned relative to the tool call
    And the popup should remain visible even if the user scrolls slightly
    And approving/denying should work correctly

  # P1
  Scenario: Preparing response state (empty assistant message)
    Given the user has sent a message and isLoading = true
    And the last message is an assistant message with empty content
    When the MessageList renders
    Then the "准备响应中 ..." indicator should be visible
    And it should be positioned after the last message in the VList

  # P1
  Scenario: Generating response state (assistant message with content)
    Given the AI is streaming a response (isLoading = true)
    And the last assistant message has content
    When the MessageList renders
    Then the "正在生成 ..." indicator should be visible below the streaming message

  # P2
  Scenario: Message with mixed content (thinking + tool calls + text + images)
    Given an assistant message has:
      | Component    | Present |
      | thinking     | yes     |
      | toolCalls    | yes (3) |
      | toolResults  | yes (3) |
      | content      | yes     |
      | attachments  | no      |
    When that message scrolls into the visible area
    Then all components should render in correct order: ThinkingBlock -> ToolCallsList -> Content
    And the VList should correctly measure the total height

  # P2
  Scenario: Conversation with 1000+ messages
    Given a conversation has 1000 messages
    When the MessageList renders
    Then initial render should complete within 100ms
    And DOM node count should remain under 30
    And scrolling from top to bottom should be smooth

  # P2
  Scenario: Window resize during virtual list display
    Given a conversation is displayed in the VList
    When the user resizes the application window
    Then the VList should recalculate visible items
    And no messages should be cut off or misaligned
    And the scroll position should be preserved relative to content
```

---

## Test Implementation Notes

### Priority Summary

| Priority | Count | Description |
|----------|-------|-------------|
| P0       | 16    | Must pass - core functionality, blocking release |
| P1       | 17    | Should pass - important UX and performance |
| P2       | 6     | Nice to have - stress tests and edge cases |

### Key Testing Tools

- **React Testing Library** + **Vitest** for component unit tests
- **React DevTools Profiler** for render count verification (Module 4)
- **Performance.now()** for timing assertions (Module 6: 1000+ messages)
- **Mock VList** from virtua for unit tests; real VList for integration tests
- **Zustand store mocking** for isolated state testing

### Store State Dependencies

| Scenario Area | Store Fields Used |
|---------------|-------------------|
| Auto-scroll   | `chatStore.atBottom`, `chatStore.isScrolling`, `chatStore.isLoading` |
| Back-bottom   | `chatStore.atBottom`, `chatStore.scrollToBottom` |
| Streaming perf | `conversationStore.updateMessage`, `conversationStore.conversations` |
| Conv switch   | `conversationStore.currentConversationId`, `conversationStore.loadConversation` |

### Component Hierarchy (Post-Virtualization)

```
MessageList
├── VList (virtua)
│   ├── MessageItem (id="msg-1")  ← memo + ID-driven
│   ├── MessageItem (id="msg-2")
│   ├── ...
│   └── [last item]
│       ├── MessageItem (id="msg-N")
│       └── AutoScroll             ← invisible, scroll logic only
├── BackBottom                     ← absolute positioned, outside VList
├── "准备响应中 ..." indicator
└── "正在生成 ..." indicator
```

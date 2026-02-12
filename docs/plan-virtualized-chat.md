# 聊天列表虚拟化 + 渲染优化 — 实施计划

> 基于 LobeChat 实现方案，对 Muse 的 MessageList 和 Markdown 渲染进行性能优化
> 参考源码：https://github.com/lobehub/lobe-chat/tree/main/src/features/Conversation

---

## 背景

当前问题：
1. MessageList 无虚拟化，全量 DOM 渲染
2. MessageItem 无 memo，每个 chunk flush 导致所有消息重渲染
3. Markdown 每帧重新解析全文
4. getCurrentConversation() 不是 selector，任何 store 变化都触发 MessageList 重渲染
5. scrollIntoView({ behavior: 'smooth' }) 每帧触发

---

## 依赖变更

`virtua` 和 `fast-deep-equal` 已作为 `@lobehub/ui` 的依赖存在于 node_modules 中，无需额外安装。
只需确认 package.json 中显式声明（避免幽灵依赖）：

```bash
npm install virtua fast-deep-equal
```

---

## Step 1: 新增滚动状态到 Store

**文件:** `src/renderer/src/stores/chatStore.ts`

新增 state 字段：
```typescript
// 滚动状态
atBottom: boolean           // 是否在底部（初始 true）
isScrolling: boolean        // 是否正在滚动
isGenerating: boolean       // 是否正在生成（已有 isLoading 可复用）
```

新增 actions：
```typescript
setScrollState: (state: Partial<{ atBottom: boolean; isScrolling: boolean }>) => void
scrollToBottom: (smooth?: boolean) => void  // 通过 ref 回调实现
registerScrollMethods: (methods: ScrollMethods | null) => void
```

ScrollMethods 接口：
```typescript
interface ScrollMethods {
  scrollToIndex: (index: number, options?: { align?: string; smooth?: boolean }) => void
}
```

**验收标准:**
- atBottom 默认 true
- setScrollState 可以部分更新
- scrollToBottom 调用注册的 scrollToIndex

---

## Step 2: 重写 MessageList — 引入 virtua VList

**文件:** `src/renderer/src/components/chat/MessageList.tsx`（重写）

核心改动：
1. 用 `VList` 替代原生 `div.overflow-y-auto` + `messages.map()`
2. dataSource 改为消息 ID 数组（从 store 中 select）
3. 移除 `isUserScrolledUp` useState、`handleScroll`、`scrollIntoView` useEffect
4. 滚动事件由 VList 的 `onScroll` / `onScrollEnd` 处理，更新 store
5. 用 `key={currentConversationId}` 切换对话时自动重建 VList（重置 cache + 滚动位置）

**父容器约束：** MessageList 外层需要 `className="flex-1 min-h-0"`，`min-h-0` 是 flex 子元素获得正确像素高度的关键，否则 VList 无法计算可见区域。

```tsx
// Based on: https://github.com/lobehub/lobe-chat/blob/main/src/features/Conversation/ChatList/components/VirtualizedList.tsx
// License: MIT

<VList
  key={currentConversationId}
  ref={virtuaRef}
  data={messageIds}
  bufferSize={typeof window !== 'undefined' ? window.innerHeight : 0}
  style={{ height: '100%', overflowAnchor: 'none' }}
  onScroll={handleScroll}
  onScrollEnd={handleScrollEnd}
>
  {(messageId, index) => (
    <div key={messageId} className="px-6 py-3">
      <MessageItem id={messageId} />
      {isLastItem && <AutoScroll />}
    </div>
  )}
</VList>
```

**注意：VList `onScroll` 签名是 `(offset: number) => void`**，只接收 scrollTop 偏移量，不是 DOM ScrollEvent。计算 atBottom 需要通过 ref：

```typescript
const handleScroll = useCallback((offset: number) => {
  const handle = virtuaRef.current
  if (!handle) return
  const atBottom = handle.scrollSize - offset - handle.viewportSize <= AT_BOTTOM_THRESHOLD
  setScrollState({ atBottom, isScrolling: true })

  if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current)
  scrollEndTimerRef.current = setTimeout(() => {
    setScrollState({ isScrolling: false })
  }, 150)
}, [])
```

**"准备响应中" / "正在生成" 指示器：** 当前 MessageList 底部有 `showPreparing` 和 `showGenerating` 两个状态指示器。虚拟化后作为 VList 外部元素处理（绝对定位在 VList 底部），不参与虚拟化。

**底部留白：** VList style 中不支持 `paddingBottom`，改为在最后一个 item 后添加 24px 高度的空 div 占位。

**验收标准:**
- 长对话（100+ 消息）DOM 节点数量恒定（可见区域 + buffer）
- 快速滚动无白屏
- 切换对话时自动滚到底部

---

## Step 3: 新增 AutoScroll 组件

**文件:** `src/renderer/src/components/chat/AutoScroll.tsx`（新建）

```tsx
// Based on: https://github.com/lobehub/lobe-chat/blob/main/src/features/Conversation/ChatList/components/AutoScroll/index.tsx
// License: MIT
```

无 UI 组件，放在 VList 最后一项内部。

触发条件：
```typescript
const shouldAutoScroll = atBottom && isLoading && !isScrolling
```

监听依赖：
- `messages.length`（新消息到达）
- `lastMessageContentLength`（流式内容增长）

当条件满足时调用 `scrollToBottom(false)`（instant，不用 smooth）。

**验收标准:**
- 流式生成时自动跟随底部
- 用户手动上滚后停止自动滚动
- 用户滚回底部后恢复自动滚动

---

## Step 4: 新增 BackBottom 组件

**文件:** `src/renderer/src/components/chat/BackBottom.tsx`（新建）

浮动按钮，放在 VList 外部（绝对定位）。

```tsx
// Based on: https://github.com/lobehub/lobe-chat/blob/main/src/features/Conversation/ChatList/components/BackBottom/index.tsx
// License: MIT
```

- `visible={!atBottom}` 时显示（带过渡动画）
- 点击调用 `scrollToBottom(true)`（smooth）
- 位置：容器右下角

**验收标准:**
- 上滚时出现，在底部时隐藏
- 点击平滑滚到底部
- 不遮挡消息内容

---

## Step 5: MessageItem 性能优化

**文件:** `src/renderer/src/components/chat/MessageItem.tsx`（改造）

### 5a. 改为 ID 驱动

Props 从 `{ message: Message }` 改为 `{ id: string }`。
组件内部通过 selector 从 store 获取消息数据：

```typescript
const message = useConversationStore(
  useCallback(s => s.conversations
    .find(c => c.id === s.currentConversationId)
    ?.messages.find(m => m.id === id), [id])
)
```

### 5b. 加 memo

Props 只有 `{ id: string }`，默认 `Object.is` 浅比较即可（string 不会变引用）。
不需要 `fast-deep-equal`，先用默认比较，用 React DevTools Profiler 验证后再决定是否升级。

```typescript
export const MessageItem = memo<MessageItemProps>(({ id }) => {
  // ...
})
```

### 5c. 子组件也加 memo

- `ThinkingBlock` — memo
- `ToolCallsList` — memo
- `MessageStats` — memo

### 5d. ThinkingBlock 展开状态

虚拟化后，ThinkingBlock 滚出可见区域再滚回来时组件会被卸载重建，内部 `useState(false)` 的展开状态会丢失。
**决策：接受这个行为**（大多数虚拟列表都这样），默认收起是合理的。如果后续用户反馈强烈，再将展开状态提升到 message 级别的 store。

**验收标准:**
- 流式生成时，只有正在生成的消息重渲染，历史消息不动
- React DevTools Profiler 确认无多余渲染

---

## Step 6: MarkdownRenderer 优化

**文件:** `src/renderer/src/components/chat/MarkdownRenderer.tsx`（改造）

### 6a. 加 memo + children 比较

```typescript
export const MarkdownRenderer = memo<MarkdownRendererProps>(
  ({ content }) => (
    <div className="overflow-x-auto max-w-full">
      <Markdown className="prose prose-sm max-w-none" variant="chat" enableImageGallery>
        {content}
      </Markdown>
    </div>
  ),
  (prev, next) => prev.content === next.content
)
```

### 6b. 确认 @lobehub/ui Markdown 的 enableStream 生效

`@lobehub/ui` 的 Markdown 组件默认 `enableStream=true`，内部使用 StreamdownRender 分块策略。
确认当前版本是否包含此功能，如果版本过旧需要升级。

### 6c. 配置 variant='chat'

使用 chat variant 获得更好的聊天排版（字体大小、行间距优化）。

**验收标准:**
- 流式生成时，已完成的 markdown 块不重新解析
- 长代码块不卡顿
- content 不变时组件不重渲染

---

## Step 7: 修复 getCurrentConversation selector

**文件:** `src/renderer/src/stores/conversationStore.ts` + 调用方

当前问题：`getCurrentConversation()` 是函数调用，不是 Zustand selector。

改为提供 selector 式的消息 ID 列表：

```typescript
// 新增 selector
const selectCurrentMessageIds = (s: ConversationStore): string[] => {
  const conv = s.conversations.find(c => c.id === s.currentConversationId)
  return conv?.messages.map(m => m.id) ?? []
}
```

MessageList 中使用：
```typescript
const messageIds = useConversationStore(selectCurrentMessageIds, shallow)
```

配合 `shallow` 比较，只有 ID 列表实际变化时才重渲染。

**验收标准:**
- MessageList 只在消息增删时重渲染，不在消息内容更新时重渲染

---

## Step 8: 优化 flushChunks 中的 updateConversation

**文件:** `src/renderer/src/stores/chatStore.ts`

当前问题：`flushChunks` 中 `conv.messages.map()` 创建全新数组，所有消息引用都变了。

改为只更新目标消息，保持其他消息引用不变：

```typescript
flushChunks = () => {
  const chunks = pendingChunks
  pendingChunks = []
  if (chunks.length === 0) return

  const conversationStore = useConversationStore.getState()
  // 直接更新目标消息，不 map 整个数组
  conversationStore.updateMessage(conversationId, assistantMessageId, (msg) => {
    const updated = { ...msg }
    for (const chunk of chunks) {
      if (chunk.content) updated.content = (updated.content || '') + chunk.content
      if (chunk.thinking) updated.thinking = (updated.thinking || '') + chunk.thinking
      // ... toolCall, toolResult, usage
    }
    return updated
  })
}
```

新增 `updateMessage` action：
```typescript
updateMessage: (convId, msgId, updater: (msg: Message) => Message) =>
  set(state => ({
    conversations: state.conversations.map(c =>
      c.id === convId
        ? {
            ...c,
            messages: c.messages.map(m =>
              m.id === msgId ? updater(m) : m  // 只有目标消息创建新引用
            ),
          }
        : c
    ),
  }))
```

**验收标准:**
- 流式期间，非目标消息的引用保持不变
- 配合 MessageItem memo，历史消息不重渲染

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 修改 | 添加 virtua, fast-deep-equal |
| `src/renderer/src/stores/chatStore.ts` | 修改 | 滚动状态、scrollMethods、flushChunks 优化 |
| `src/renderer/src/stores/conversationStore.ts` | 修改 | updateMessage action、messageIds selector |
| `src/renderer/src/components/chat/MessageList.tsx` | 重写 | VList 虚拟化 |
| `src/renderer/src/components/chat/MessageItem.tsx` | 改造 | ID 驱动 + memo |
| `src/renderer/src/components/chat/MarkdownRenderer.tsx` | 改造 | memo + variant |
| `src/renderer/src/components/chat/AutoScroll.tsx` | 新建 | 自动滚动逻辑 |
| `src/renderer/src/components/chat/BackBottom.tsx` | 新建 | 回到底部按钮 |
| `src/renderer/src/components/chat/ThinkingBlock.tsx` | 修改 | 加 memo |
| `src/renderer/src/components/chat/ToolCallsList.tsx` | 修改 | 加 memo |
| `src/renderer/src/components/chat/MessageStats.tsx` | 修改 | 加 memo |

---

## 实施顺序

```
Step 1 (Store) → Step 7 (selector) → Step 8 (updateMessage)
    ↓
Step 5 (MessageItem memo + ID 驱动)
    ↓
Step 6 (MarkdownRenderer memo)
    ↓
Step 2 (MessageList VList) → Step 3 (AutoScroll) → Step 4 (BackBottom)
```

先做 store 层和 memo 优化（Step 1/5/6/7/8），再做虚拟化（Step 2/3/4）。
这样即使虚拟化出问题，memo 优化已经能带来显著提升。

---

## 风险点

1. **virtua 与现有样式兼容** — VList 接管滚动容器，现有的 `overflow-y-auto` 和 padding 需要调整
2. **MessageItem ID 驱动改造** — selector 每次 store 更新都遍历 messages 数组，配合 updateMessage 保持引用不变可缓解
3. **@lobehub/ui Markdown 版本** — 已确认 4.35.3 包含 StreamdownRender，enableStream 默认 true
4. **Tool call 权限弹窗** — 虚拟化后弹窗定位可能受影响，审批状态需确认是否在 store 中持久化
5. **图片附件预览** — 虚拟化后图片画廊的定位和滚动行为需要测试
6. **ThinkingBlock/ToolCallCard 状态丢失** — 滚出可见区域后组件卸载，内部 useState 重置（已决策接受）
7. **VList 父容器高度** — 必须有确定像素高度（flex-1 + min-h-0），否则虚拟化失效
8. **ScrollArea 嵌套冲突** — ThinkingBlock 内的 ScrollArea 在虚拟列表内可能导致滚动事件冲突

**回滚方案：** 按实施顺序，Step 1/5/6/7/8 是纯 memo + store 优化，不引入 virtua。即使 Step 2/3/4（虚拟化）出问题，可以单独回滚这三步，memo 优化仍然保留。

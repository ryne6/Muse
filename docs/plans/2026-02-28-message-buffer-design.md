# 对话缓冲区（Message Buffer）设计

## 目标

生成中允许用户继续发送消息，消息进入缓冲队列，生成结束后自动逐条消费。

## 核心决策

- FIFO 队列，逐条发送，每条独立 AI 回复
- 最多 5 条
- 「立即发送」= abort + 丢弃当前回复 + 发送该消息
- 生成结束自动 dequeue 第一条
- UI：卡片列表，ChatInput 上方，z-index 高于 TodoPanel

## 数据模型

```typescript
interface BufferItem {
  id: string
  content: string
  attachments?: PendingAttachment[]
  createdAt: number
}
```

## chatStore 改动

新增状态：`messageBuffer: BufferItem[]`

新增方法：
- `enqueueMessage(content, attachments?)` — 入队，满 5 拒绝
- `dequeueMessage(id)` — 移除指定消息
- `clearBuffer()` — 清空
- `sendBufferItem(id)` — 立即发送：abort → 删 assistant 占位 → 发送

修改 `sendMessage` finally 块：检查 buffer，非空则 dequeue 第一条递归发送。

## ChatInput 改动

`handleSend` 中 `isLoading` 时走 `enqueueMessage` 而非 return。

## 新建 MessageBuffer.tsx

- 遍历 `messageBuffer` 渲染卡片
- 每条：序号、内容预览（截断 50 字）、发送按钮、删除按钮
- 空队列不渲染

## 文件清单

| 文件 | 改动 |
|------|------|
| `src/renderer/src/stores/chatStore.ts` | buffer 状态 + 4 方法 + finally 自动消费 |
| `src/renderer/src/components/chat/ChatInput.tsx` | handleSend isLoading 分支 |
| `src/renderer/src/components/chat/MessageBuffer.tsx` | 新建 |
| `src/renderer/src/components/chat/ChatView.tsx` | 插入 MessageBuffer |

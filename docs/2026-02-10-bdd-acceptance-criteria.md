# BDD 验收标准

> 日期：2026-02-10
> 关联文档：docs/2026-02-10-ui-improvement-tasks.md
> 格式：Given / When / Then (Gherkin)

---

## Feature 1: 工具调用区域折叠优化

**涉及文件**：`src/renderer/src/components/chat/ToolCallCard.tsx`

### Scenario 1.1: 默认折叠状态

```gherkin
Given 一条 AI 消息包含至少一个工具调用（如 Read、Write、Bash 等）
When 消息渲染完成，ToolCallCard 组件挂载
Then 工具调用卡片默认显示为收起状态（isCollapsed = true）
  And 只显示 Header 行：工具图标 + 工具名称 + 状态图标 + 状态文字
  And 参数区域（Parameters）不可见
  And 输出区域（Result / Error）不可见
  And Header 行左侧显示 ChevronRight 图标表示可展开
```

### Scenario 1.2: 点击 Header 展开卡片

```gherkin
Given 一个处于收起状态的 ToolCallCard
When 用户点击 Header 行的任意位置（包括工具名、状态图标、空白区域）
Then 卡片切换为展开状态（isCollapsed = false）
  And ChevronRight 图标变为 ChevronDown 图标
  And 参数区域可见，显示工具的输入参数
  And 输出区域可见（如果已有 toolResult）
  And 原有的长文本截断逻辑（>300 字符 Show More/Less）仍然生效
```

### Scenario 1.3: 再次点击 Header 收起卡片

```gherkin
Given 一个处于展开状态的 ToolCallCard
When 用户再次点击 Header 行
Then 卡片切换回收起状态
  And ChevronDown 图标变回 ChevronRight 图标
  And 参数区域和输出区域重新隐藏
```

### Scenario 1.4: 无参数无输出的工具调用

```gherkin
Given 一个工具调用，其 input 为空对象且尚无 toolResult
When 卡片处于展开状态
Then 参数区域不渲染（因为无参数）
  And 输出区域不渲染（因为无结果）
  And 卡片展开后仅显示 Header，无额外内容
```

### Scenario 1.5: 权限请求状态下的折叠行为

```gherkin
Given 一个工具调用的 toolResult 包含权限请求（TOOL_PERMISSION_PREFIX）
When 卡片处于收起状态
Then Header 行状态显示为 "需要权限"，带 Loader2 旋转图标
When 用户点击 Header 展开卡片
Then 权限请求按钮（允许 / 允许所有 / 拒绝）可见且可交互
```

---

## Feature 2: 左侧导航栏拖拽伸缩 + 折叠重构

**涉及文件**：`Sidebar.tsx`, `AppLayout.tsx`, `ConversationList.tsx`, `Settings.tsx`

### Scenario 2.1: 默认宽度与持久化

```gherkin
Given 用户首次启动应用（localStorage 无侧边栏宽度记录）
When AppLayout 渲染完成
Then 侧边栏宽度为 280px（默认值）
  And 侧边栏内容正常显示：Logo + 文字、会话列表、设置按钮
```

### Scenario 2.2: 拖拽调整宽度

```gherkin
Given 侧边栏处于展开状态，当前宽度为 280px
When 用户将鼠标移至侧边栏右边缘（4px 热区）
Then 鼠标光标变为 col-resize
  And 热区出现视觉提示（如变色高亮）
When 用户按住鼠标左键并向右拖拽 50px
Then 侧边栏宽度实时更新为 330px
  And 主内容区域（ChatView）宽度相应缩小
When 用户释放鼠标
Then 新宽度 330px 持久化到 localStorage
  And 下次启动应用时侧边栏恢复为 330px
```

### Scenario 2.3: 拖拽宽度边界限制

```gherkin
Given 侧边栏当前宽度为 280px
When 用户拖拽侧边栏右边缘试图将宽度缩小到 40px
Then 侧边栏宽度停留在最小值 60px，不会继续缩小
When 用户拖拽侧边栏右边缘试图将宽度扩大到 500px
Then 侧边栏宽度停留在最大值 400px，不会继续扩大
```

### Scenario 2.4: 折叠按钮触发折叠模式

```gherkin
Given 侧边栏处于展开状态（宽度 > 60px）
When 用户点击折叠按钮（位于 Logo 区域右侧或侧边栏底部）
Then 侧边栏宽度动画过渡到 60px（图标模式）
  And Logo 区域只显示图标，隐藏 "Muse" 文字
  And "新话题" 按钮只显示 Plus 图标，隐藏文字
  And 会话列表隐藏文字，仅保留必要图标
  And 设置按钮只显示图标
  And 所有图标在 60px 宽度内居中对齐
```

### Scenario 2.5: 从折叠模式展开

```gherkin
Given 侧边栏处于折叠模式（宽度 = 60px）
When 用户点击展开按钮
Then 侧边栏宽度动画过渡到折叠前的宽度（或默认 280px）
  And Logo 恢复显示图标 + "Muse" 文字
  And 会话列表恢复完整显示
  And 所有内容恢复正常布局
```

### Scenario 2.6: 拖拽过程中文本不被选中

```gherkin
Given 用户正在拖拽侧边栏边缘调整宽度
When 鼠标经过文本内容区域
Then 页面上的文本不会被意外选中（user-select: none 生效）
  And 拖拽操作流畅，无闪烁或卡顿
```

---

## Feature 3: Thinking 区域 & 工具调用区域滚动优化

**涉及文件**：`ThinkingBlock.tsx`, `ToolCallCard.tsx`
**依赖**：`@lobehub/ui` ScrollArea 组件

### Scenario 3.1: ThinkingBlock 展开后使用 ScrollArea

```gherkin
Given 一条 AI 消息包含超过 200 字符的 thinking 内容
  And 用户已点击 "展开" 按钮，ThinkingBlock 处于完全展开状态
When thinking 内容高度超过 300px
Then 内容区域被 ScrollArea 组件包裹
  And 内容区域最大高度限制为 300px
  And 出现自定义滚动条，用户可上下滚动查看全部 thinking 内容
  And 滚动条样式与 @lobehub/ui ScrollArea 一致
```

### Scenario 3.2: ToolCallCard 展开后输出区域使用 ScrollArea

```gherkin
Given 一个 ToolCallCard 处于展开状态
  And toolResult.output 内容较长（渲染高度超过 400px）
When 输出区域渲染完成
Then 输出区域被 ScrollArea 组件包裹
  And 输出区域最大高度限制为 400px
  And 出现自定义滚动条，用户可上下滚动查看完整输出
```

### Scenario 3.3: 短内容不触发 ScrollArea 滚动

```gherkin
Given ThinkingBlock 展开后内容高度不超过 300px
When 内容区域渲染完成
Then ScrollArea 存在但不显示滚动条
  And 内容完整可见，无需滚动
```

### Scenario 3.4: ThinkingBlock 收起状态不受 ScrollArea 影响

```gherkin
Given ThinkingBlock 处于默认收起状态（max-h-[4.5rem]）
When 内容被截断显示
Then 不显示 ScrollArea 滚动条
  And 保留原有的 hover 时 overflow-auto 行为
  And "展开" 按钮仍然在 hover 时可见
```

---

## Feature 4: TodoWrite 工具调用渲染

**涉及文件**：`ToolCallCard.tsx`, `ToolCallsList.tsx`, 可能新增 `TodoCard.tsx`

### Scenario 4.1: 识别 TodoWrite 工具调用并使用专用渲染

```gherkin
Given 一条 AI 消息包含 toolCall.name === 'TodoWrite' 的工具调用
When ToolCallCard 组件渲染该工具调用
Then 不使用通用的参数/输出渲染逻辑
  And 使用专用的任务列表 UI 渲染 TodoWrite 内容
  And 卡片 Header 仍显示 ListTodo 图标 + "TodoWrite" 名称 + 状态图标
```

### Scenario 4.2: 任务列表可视化渲染

```gherkin
Given TodoWrite 工具调用的 input 参数包含任务数据（tasks 数组）
When 专用渲染组件解析 input 参数
Then 每个任务渲染为一行：checkbox 图标 + 任务标题 + 状态标签
  And 已完成任务显示勾选的 checkbox 和删除线文字
  And 未完成任务显示空 checkbox 和正常文字
  And 进行中任务显示特殊标识（如蓝色圆点或进度图标）
```

### Scenario 4.3: TodoWrite 与折叠功能兼容

```gherkin
Given 一个 TodoWrite 工具调用卡片
When Feature 1 的折叠功能生效
Then 收起时只显示 Header 行（ListTodo 图标 + "TodoWrite" + 状态）
  And 展开时显示完整的任务列表 UI
  And 折叠/展开切换不影响任务列表数据
```

### Scenario 4.4: 非 TodoWrite 工具调用不受影响

```gherkin
Given 一条 AI 消息包含 toolCall.name !== 'TodoWrite' 的工具调用（如 Read、Write、Bash）
When ToolCallCard 组件渲染该工具调用
Then 仍使用原有的通用参数/输出渲染逻辑
  And 不触发 TodoWrite 专用渲染分支
```

---

## Feature 5: 流式渲染卡顿优化

**涉及文件**：`chatStore.ts`, `MessageItem.tsx`, `MarkdownRenderer.tsx`

### Scenario 5.1: 流式更新使用 requestAnimationFrame 节流

```gherkin
Given AI 正在流式生成回复，chatStore 的 streaming callback 持续接收 chunk
When 多个 chunk 在同一帧内到达（如 16ms 内收到 3 个 token）
Then chatStore 使用 requestAnimationFrame 合并更新
  And 每帧最多触发一次 Zustand state 更新
  And 不会出现每个 token 都触发独立 re-render 的情况
```

### Scenario 5.2: 新增内容块淡入动画

```gherkin
Given AI 流式回复正在进行中
When 新的文本内容块被追加到消息中
Then 新增内容以 CSS fade-in 动画呈现（opacity 0 -> 1）
  And 动画持续时间约 200ms
  And 已渲染的旧内容不受动画影响，保持稳定
```

### Scenario 5.3: 流式完成后内容完整性

```gherkin
Given AI 流式回复已完成（isLoading 变为 false）
When 最终消息渲染完成
Then 消息内容与 API 返回的完整内容一致，无丢失 token
  And Markdown 渲染结果正确（代码块、列表、标题等格式正常）
  And 淡入动画不再触发，内容处于静态状态
```

### Scenario 5.4: 用户中断流式生成

```gherkin
Given AI 正在流式生成回复
When 用户点击 "停止生成" 按钮（触发 abortMessage）
Then 流式更新立即停止
  And 已渲染的内容保留在界面上，不丢失
  And 不再触发新的 requestAnimationFrame 回调
  And isLoading 状态变为 false
```

---

## Feature 6: Approve 权限申请按钮交互优化

**涉及文件**：`ToolCallCard.tsx`（权限请求渲染部分）

### Scenario 6.1: 点击 "允许" 按钮的完整交互流程

```gherkin
Given 一个工具调用卡片显示权限请求，三个按钮（允许 / 允许所有 / 拒绝）处于 idle 状态
When 用户点击 "允许" 按钮
Then 按钮立即切换为 loading 状态：显示 Loader2 旋转图标 + "允许" 文字
  And 其他两个按钮变为禁用状态（不可点击）
When approveToolCall 操作完成
Then 按钮区域替换为已操作状态：绿色 CheckCircle 图标 + "已允许" 文字
  And 所有按钮不可再次点击
```

### Scenario 6.2: 点击 "允许所有" 按钮的完整交互流程

```gherkin
Given 一个工具调用卡片显示权限请求，三个按钮处于 idle 状态
When 用户点击 "允许所有" 按钮
Then 按钮立即切换为 loading 状态：显示 Loader2 旋转图标 + "允许所有" 文字
  And 其他两个按钮变为禁用状态
When approveToolCall(conversationId, toolName, true) 操作完成
Then 按钮区域替换为已操作状态：绿色 CheckCircle 图标 + "已允许所有" 文字
  And 所有按钮不可再次点击
```

### Scenario 6.3: 点击 "拒绝" 按钮的完整交互流程

```gherkin
Given 一个工具调用卡片显示权限请求，三个按钮处于 idle 状态
When 用户点击 "拒绝" 按钮
Then 按钮立即切换为 loading 状态
  And 其他两个按钮变为禁用状态
When 拒绝操作完成
Then 按钮区域替换为已操作状态：灰色 XCircle 图标 + "已拒绝" 文字
  And 所有按钮不可再次点击
```

### Scenario 6.4: 无 conversationId 时按钮不可用

```gherkin
Given 一个工具调用卡片显示权限请求
  And 当前 conversationStore 中 currentConversationId 为 null
When 权限请求区域渲染完成
Then 权限请求按钮不显示（showButtons = false）
  And 仅显示 "此工具需要权限才能运行。" 提示文字
```

### Scenario 6.5: 无效权限请求的降级处理

```gherkin
Given 一个工具调用的 toolResult 以 TOOL_PERMISSION_PREFIX 开头
  And 但 JSON 解析失败或 kind !== 'permission_request'
When 权限请求区域渲染完成
Then 显示 "需要权限，但请求无效。" 提示文字
  And 不显示任何操作按钮（showButtons = false）
```

---

## 验收标准汇总

| Feature | 场景数 | 涉及文件 |
|---------|--------|----------|
| 1. 工具调用区域折叠优化 | 5 | `ToolCallCard.tsx` |
| 2. 左侧导航栏拖拽伸缩 + 折叠重构 | 6 | `Sidebar.tsx`, `AppLayout.tsx`, `ConversationList.tsx`, `Settings.tsx` |
| 3. Thinking & 工具调用滚动优化 | 4 | `ThinkingBlock.tsx`, `ToolCallCard.tsx` |
| 4. TodoWrite 工具调用渲染 | 4 | `ToolCallCard.tsx`, `ToolCallsList.tsx`, `TodoCard.tsx` |
| 5. 流式渲染卡顿优化 | 4 | `chatStore.ts`, `MessageItem.tsx`, `MarkdownRenderer.tsx` |
| 6. Approve 按钮交互优化 | 5 | `ToolCallCard.tsx` |
| **合计** | **28** | |

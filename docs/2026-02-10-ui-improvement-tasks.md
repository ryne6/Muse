# 2026-02-10 UI 改进任务清单

> 日期：2026-02-10
> 状态：待开发
> 实现顺序：按编号 1→2→3→4→5→6

---

## 任务 1：工具调用区域折叠优化

**优先级**：高
**涉及文件**：`src/renderer/src/components/chat/ToolCallCard.tsx`

**现状**：`ToolCallCard` 的 `isExpanded` 仅控制输出文本截断（>300字符），整个卡片（参数+输出）始终可见。

**方案**：
- 新增一个 `isCollapsed` 状态，默认 `true`（收起）
- **收起时**：只显示 Header 行（图标 + 工具名 + 状态图标），隐藏参数和输出
- **展开时**：显示完整的参数和输出（保留原有的长文本截断逻辑）
- Header 行增加 ChevronRight/ChevronDown 图标作为展开/收缩按钮
- 点击 Header 行任意位置可切换折叠状态

---

## 任务 2：左侧导航栏拖拽伸缩 + 折叠重构

**优先级**：高
**涉及文件**：`Sidebar.tsx`, `AppLayout.tsx`, `ConversationList.tsx`, `Settings.tsx`

**现状**：`Sidebar` 固定 `w-[280px]`，无拖拽、无折叠功能。

**宽度参数**：
- 最小宽度：60px（图标模式）
- 默认宽度：280px
- 最大宽度：400px

**方案**：
- `AppLayout` 中管理侧边栏宽度状态（useState + localStorage 持久化）
- 侧边栏右边缘增加拖拽手柄（4px 热区，hover 时变色提示）
- 拖拽时实时更新宽度，限制在 min/max 范围内
- 增加折叠/展开按钮（放在 Logo 区域右侧或侧边栏底部）
- **折叠模式**（宽度 = 60px）：Logo 只显示图标，"新话题"只显示 Plus 图标，会话列表隐藏文字
- **重构对齐**：Logo 图标、新话题按钮图标、设置图标在折叠时居中对齐
- 评估 LobeUI `draggable-side-nav`，不合适则自行实现拖拽逻辑

---

## 任务 3：Thinking 区域 & 工具调用区域滚动优化

**优先级**：中
**涉及文件**：`ThinkingBlock.tsx`, `ToolCallCard.tsx`
**依赖**：`@lobehub/ui` 已安装（v4.32.2）

**现状**：ThinkingBlock 用 `max-h + overflow-hidden` 截断，ToolCallCard 输出区无滚动容器。

**方案**：
- 从 `@lobehub/ui` 引入 `ScrollArea` 组件
- ThinkingBlock 展开后的内容区域用 `ScrollArea` 包裹，设置 `max-h-[300px]`
- ToolCallCard 展开后的输出区域用 `ScrollArea` 包裹，设置 `max-h-[400px]`
- 参考：https://ui.lobehub.com/components/scroll-area

---

## 任务 4：TodoWrite 工具调用渲染

**优先级**：高（功能缺陷）
**涉及文件**：`ToolCallCard.tsx`, `ToolCallsList.tsx`, 可能需新增 `TodoCard.tsx`

**现状**：AI 调用 `TodoWrite` 工具时，前端按普通工具卡片渲染，没有专门的任务列表 UI。

**方案**：
- 识别 `toolCall.name === 'TodoWrite'` 的调用
- 为 TodoWrite 创建专用渲染组件（任务列表样式：checkbox + 标题 + 状态）
- 解析 TodoWrite 的 input 参数，渲染为可视化的任务清单
- 保留在 ToolCallCard 体系内，作为特殊渲染分支

---

## 任务 5：流式渲染卡顿优化

**优先级**：中
**涉及文件**：`chatStore.ts`（流式更新逻辑）, `MessageItem.tsx`, `MarkdownRenderer.tsx`

**现状**：流式渲染时内容一次性出来一大片，视觉上有卡顿感。

**方案**：
- **节流优化**：在流式更新中使用 `requestAnimationFrame` 节流，避免每个 token 都触发 re-render
- **淡入动画**：新增内容块添加 CSS `fade-in` 动画（opacity 0→1，duration ~200ms）
- 考虑对 Markdown 渲染结果做增量更新而非全量替换

---

## 任务 6：Approve 权限申请按钮交互优化

**优先级**：中
**涉及文件**：`ToolCallCard.tsx`（权限请求渲染部分）

**现状**：
1. 点击同意/拒绝按钮没有点击反馈
2. 操作完成后按钮状态没有变化，用户无法判断是否已操作

**方案**：
- 新增 `approvalStatus` 状态：`'idle' | 'loading' | 'approved' | 'approvedAll' | 'denied'`
- 点击按钮后立即切换为 loading 状态（显示 Loader2 旋转图标）
- 操作完成后按钮变为已操作状态：
  - 已允许：绿色 CheckCircle + "已允许" 文字，按钮禁用
  - 已允许所有：绿色 CheckCircle + "已允许所有" 文字，按钮禁用
  - 已拒绝：灰色 XCircle + "已拒绝" 文字，按钮禁用
- 参考 Codex GUI 的权限确认交互风格

---

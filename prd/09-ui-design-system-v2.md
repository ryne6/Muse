# Muse UI 设计规范 V2（对齐 LobeChat 风格）

**状态**: Draft
**创建日期**: 2026-01-28
**更新日期**: 2026-01-28
**目标**: 在现有系统基础上，对齐 LobeChat 的信息密度、层级与交互，建立可落地的 V2 视觉与组件规范。

---

## 1. 设计原则（V2）

### 1.1 目标
- **接近 LobeChat 的低噪声与高密度**：少装饰、多结构。
- **信息可扫描**：列表、分区、标题与次要信息清晰分层。
- **一致的卡片与输入体验**：统一圆角、边框与表单节奏。

### 1.2 关键变化
- 引入 **Surface 层级**（页面/卡片/输入）。
- 明确 **消息头部**（头像/昵称/时间）。
- 完整定义 **输入器（composer）工具栏与附件行**。
- 强化 **Sidebar 行高与交互态**。

---

## 2. 配色系统（对齐 LobeChat）

### 2.1 基础色板（浅色）
```css
--bg: 0 0% 100%;                 /* 页面背景 */
--surface-1: 240 5% 97%;         /* 大块区域卡片 */
--surface-2: 240 5% 98%;         /* 次级区域 / 输入框 */
--surface-3: 240 4% 96%;         /* hover / 细分区 */
--border: 240 6% 90%;            /* 统一边框 */

--text-strong: 220 15% 15%;      /* 主文本 */
--text: 220 10% 25%;             /* 正文 */
--text-muted: 220 8% 45%;        /* 辅助 */

--accent: 217 91% 60%;           /* 强调色 */
--accent-hover: 217 90% 54%;
--focus: 217 91% 60%;

--success: 142 71% 45%;
--warning: 38 92% 50%;
--danger: 0 84% 60%;
```

### 2.2 使用规则
- **正文与卡片**保持低饱和度，仅在 CTA、链接、开关启用时使用 accent。
- 默认卡片使用 **surface-1 + border**；输入框使用 **surface-2 + border**。

---

## 3. 字体与排版

### 3.1 字体家族
- 正文：`Inter, SF Pro Text, system-ui, sans-serif`
- 代码：`SF Mono, Menlo, Consolas, monospace`

### 3.2 字号/行高
- 标题 H1: 22 / 28
- H2: 18 / 24
- H3: 16 / 22
- 正文: 14 / 22
- 辅助: 12 / 18
- 代码: 13 / 20

---

## 4. 间距与圆角

### 4.1 间距系统
- 基础单位 4px。
- 页面区块上下：24px
- 卡片内边距：16px
- 输入器内边距：12px
- 列表项行高：36px（紧凑） / 40px（默认）

### 4.2 圆角
- 卡片：10px
- 输入框：10px
- 按钮：8px
- 小标签/Badge：6px
- 消息气泡：10px

---

## 5. 布局与结构

### 5.1 主布局
- 左侧栏：260px（搜索 + 会话列表 + 快捷入口）
- 主聊天区：自适应
- 顶部区域：可选 Model / Provider Chip 区

### 5.2 Sidebar（对齐 LobeChat）
- 分组标题（Today / Yesterday / This Month）
- 行高 36px，hover 使用 surface-3
- 选中态：`bg surface-2` + 左侧 2px accent bar

---

## 6. 关键组件规范

### 6.1 会话列表项
- 结构：标题 + 副标题（最后消息时间）
- hover：surface-3
- active：surface-2 + left accent bar

### 6.2 消息区域
- **消息头**：头像 + 名称 + 时间（小号灰）
- 用户消息：右对齐，浅边框气泡
- AI 消息：左对齐，文本更像文档块
- Markdown 区块遵循统一行高与 code block 规范

### 6.3 代码块
- 背景：`#f6f8fa`
- 顶部 header：语言标签 + 复制按钮
- 圆角 10px，边框使用 `border`

### 6.4 输入器（Composer）
- 外层 pill 容器，圆角 14px
- 上方提示：`从任何想法开始...`
- 工具栏 icon row（附件/模板/格式化等）
- 发送按钮圆形，hover 使用 accent

### 6.5 Provider/Model 管理卡片
- 3 列网格卡片，卡片内左对齐 logo + 文案
- 右下角开关（与 LobeChat 一致）
- 状态：启用=accent，禁用=灰

---

## 7. 交互与动效
- hover 150ms，轻量位移或阴影
- focus ring 2px accent
- 列表切换与卡片 hover 使用淡入淡出

---

## 8. 可访问性
- 主文本对比度 ≥ 4.5:1
- 所有输入与按钮必须支持键盘 focus
- 图标带 aria-label

---

## 9. 实施清单（V2）

### 必改
- `src/renderer/src/index.css`：更新色彩与圆角 token
- `Sidebar / ConversationItem`：行高与 active bar
- `ChatInput`：输入器结构 + icon row + pill
- `MessageItem`：消息头（头像/名字/时间）
- `ProviderList / ProviderCard`：卡片布局与 toggle
- `CodeBlock`：浅色主题 + header

### 可选
- `Settings` 侧边导航密度
- 增加 SearchBar 组件一致性

---

## 10. 验收清单
- [ ] sidebar 密度、分组与 hover 风格接近 LobeChat
- [ ] composer 外观与 icon row 类似 LobeChat
- [ ] 消息区有清晰 header 与层级
- [ ] provider 卡片与 toggle 状态一致
- [ ] 颜色保持低饱和，accent 用于强调


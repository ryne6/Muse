# UI V2 落地差距清单（对齐 LobeChat）

**更新日期**: 2026-01-28
**范围**: 对照 `prd/09-ui-design-system.md` 与当前实现，列出未符合项与优先级。

---

## P0（必须修复）

### 1) 主题 Token 未对齐
- **现状**: `src/renderer/src/index.css` 仍使用旧 token（`--background/--secondary/...`）。
- **V2 要求**: 引入 `--bg` / `--surface-1/2/3` / `--text-strong/text/text-muted` / `--accent-hover`。
- **影响**: 无法实现 LobeChat 的层级与密度。

### 2) 组件交互可访问性缺口
- Icon-only 按钮缺少 `aria-label`（SearchBar / ChatInput / ProviderCard / ConversationItem）。
- 表单控件无 label/aria-label（SearchBar 输入框、ChatInput textarea）。
- ConversationItem 使用 `<div onClick>`，无键盘交互支持（需改为 `<button>` 或补 onKeyDown）。

---

## P1（重要）

### 3) Sidebar 密度与选中态不一致
- **V2**: 行高 36px、hover surface-3、active 左侧 2px accent bar。
- **现状**: ConversationItem 使用 `py-2 rounded-lg`，无 accent bar、无副标题（最后消息时间）。

### 4) Composer 未达成 V2 结构
- **V2**: pill 容器 + icon row + 文案提示“从任何想法开始...”，发送按钮圆形。
- **现状**: ChatInput 仍为常规 textarea + 左侧上传按钮，发送按钮为方形 icon。

### 5) 消息头部缺失
- **V2**: 头像 + 名称 + 时间的 header。
- **现状**: MessageItem 无 header，仅气泡与内容。

---

## P2（一般）

### 6) Provider 管理卡片不符合
- **V2**: 3 列网格、右下角 toggle。
- **现状**: 2 列网格，菜单操作 + 状态 badge。

### 7) Code Block 缺少 header
- **V2**: 语言标签 + copy header。
- **现状**: 仅 copy overlay，无语言 header。

### 8) 细节与文案
- placeholder 使用 `...` 而非 `…`（SearchBar/ChatInput）。
- 会话列表缺少副标题（最后消息时间）。

---

## 建议的实施顺序
1) 主题 token + 全局圆角
2) Sidebar + ConversationItem
3) Composer
4) Message header
5) Provider 卡片/CodeBlock 细节


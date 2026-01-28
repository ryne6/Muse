# 会话搜索 + Vision/图片输入 设计（基于现有架构）

**更新日期**: 2026-01-27
**设计选择**:
- 搜索方案：SQLite FTS5（全量搜索）
- 图片存储：数据库 BLOB
- 图片检索：仅基于用户备注/文件名（不做 OCR/自动 caption）

---

## 1. 目标与非目标

### 目标
- 全量会话搜索：标题 + 消息文本 + tool_calls/tool_results + 图片备注/文件名。
- Vision/图片输入：支持图片随消息发送、存储、回显、再次使用。
- 不改变现有“本地优先、SQLite 持久化、API 本地服务”原则。

### 非目标
- 不做 OCR/自动图片描述。
- 不引入向量检索/语义搜索。
- 不改变云同步/多端架构。

---

## 2. 架构与模块改动概览

### 新增/变更模块
- **DB**：新增 `attachments` 表 + FTS5 虚拟表 `search_index`。
- **Main**：IPC 增加搜索接口、附件读写接口。
- **Renderer**：
  - 新增“会话搜索”入口与结果视图。
  - ChatInput 支持图片选择/预览/备注。
- **API**：Provider 适配增加 Vision payload 分支（按 provider 兼容差异）。
- **Shared Types**：扩展 AIMessage 支持多段内容（文本 + 图片）。

---

## 3. 数据模型设计

### 3.1 新增表：attachments
用于存储图片与元数据。

**字段设计**
- `id` (TEXT, PK)
- `message_id` (TEXT, FK → messages.id, ON DELETE CASCADE)
- `filename` (TEXT) 用户文件名
- `mime_type` (TEXT) `image/png` / `image/jpeg`
- `size` (INTEGER) 字节数
- `note` (TEXT) 用户备注（可空）
- `data` (BLOB) 图片原始二进制
- `created_at` (INTEGER, unixepoch)

### 3.2 搜索索引：FTS5
**虚拟表**: `search_index`

**索引字段**（建议）：
- `conversation_id`
- `message_id` (可空，用于结果定位)
- `type` (`conversation` | `message` | `tool` | `attachment`)
- `title` (conversation title)
- `content` (message content / tool input+output / attachment note + filename)
- `created_at`

**索引策略**
- conversation 创建/更新标题 → 更新 `search_index`。
- message 创建/更新 → 写入 `search_index`。
- tool_calls/tool_results → 合并 input/output 写入 `search_index`。
- attachment 添加/更新备注 → 写入 `search_index`。

---

## 4. 会话搜索设计

### 4.1 搜索入口（UI）
- 左侧会话列表增加搜索框（或全局快捷键 `Cmd/Ctrl+K`）。
- 默认搜索范围：全部会话。
- 支持过滤：
  - 仅当前会话
  - 时间范围（最近 7 天 / 30 天 / 全部）

### 4.2 搜索结果
- 展示：会话标题 + 命中片段（高亮） + 类型标识（message/tool/attachment）。
- 点击结果：跳转对应会话与消息位置。

### 4.3 搜索 API（IPC）
- `db:search:query`
  - params: `{ query: string, scope?: { conversationId?, dateRange? }, limit?, offset? }`
  - return: `{ items: Array<{ conversationId, messageId?, type, snippet, createdAt }> }`

---

## 5. Vision/图片输入设计

### 5.1 UI 交互
- ChatInput 增加 “图片按钮”（支持拖拽/粘贴）。
- 选图后显示缩略图 + 文件名 + 备注输入框。
- 发送消息时将图片随消息一起发送。
- 支持移除图片后再发送。

### 5.2 消息模型扩展
**shared/types/ai.ts**
```ts
export type AIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }; // data: base64

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | AIContentPart[]
}
```

### 5.3 Provider 适配
- OpenAI / Gemini / Claude / Generic：
  - 按 provider 的 vision 规范映射。
  - 不支持 vision 的 provider：返回友好错误（UI 提示）。

### 5.4 存储与回显
- 图片作为附件写入 `attachments` 表（BLOB）。
- 消息 content 仍保存文本；附件关联 message_id。
- UI 渲染消息时读取附件列表展示。

---

## 6. 数据流（关键路径）

### 6.1 图片消息发送
1) ChatInput 选择图片 + 备注 → 本地预览。
2) 点击发送 →
   - 保存消息（text）
   - 保存附件（blob + filename + note）
3) 组装 AIMessage content（text + image base64）
4) apiClient 调用 `/chat/stream`。
5) AI 返回流式结果 → UI 更新。

### 6.2 搜索
1) 输入关键字 → IPC 调用 `db:search:query`。
2) DB 使用 FTS5 返回结果。
3) UI 展示结果列表。
4) 点击结果 → 定位会话 + 消息。

---

## 7. 安全与性能约束

### 图片存储约束
- 单图大小上限：10MB（可配置）。
- 总存储阈值提示：如 DB 超过 1GB 给出清理提示。
- 图片读取惰性加载（避免列表页拉全量 blob）。

### 搜索性能
- FTS5 索引保持增量更新。
- 搜索返回分页，默认 20 条。

---

## 8. 迁移与兼容

- DB 迁移：新增 `attachments` 和 `search_index`。
- 旧消息无附件，搜索结果依旧覆盖旧数据。

---

## 9. 测试建议

### 单元测试
- DB：附件 CRUD、FTS 查询覆盖。
- API：vision payload 生成、错误分支。

### 集成测试
- 发送图片消息 → DB 存储 → UI 回显。
- 搜索结果定位消息。

---

## 10. 交付拆分

### Phase A（搜索）
- DB FTS5 + IPC 搜索 API + UI 搜索入口 + 结果定位。

### Phase B（Vision）
- attachments 表 + UI 输入 + provider 适配 + 发送链路。

---

## 11. 关联文档
- `prd/07-system-design.md`
- `prd/06-test-coverage-plan.md`


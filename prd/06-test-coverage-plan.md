# 测试补齐清单与优先级（API / main / store）

**更新日期**: 2026-01-27
**目标**: 补齐 API 层、main 进程、renderer store 的单元测试，并给出优先级与范围说明。

---

## 优先级定义
- **P0（必须）**: 影响核心对话链路、数据安全、工具执行正确性。
- **P1（重要）**: 影响主要业务体验或配置一致性。
- **P2（一般）**: 边缘能力、回归信心提升、技术债偿还。

---

## P0 单元测试清单（必须补齐）

### API 层（对话主链路）
- `src/api/routes/chat.ts`
  - 请求校验、错误映射、流式响应分支、工具调用链路入口。
- `src/api/services/ai/manager.ts`
  - provider 选择、路由策略、异常兜底。
- `src/api/services/ai/factory.ts`
  - provider 实例化、参数注入一致性。
- `src/api/services/ai/validator.ts`
  - 输入参数校验、边界值处理。
- `src/api/services/ai/tools/executor.ts`
  - tool call 执行分支、错误回传、output 序列化。

### API Provider 适配层（核心稳定性）
- `src/api/services/ai/providers/openai.ts`
- `src/api/services/ai/providers/claude.ts`
- `src/api/services/ai/providers/gemini.ts`
- `src/api/services/ai/providers/deepseek.ts`
- `src/api/services/ai/providers/generic.ts`
  - 请求 payload 映射、headers 生成、错误码转换、stream 响应处理。

### main 进程（IPC + 持久化 + 文件系统）
- `src/main/ipcBridge.ts`
  - IPC 通道注册、参数透传、异常边界。
- `src/main/services/fileSystemService.ts`
  - workspace 获取、目录递归、权限异常分支。
- `src/main/db/services/settingsService.ts`
  - 配置读写、默认值、覆盖与合并逻辑。
- `src/main/db/index.ts`
  - DB 初始化、连接重用、异常处理。

### renderer store（业务状态核心）
- `src/renderer/src/stores/chatStore.ts`
  - sendMessage 流程、loading/error 状态、AI 响应落库。
- `src/renderer/src/stores/conversationStore.ts`
  - create/select/delete、日期分组、messages 同步。
- `src/renderer/src/stores/settingsStore.ts`
  - provider/model 选择、API key 校验、温度/配置持久化。

---

## P1 单元测试清单（重要）

### API/Provider 基础能力
- `src/api/services/ai/providers/base.ts`
  - 基础请求封装、通用错误映射。
- `src/api/services/ai/tools/definitions.ts`
  - 工具定义与 schema 生成一致性。

### renderer 服务层
- `src/renderer/src/services/apiClient.ts`
  - API 调用封装、超时与错误处理。
- `src/renderer/src/services/dbClient.ts`
  - IPC 调用封装、返回值结构与错误分支。

### legacy store（如仍在使用）
- `src/renderer/src/stores/conversationStore.ts`
- `src/renderer/src/stores/settingsStore.ts`
  - 视实际引用情况决定是否保留或补测。

---

## P2 单元测试清单（一般）
- `src/main/apiServer.ts`
  - 服务器启动/关闭生命周期、端口占用处理。
- `src/main/db/migration.ts`
  - 迁移脚本调用、版本管理流程（可用集成测试替代）。

---

## 交付形式与建议
- 推荐目录结构：
  - `src/api/**/__tests__/*.test.ts`
  - `src/main/**/__tests__/*.test.ts`
  - `src/renderer/src/stores/__tests__/*.test.ts`
- 以单元测试为主，核心链路可补少量集成测试验证真实协作（P1/P2）。
- 测试优先覆盖“核心对话链路、配置持久化、工具调用”三条路径。

---

## 备注
- 当前已有 DB service 单测与 UI 组件测试，不在本次补齐范围内。
- 若时间有限，建议按 P0 → P1 → P2 顺序推进。

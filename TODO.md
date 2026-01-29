# Muse TODO List

## State Management Issues

- [ ] **1. 新增 Provider/Model 后 Chat 页面不重新加载**
  - 新增完 provider 或 model 后，chat 页面的 model 选择器不会更新
  - 需要在 settings store 变更时同步更新 chat 相关状态

- [ ] **2. Workspace 选择后右侧不更新**
  - 选择完 workspace 后右侧仍显示 "No workspace selected"
  - 状态应及时更新
  - 未选择 workspace 时不应显示 "No workspace selected" 区域

## UI/Style Issues

- [ ] **3. 主题色统一改为橙色**
  - 当前主色调是蓝色，部分按钮是黑色
  - 统一改为橙色，符合 "Muse" 形象

- [ ] **8. AI Provider 样式重构**
  - 参考 LobeChat 的样式设计

- [ ] **9. 全局 Loading 效果设计**
  - 页面级别的加载状态展示

- [ ] **10. 局部 Loading 效果设计**
  - 组件/区域级别的加载状态展示

- [ ] **11. 动画效果设计**
  - 页面切换、组件交互等动画效果

## Feature Bugs

- [ ] **4. 图片附件未传到接口**
  - 选择了图片但 chat 调接口时没有传到接口里
  - 图片也没有回显到聊天内容中

- [ ] **5. Search 功能不可用**
  - 疑似数据库没有初始化

- [ ] **6. 修改 Provider 字段不完整**
  - 目前只能修改名字和 URL
  - 应该支持和新增 provider 时一致的字段

- [ ] **7. Model 启用状态显示反了**
  - 在 ManageModel 中，启用显示为禁用，禁用显示为启用

  dropdown 没有设置不透明

  

## Refactoring

- [ ] **GenericProvider 使用策略模式重构**
  - 当前 `src/api/services/ai/providers/generic.ts` 使用 if/else 判断 API 格式
  - 应用 DIP（依赖倒置原则）+ 策略模式
  - 创建 `ApiFormatStrategy` 接口，分离不同格式的请求构建和响应解析逻辑
  - 实现：`OpenAIStrategy`, `AnthropicStrategy` 等
  - 便于后续扩展更多 API 格式（Gemini, Cohere 等）

## Other Issues

- [ ] **修复 dragEvent 未定义错误**
  - 终端报错：`ReferenceError: dragEvent is not defined`
  - 需要排查拖放功能相关代码

- [ ] **CORS 配置动态化**
  - 当前硬编码了 localhost 端口 (5173, 5174, 4173)
  - 考虑使用通配符或环境变量配置

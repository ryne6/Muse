# 扩展 Muse AI 工具集

## 目标

添加类似 Claude Code CLI 的完整工具集，增强 AI 的代码探索和操作能力。

## 新增工具列表

| 工具 | 功能 | 权限级别 |
|------|------|----------|
| glob | 文件模式匹配 | 无需授权 |
| grep | 正则内容搜索 | 无需授权 |
| git_status | Git 状态 | 无需授权 |
| git_diff | Git 差异 | 无需授权 |
| git_log | Git 日志 | 无需授权 |
| git_commit | Git 提交 | 需要授权 |
| git_push | Git 推送 | 需要授权 |
| git_checkout | Git 切换分支 | 需要授权 |
| web_fetch | 获取网页 | 无需授权 |
| web_search | 网页搜索 | 无需授权 |

## 权限系统设计

### 权限级别
- `safe`: 只读操作，无需授权
- `dangerous`: 写操作，首次调用需用户授权

### 授权流程
1. AI 调用危险工具时，executor 检查权限
2. 如未授权，返回特殊响应要求授权
3. 前端显示授权对话框
4. 用户授权后，权限存储在会话中
5. 后续调用同类工具无需再次授权

### 权限存储
- 会话级别：存储在 chatStore
- 持久化可选：存储在 settings

---

## 详细代码设计（分工具）

### 1. Glob 工具

**定义 (definitions.ts)**
```typescript
{
  name: 'glob',
  description: 'Fast file pattern matching. Use glob patterns like "**/*.ts" to find files.',
  input_schema: {
    type: 'object' as const,
    properties: {
      pattern: {
        type: 'string',
        description: 'Glob pattern (e.g., "**/*.ts", "src/**/*.tsx")',
      },
      path: {
        type: 'string',
        description: 'Base directory. Defaults to workspace root.',
      },
    },
    required: ['pattern'],
  },
}
```

**执行器 (executor.ts)**
```typescript
case 'glob':
  return await this.callIpc('fs:glob', input)
```

**服务 (fileSystemService.ts)**
```typescript
import fg from 'fast-glob'

async glob(pattern: string, basePath?: string): Promise<string[]> {
  const cwd = basePath || this.workspacePath
  const files = await fg(pattern, {
    cwd,
    ignore: ['**/node_modules/**', '**/.git/**'],
    absolute: true,
    onlyFiles: true,
  })
  return files.slice(0, 500) // 限制结果数量
}
```

---

### 2. Grep 工具

**定义 (definitions.ts)**
```typescript
{
  name: 'grep',
  description: 'Search file contents using regex.',
  input_schema: {
    type: 'object' as const,
    properties: {
      pattern: { type: 'string', description: 'Regex pattern' },
      path: { type: 'string', description: 'Search directory' },
      glob: { type: 'string', description: 'File filter (e.g., "*.ts")' },
      ignoreCase: { type: 'boolean', description: 'Case insensitive' },
    },
    required: ['pattern'],
  },
}
```

**服务 (fileSystemService.ts)**
```typescript
async grep(pattern: string, basePath?: string, options?: {
  glob?: string; ignoreCase?: boolean; maxResults?: number
}): Promise<{ file: string; line: number; content: string }[]> {
  const files = await this.glob(options?.glob || '**/*', basePath)
  const regex = new RegExp(pattern, options?.ignoreCase ? 'gi' : 'g')
  const results: any[] = []
  for (const file of files) {
    if (results.length >= (options?.maxResults || 100)) break
    try {
      const content = await fs.readFile(file, 'utf-8')
      content.split('\n').forEach((line, i) => {
        if (regex.test(line)) results.push({ file, line: i + 1, content: line.trim() })
        regex.lastIndex = 0
      })
    } catch { /* skip */ }
  }
  return results
}
```

---

### 3. Git 只读工具

**git_status 定义**
```typescript
{
  name: 'git_status',
  description: 'Get git repository status.',
  input_schema: {
    type: 'object' as const,
    properties: { path: { type: 'string' } },
    required: [],
  },
}
```

**git_diff 定义**
```typescript
{
  name: 'git_diff',
  description: 'Show git diff.',
  input_schema: {
    type: 'object' as const,
    properties: {
      staged: { type: 'boolean' },
      file: { type: 'string' },
    },
    required: [],
  },
}
```

**git_log 定义**
```typescript
{
  name: 'git_log',
  description: 'Show commit history.',
  input_schema: {
    type: 'object' as const,
    properties: { maxCount: { type: 'number' } },
    required: [],
  },
}
```

---

### 4. Git 写操作工具 (需要授权)

**git_commit 定义**
```typescript
{
  name: 'git_commit',
  description: 'Create a git commit. REQUIRES USER AUTHORIZATION.',
  input_schema: {
    type: 'object' as const,
    properties: {
      message: { type: 'string', description: 'Commit message' },
      files: { type: 'array', items: { type: 'string' }, description: 'Files to stage' },
    },
    required: ['message'],
  },
  permission: 'dangerous',
}
```

**git_push 定义**
```typescript
{
  name: 'git_push',
  description: 'Push commits to remote. REQUIRES USER AUTHORIZATION.',
  input_schema: {
    type: 'object' as const,
    properties: {
      remote: { type: 'string', description: 'Remote name (default: origin)' },
      branch: { type: 'string', description: 'Branch name' },
    },
    required: [],
  },
  permission: 'dangerous',
}
```

---

### 5. Web 工具

**web_fetch 定义**
```typescript
{
  name: 'web_fetch',
  description: 'Fetch content from a URL.',
  input_schema: {
    type: 'object' as const,
    properties: {
      url: { type: 'string', description: 'URL to fetch (HTTPS only)' },
      maxLength: { type: 'number', description: 'Max content length' },
    },
    required: ['url'],
  },
}
```

**WebService 实现 (新文件: webService.ts)**
```typescript
import axios from 'axios'

export class WebService {
  async fetch(url: string, maxLength = 50000): Promise<string> {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') throw new Error('HTTPS only')

    const res = await axios.get(url, { timeout: 30000 })
    let content = typeof res.data === 'string'
      ? this.htmlToText(res.data)
      : JSON.stringify(res.data)
    return content.slice(0, maxLength)
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
}
```

---

## 权限系统实现

### 类型定义 (shared/types/tools.ts 新文件)
```typescript
export type ToolPermission = 'safe' | 'dangerous'

export interface ToolDefinition {
  name: string
  description: string
  input_schema: object
  permission?: ToolPermission
}

export const DANGEROUS_TOOLS = ['git_commit', 'git_push', 'git_checkout']
```

### 授权检查 (executor.ts)
```typescript
async execute(toolName: string, input: any, permissions?: Set<string>) {
  if (DANGEROUS_TOOLS.includes(toolName)) {
    if (!permissions?.has(toolName)) {
      return {
        requiresPermission: true,
        tool: toolName,
        message: `Tool "${toolName}" requires user authorization.`
      }
    }
  }
  // 继续执行...
}
```

### 前端授权对话框
当收到 `requiresPermission: true` 响应时，显示授权对话框让用户确认。

---

## 修改文件清单

1. `src/api/services/ai/tools/definitions.ts` - 添加所有工具定义
2. `src/api/services/ai/tools/executor.ts` - 添加执行逻辑和权限检查
3. `src/main/services/fileSystemService.ts` - 添加 glob, grep, git 方法
4. `src/main/services/webService.ts` - 新建
5. `src/main/ipcBridge.ts` - 添加 IPC 路由
6. `src/shared/types/tools.ts` - 新建权限类型
7. `src/renderer/src/components/chat/PermissionDialog.tsx` - 新建授权对话框

## 验证步骤

1. 测试 glob: 搜索 `**/*.ts` 文件
2. 测试 grep: 搜索 `function` 关键字
3. 测试 git_status: 获取仓库状态
4. 测试 git_commit: 验证授权流程
5. 测试 web_fetch: 获取网页内容

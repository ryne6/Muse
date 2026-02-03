import { useEffect, useState } from 'react'
import { Wrench, ChevronDown } from 'lucide-react'
import { Dropdown } from '@lobehub/ui'
import { dbClient } from '@/services/dbClient'

// Built-in tools list
const BUILTIN_TOOLS = [
  { name: 'Read', description: '读取文件内容' },
  { name: 'Write', description: '写入文件' },
  { name: 'Edit', description: '编辑文件' },
  { name: 'LS', description: '列出目录内容' },
  { name: 'Bash', description: '执行命令' },
  { name: 'Glob', description: '文件模式匹配' },
  { name: 'Grep', description: '搜索文件内容' },
  { name: 'GitStatus', description: 'Git 状态' },
  { name: 'GitDiff', description: 'Git 差异' },
  { name: 'GitLog', description: 'Git 日志' },
  { name: 'GitCommit', description: 'Git 提交' },
  { name: 'GitPush', description: 'Git 推送' },
  { name: 'GitCheckout', description: 'Git 切换分支' },
  { name: 'WebFetch', description: '获取网页内容' },
  { name: 'WebSearch', description: '网络搜索' },
  { name: 'TodoWrite', description: '写入待办事项' },
]

interface MCPServerState {
  config: { name: string }
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  tools: Array<{ name: string; description?: string }>
}

export function ToolsDropdown() {
  const [mcpServers, setMcpServers] = useState<MCPServerState[]>([])

  // Load MCP server states
  useEffect(() => {
    const loadMcpStates = async () => {
      try {
        const states = await dbClient.mcp.getServerStates()
        setMcpServers(states || [])
      } catch (error) {
        console.error('Failed to load MCP states:', error)
      }
    }
    loadMcpStates()
    const interval = setInterval(loadMcpStates, 5000)
    return () => clearInterval(interval)
  }, [])

  // Calculate total tools count
  const mcpToolsCount = mcpServers
    .filter(s => s.status === 'connected')
    .reduce((sum, s) => sum + s.tools.length, 0)
  const totalTools = BUILTIN_TOOLS.length + mcpToolsCount

  // Build menu items
  const connectedServers = mcpServers.filter(s => s.status === 'connected')

  // Text truncation style
  const truncateStyle = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, display: 'block', maxWidth: 250 }

  const menuItems: any[] = [
    // Built-in tools group
    { key: 'builtin-header', label: <span style={truncateStyle}>Built-in Tools ({BUILTIN_TOOLS.length})</span>, disabled: true },
    ...BUILTIN_TOOLS.map(tool => ({
      key: `builtin-${tool.name}`,
      label: <span style={truncateStyle}>{tool.name} - {tool.description}</span>,
    })),
  ]

  // Add MCP tools groups
  if (connectedServers.length > 0) {
    menuItems.push({ type: 'divider' })
    connectedServers.forEach(server => {
      menuItems.push({
        key: `mcp-header-${server.config.name}`,
        label: <span style={truncateStyle}>MCP: {server.config.name} ({server.tools.length})</span>,
        disabled: true,
      })
      server.tools.forEach(tool => {
        menuItems.push({
          key: `mcp-${server.config.name}-${tool.name}`,
          label: <span style={truncateStyle}>{tool.description ? `${tool.name} - ${tool.description}` : tool.name}</span>,
        })
      })
    })
  } else {
    menuItems.push({ type: 'divider' })
    menuItems.push({ key: 'no-mcp', label: <span style={truncateStyle}>No MCP servers connected</span>, disabled: true })
  }

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="top"
      styles={{ root: { width: 280, overflow: 'hidden' } }}
    >
      <button className="flex items-center gap-1.5 px-2 py-1 rounded text-sm hover:bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))] transition-colors">
        <Wrench className="w-4 h-4" />
        <span>Tools ({totalTools})</span>
        <ChevronDown className="w-3 h-3" />
      </button>
    </Dropdown>
  )
}

import { useEffect, useState, useCallback } from 'react'
import { Zap, ChevronRight, Check } from 'lucide-react'
import { dbClient } from '~/services/dbClient'
import { useSettingsStore } from '~/stores/settingsStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '~/components/ui/dropdown-menu'

interface Skill {
  name: string
  description: string
  path: string
  directory: string
}

interface MCPServerState {
  config: { name: string }
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  tools: Array<{ name: string; description?: string }>
}

// 内置工具分组
const TOOL_GROUPS: Record<string, string[]> = {
  File: ['Read', 'Write', 'Edit', 'LS', 'Glob', 'Grep'],
  Git: [
    'GitStatus',
    'GitDiff',
    'GitLog',
    'GitCommit',
    'GitPush',
    'GitCheckout',
  ],
  Web: ['WebFetch', 'WebSearch'],
  Other: ['Bash', 'TodoWrite'],
}

export function ToolsSkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [mcpServers, setMcpServers] = useState<MCPServerState[]>([])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const { selectedSkill, setSelectedSkill } = useSettingsStore()

  // 加载 skills
  const loadSkills = useCallback(async () => {
    try {
      const data = await dbClient.skills.getAll()
      setSkills(data || [])
    } catch (error) {
      console.error('Failed to load skills:', error)
    }
  }, [])

  // 加载 MCP 状态
  useEffect(() => {
    loadSkills()
    const loadMcp = async () => {
      try {
        const states = await dbClient.mcp.getServerStates()
        setMcpServers(states || [])
      } catch (error) {
        console.error('Failed to load MCP states:', error)
      }
    }
    loadMcp()

    const interval = setInterval(() => {
      loadSkills()
      loadMcp()
    }, 10000)
    return () => clearInterval(interval)
  }, [loadSkills])

  // 监听 skills 更新事件
  useEffect(() => {
    const handler = () => loadSkills()
    window.addEventListener('skills-updated', handler)
    return () => window.removeEventListener('skills-updated', handler)
  }, [loadSkills])

  const mcpToolsCount = mcpServers.reduce((sum, s) => sum + s.tools.length, 0)
  const builtinCount = Object.values(TOOL_GROUPS).flat().length
  const totalTools = builtinCount + mcpToolsCount

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  const currentSkillName = selectedSkill
    ? skills.find(s => s.path === selectedSkill)?.name || 'Selected'
    : 'Auto'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <button className="flex items-center gap-1.5 px-2 py-1 rounded text-sm hover:bg-[hsl(var(--surface-2))] text-[hsl(var(--text-muted))] transition-colors">
          <Zap className="w-4 h-4" />
          <span>
            {totalTools} tools · Skill: {currentSkillName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 max-h-80 overflow-y-auto"
      >
        {/* Tools 区域 */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
            Tools ({totalTools})
          </DropdownMenuLabel>

          {/* 内置工具分组 */}
          {Object.entries(TOOL_GROUPS).map(([group, tools]) => (
            <div key={group}>
              <button
                onClick={() => toggleGroup(group)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-xs cursor-pointer hover:bg-[hsl(var(--surface-2))] transition-colors"
              >
                <span>
                  {group} ({tools.length})
                </span>
                <ChevronRight
                  className={`w-3 h-3 transition-transform ${expandedGroups.has(group) ? 'rotate-90' : ''}`}
                />
              </button>
              {expandedGroups.has(group) &&
                tools.map(tool => (
                  <div
                    key={tool}
                    className="pl-6 py-1 text-xs text-[hsl(var(--text-muted))]"
                  >
                    {tool}
                  </div>
                ))}
            </div>
          ))}

          {/* MCP 工具分组 */}
          {mcpServers.map(server => {
            const groupKey = `mcp-${server.config.name}`
            const isConnected = server.status === 'connected'
            const statusDot = isConnected
              ? 'bg-green-500'
              : server.status === 'connecting'
                ? 'bg-yellow-500'
                : 'bg-red-400'
            return (
              <div key={server.config.name}>
                <button
                  onClick={() => toggleGroup(groupKey)}
                  className="flex items-center justify-between w-full px-2 py-1.5 text-xs cursor-pointer hover:bg-[hsl(var(--surface-2))] transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                    MCP: {server.config.name} ({server.tools.length})
                  </span>
                  <ChevronRight
                    className={`w-3 h-3 transition-transform ${expandedGroups.has(groupKey) ? 'rotate-90' : ''}`}
                  />
                </button>
                {expandedGroups.has(groupKey) &&
                  server.tools.map(tool => (
                    <div
                      key={tool.name}
                      className="pl-6 py-1 text-xs text-[hsl(var(--text-muted))]"
                    >
                      {tool.name}
                    </div>
                  ))}
              </div>
            )
          })}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Skills 区域 */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs uppercase text-muted-foreground">
            Skills
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => setSelectedSkill(null)}
            className="flex items-center justify-between cursor-pointer text-xs"
          >
            <span>Auto (AI chooses)</span>
            {!selectedSkill && <Check className="w-3 h-3 text-primary" />}
          </DropdownMenuItem>
          {skills.map(skill => (
            <DropdownMenuItem
              key={skill.path}
              onClick={() => setSelectedSkill(skill.path)}
              className="flex items-center justify-between cursor-pointer text-xs"
            >
              <span className="truncate max-w-[200px]">{skill.name}</span>
              {selectedSkill === skill.path && (
                <Check className="w-3 h-3 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
          {skills.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-[hsl(var(--text-muted))]">
              No skills available
            </div>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

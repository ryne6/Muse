import { useState, useEffect, useCallback } from 'react'
import { Plus, Power, Trash2, Server, RefreshCw } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { dbClient } from '~/services/dbClient'
import { notify } from '~/utils/notify'
import { cn } from '~/utils/cn'

interface MCPServer {
  id: string
  name: string
  command: string
  args?: string[] | null
  env?: Record<string, string> | null
  enabled: boolean
}

interface MCPServerState {
  config: { name: string }
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  tools: Array<{ name: string }>
  error?: string
}

// Helper to parse args that could be string (old data) or array (new data)
const parseArgs = (args: string[] | string | null | undefined): string[] => {
  if (!args) return []
  if (Array.isArray(args)) return args
  try {
    return JSON.parse(args)
  } catch {
    return []
  }
}

export function MCPSettings() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [serverStates, setServerStates] = useState<MCPServerState[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [newServer, setNewServer] = useState({
    name: '',
    command: '',
    args: '',
  })

  const loadServers = async () => {
    try {
      const data = await dbClient.mcp.getAll()
      setServers(data || [])
    } catch (error) {
      console.error('Failed to load MCP servers:', error)
    }
  }

  const loadServerStates = useCallback(async () => {
    try {
      const states = await dbClient.mcp.getServerStates()
      setServerStates(states || [])
    } catch (error) {
      console.error('Failed to load MCP server states:', error)
    }
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadServerStates()
    setIsRefreshing(false)
  }

  // Get status for a server by name
  const getServerState = (name: string) => {
    return serverStates.find(s => s.config.name === name)
  }

  useEffect(() => {
    loadServers()
    loadServerStates()
    // Auto-refresh status every 5 seconds
    const interval = setInterval(loadServerStates, 5000)
    return () => clearInterval(interval)
  }, [loadServerStates])

  const handleAdd = async () => {
    if (!newServer.name || !newServer.command) {
      notify.error('Name and command are required')
      return
    }

    try {
      const args = newServer.args
        ? newServer.args.split(' ').filter(Boolean)
        : undefined

      await dbClient.mcp.create({
        name: newServer.name,
        command: newServer.command,
        args,
        enabled: true,
      })

      notify.success(`MCP server "${newServer.name}" added`)
      setNewServer({ name: '', command: '', args: '' })
      setIsAdding(false)
      loadServers()
      // Wait a bit for connection to establish, then refresh states
      setTimeout(loadServerStates, 1000)
    } catch (error) {
      console.error('Failed to add MCP server:', error)
      notify.error('Failed to add MCP server')
    }
  }

  const handleToggle = async (server: MCPServer) => {
    try {
      await dbClient.mcp.toggleEnabled(server.id)
      notify.success(
        `${server.name} ${server.enabled ? 'disabled' : 'enabled'}`
      )
      loadServers()
      // Wait a bit for connection change, then refresh states
      setTimeout(loadServerStates, 1000)
    } catch (error) {
      console.error('Failed to toggle MCP server:', error)
      notify.error('Failed to update MCP server')
    }
  }

  const handleDelete = async (server: MCPServer) => {
    if (!confirm(`Delete MCP server "${server.name}"?`)) return

    try {
      await dbClient.mcp.delete(server.id)
      notify.success(`${server.name} deleted`)
      loadServers()
    } catch (error) {
      console.error('Failed to delete MCP server:', error)
      notify.error('Failed to delete MCP server')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">MCP Servers</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn('h-4 w-4 mr-1', isRefreshing && 'animate-spin')}
            />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Server
          </Button>
        </div>
      </div>

      {isAdding && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
          <Input
            placeholder="Server name (e.g., filesystem)"
            value={newServer.name}
            onChange={e => setNewServer({ ...newServer, name: e.target.value })}
          />
          <Input
            placeholder="Command (e.g., npx)"
            value={newServer.command}
            onChange={e =>
              setNewServer({ ...newServer, command: e.target.value })
            }
          />
          <Input
            placeholder="Arguments (space-separated, e.g., -y @anthropic/mcp-server-filesystem)"
            value={newServer.args}
            onChange={e => setNewServer({ ...newServer, args: e.target.value })}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>
              Add
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {servers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Server className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No MCP servers configured</p>
          <p className="text-sm">Add a server to extend AI capabilities</p>
        </div>
      ) : (
        <div className="space-y-2">
          {servers.map(server => {
            const state = getServerState(server.name)
            const status = state?.status || 'disconnected'
            const toolCount = state?.tools?.length || 0
            const error = state?.error

            return (
              <div
                key={server.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  server.enabled ? 'bg-background' : 'bg-muted/40 opacity-60'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{server.name}</span>
                    {/* Status indicator */}
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        status === 'connected' &&
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                        status === 'connecting' &&
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                        status === 'error' &&
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                        status === 'disconnected' &&
                          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      )}
                    >
                      {status === 'connected' && `${toolCount} tools`}
                      {status === 'connecting' && 'Connecting...'}
                      {status === 'error' && 'Error'}
                      {status === 'disconnected' && 'Disconnected'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {server.command} {parseArgs(server.args).join(' ')}
                  </div>
                  {error && (
                    <div
                      className="text-xs text-red-500 mt-1 truncate"
                      title={error}
                    >
                      {error}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleDelete(server)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={server.enabled ? 'default' : 'outline'}
                    onClick={() => handleToggle(server)}
                  >
                    <Power className="h-3 w-3 mr-1" />
                    {server.enabled ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

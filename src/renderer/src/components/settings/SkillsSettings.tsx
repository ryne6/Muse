import { useState, useEffect, useCallback } from 'react'
import { Plus, Power, Trash2, FolderOpen, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dbClient } from '@/services/dbClient'
import { notify } from '@/utils/notify'
import { cn } from '@/utils/cn'

interface SkillsDirectory {
  id: string
  path: string
  enabled: boolean
  createdAt: Date
}

export function SkillsSettings() {
  const [directories, setDirectories] = useState<SkillsDirectory[]>([])
  const [skillCounts, setSkillCounts] = useState<Record<string, number>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadDirectories = useCallback(async () => {
    try {
      const data = await dbClient.skills.getDirectories()
      setDirectories(data || [])

      // Load skill counts for each directory
      const counts: Record<string, number> = {}
      for (const dir of data || []) {
        try {
          counts[dir.id] = await dbClient.skills.getCount(dir.path)
        } catch {
          counts[dir.id] = 0
        }
      }
      setSkillCounts(counts)
    } catch (error) {
      console.error('Failed to load skills directories:', error)
    }
  }, [])

  useEffect(() => {
    loadDirectories()
  }, [loadDirectories])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadDirectories()
    setIsRefreshing(false)
  }

  const handleSelectDirectory = async () => {
    try {
      const path = await window.api.dialog.selectDirectory()
      if (path) {
        await dbClient.skills.addDirectory(path)
        notify.success(`Skills directory added: ${path}`)
        loadDirectories()
        window.dispatchEvent(new CustomEvent('skills-updated'))
      }
    } catch (error) {
      console.error('Failed to add skills directory:', error)
      notify.error('Failed to add directory')
    }
  }

  const handleToggle = async (dir: SkillsDirectory) => {
    try {
      await dbClient.skills.toggleDirectory(dir.id)
      notify.success(`${dir.path} ${dir.enabled ? 'disabled' : 'enabled'}`)
      loadDirectories()
      window.dispatchEvent(new CustomEvent('skills-updated'))
    } catch (error) {
      console.error('Failed to toggle skills directory:', error)
      notify.error('Failed to update directory')
    }
  }

  const handleDelete = async (dir: SkillsDirectory) => {
    if (!confirm(`Remove skills directory "${dir.path}"?`)) return

    try {
      await dbClient.skills.removeDirectory(dir.id)
      notify.success(`Directory removed: ${dir.path}`)
      loadDirectories()
      window.dispatchEvent(new CustomEvent('skills-updated'))
    } catch (error) {
      console.error('Failed to remove skills directory:', error)
      notify.error('Failed to remove directory')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Skills Directories</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-1", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleSelectDirectory}>
            <Plus className="h-4 w-4 mr-1" />
            Add Directory
          </Button>
        </div>
      </div>

      {directories.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No skills directories configured</p>
          <p className="text-sm">Add a directory to load skills (e.g., ~/.claude)</p>
        </div>
      ) : (
        <div className="space-y-2">
          {directories.map((dir) => (
            <div
              key={dir.id}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border',
                dir.enabled ? 'bg-background' : 'bg-muted/40 opacity-60'
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{dir.path}</span>
                  <span className="text-xs text-muted-foreground">
                    ({skillCounts[dir.id] || 0} skills)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => handleDelete(dir)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={dir.enabled ? 'default' : 'outline'}
                  onClick={() => handleToggle(dir)}
                >
                  <Power className="h-3 w-3 mr-1" />
                  {dir.enabled ? 'On' : 'Off'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

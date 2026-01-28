import { useState, useEffect } from 'react'
import { Folder, X } from 'lucide-react'
import { Button } from '../ui/button'

export function WorkspaceSelector() {
  const [workspace, setWorkspace] = useState<string | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)

  useEffect(() => {
    loadWorkspace()
  }, [])

  const loadWorkspace = async () => {
    if (window.api) {
      const result = await window.api.workspace.get()
      setWorkspace(result.path)
    }
  }

  const handleSelect = async () => {
    if (!window.api) {
      console.error('API not available')
      return
    }

    setIsSelecting(true)
    try {
      const result = await window.api.workspace.select()
      if (result.path) {
        setWorkspace(result.path)
      }
    } catch (error) {
      console.error('Failed to select workspace:', error)
    } finally {
      setIsSelecting(false)
    }
  }

  const handleClear = async () => {
    if (window.api) {
      await window.api.workspace.set('')
      setWorkspace(null)
    }
  }

  return (
    <div className="border-t px-4 py-3 bg-secondary/50">
      {workspace ? (
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Workspace</div>
            <div className="text-sm truncate" title={workspace}>
              {workspace.split('/').pop() || workspace}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={handleClear}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleSelect}
          disabled={isSelecting}
        >
          <Folder className="w-4 h-4" />
          {isSelecting ? 'Selecting...' : 'Select Workspace'}
        </Button>
      )}
    </div>
  )
}

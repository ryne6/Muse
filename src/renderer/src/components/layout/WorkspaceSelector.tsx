import { useEffect } from 'react'
import { Folder, X } from 'lucide-react'
import { Button } from '../ui/button'
import { useWorkspaceStore } from '~/stores/workspaceStore'

export function WorkspaceSelector() {
  const {
    workspacePath,
    isSelecting,
    loadWorkspace,
    selectWorkspace,
    clearWorkspace,
  } = useWorkspaceStore()

  useEffect(() => {
    loadWorkspace()
  }, [loadWorkspace])

  return (
    <div className="border-t px-4 py-3 bg-secondary/50">
      {workspacePath ? (
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Workspace</div>
            <div className="text-sm truncate" title={workspacePath}>
              {workspacePath.split('~main/').pop() || workspacePath}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={clearWorkspace}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={selectWorkspace}
          disabled={isSelecting}
        >
          <Folder className="w-4 h-4" />
          {isSelecting ? 'Selecting...' : 'Select Workspace'}
        </Button>
      )}
    </div>
  )
}

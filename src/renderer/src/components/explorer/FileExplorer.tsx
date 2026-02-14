import { useState, useEffect } from 'react'
import { Folder, RefreshCw } from 'lucide-react'
import { FileTree } from './FileTree'
import type { FileNode } from './FileTreeItem'
import { Button } from '../ui/button'
import { cn } from '~/utils/cn'
import { useWorkspaceStore } from '~/stores/workspaceStore'

export function FileExplorer() {
  const { workspacePath, loadWorkspace } = useWorkspaceStore()
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  // Load workspace path on mount
  useEffect(() => {
    loadWorkspace()
  }, [loadWorkspace])

  // Load file tree when workspace changes
  useEffect(() => {
    if (workspacePath) {
      loadFileTree(workspacePath)
    }
  }, [workspacePath])

  const loadFileTree = async (path: string) => {
    setIsLoading(true)
    try {
      const result = await window.api.fs.listFiles(path)
      const nodes: FileNode[] = result.files.map(file => ({
        name: file.name,
        path: file.path,
        isDirectory: file.isDirectory,
        size: file.size,
        modifiedTime: file.modifiedTime,
      }))
      setFileTree(nodes)
    } catch (error) {
      console.error('Failed to load file tree:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (path: string) => {
    const newExpanded = new Set(expandedFolders)

    if (newExpanded.has(path)) {
      // Collapse
      newExpanded.delete(path)
    } else {
      // Expand - load children
      newExpanded.add(path)
      await loadFolderChildren(path)
    }

    setExpandedFolders(newExpanded)
  }

  const loadFolderChildren = async (folderPath: string) => {
    try {
      const result = await window.api.fs.listFiles(folderPath)
      const children: FileNode[] = result.files.map(file => ({
        name: file.name,
        path: file.path,
        isDirectory: file.isDirectory,
        size: file.size,
        modifiedTime: file.modifiedTime,
      }))

      // Update the file tree with children
      setFileTree(prevTree =>
        updateTreeWithChildren(prevTree, folderPath, children)
      )
    } catch (error) {
      console.error('Failed to load folder children:', error)
    }
  }

  const updateTreeWithChildren = (
    nodes: FileNode[],
    targetPath: string,
    children: FileNode[]
  ): FileNode[] => {
    return nodes.map(node => {
      if (node.path === targetPath) {
        return { ...node, children }
      }
      if (node.children) {
        return {
          ...node,
          children: updateTreeWithChildren(node.children, targetPath, children),
        }
      }
      return node
    })
  }

  const handleSelect = (path: string, isDirectory: boolean) => {
    setSelectedPath(path)
    console.log('Selected:', path, 'isDirectory:', isDirectory)
    // TODO: 可以在这里触发文件预览或其他操作
  }

  const handleRefresh = () => {
    if (workspacePath) {
      setExpandedFolders(new Set())
      loadFileTree(workspacePath)
    }
  }

  if (!workspacePath) {
    return (
      <div className="w-70 bg-secondary/30 border-l flex items-center justify-center p-6">
        <div className="text-center">
          <Folder className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No workspace selected</p>
          <p className="text-xs text-muted-foreground mt-1">
            Select a folder to browse files
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-70 bg-secondary/30 border-l flex flex-col">
      {/* Header */}
      <div className="p-3 border-b bg-background/50 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Folder className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium truncate" title={workspacePath}>
            {workspacePath.split('~main/').pop()}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={handleRefresh}
          disabled={isLoading}
          aria-label="Refresh file tree"
        >
          <RefreshCw className={cn('w-3 h-3', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-hidden">
        {isLoading && fileTree.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : (
          <FileTree
            nodes={fileTree}
            onToggle={handleToggle}
            onSelect={handleSelect}
            selectedPath={selectedPath || undefined}
          />
        )}
      </div>
    </div>
  )
}

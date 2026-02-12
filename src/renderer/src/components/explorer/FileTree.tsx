import { FileTreeItem, type FileNode } from './FileTreeItem'

interface FileTreeProps {
  nodes: FileNode[]
  onToggle?: (path: string) => void
  onSelect?: (path: string, isDirectory: boolean) => void
  selectedPath?: string
}

export function FileTree({
  nodes,
  onToggle,
  onSelect,
  selectedPath,
}: FileTreeProps) {
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No files found
      </div>
    )
  }

  return (
    <div className="overflow-y-auto">
      {nodes.map(node => (
        <FileTreeItem
          key={node.path}
          node={node}
          level={0}
          onToggle={onToggle}
          onSelect={onSelect}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  )
}

import { useState } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { FileIcon } from './FileIcon'
import { cn } from '@/utils/cn'

export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  size?: number
  modifiedTime?: number
  children?: FileNode[]
}

interface FileTreeItemProps {
  node: FileNode
  level: number
  onToggle?: (path: string) => void
  onSelect?: (path: string, isDirectory: boolean) => void
  selectedPath?: string
}

export function FileTreeItem({
  node,
  level,
  onToggle,
  onSelect,
  selectedPath,
}: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.isDirectory) {
      setIsExpanded(!isExpanded)
      onToggle?.(node.path)
    }
  }

  const handleSelect = () => {
    onSelect?.(node.path, node.isDirectory)
  }

  const isSelected = selectedPath === node.path

  return (
    <div>
      {/* Current Item */}
      <div
        className={cn(
          'flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-accent transition-colors',
          isSelected && 'bg-primary/10 border-l-2 border-primary'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Icon */}
        {node.isDirectory && (
          <button
            onClick={handleToggle}
            className="flex-shrink-0 hover:bg-accent rounded p-0.5"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}

        {/* File Icon */}
        <FileIcon
          fileName={node.name}
          isDirectory={node.isDirectory}
          isExpanded={isExpanded}
        />

        {/* File Name */}
        <span className="text-sm truncate flex-1">{node.name}</span>
      </div>

      {/* Children (if expanded) */}
      {node.isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  )
}

import {
  FileText,
  FileJson,
  FileCode,
  Image,
  File,
  Folder,
  FolderOpen,
} from 'lucide-react'

interface FileIconProps {
  fileName: string
  isDirectory: boolean
  isExpanded?: boolean
}

export function FileIcon({ fileName, isDirectory, isExpanded }: FileIconProps) {
  if (isDirectory) {
    return isExpanded ? (
      <FolderOpen className="w-4 h-4 text-primary" />
    ) : (
      <Folder className="w-4 h-4 text-primary" />
    )
  }

  const ext = fileName.split('.').pop()?.toLowerCase()

  // TypeScript/JavaScript
  if (ext === 'ts' || ext === 'tsx') {
    return <FileCode className="w-4 h-4 text-blue-500" />
  }
  if (ext === 'js' || ext === 'jsx') {
    return <FileCode className="w-4 h-4 text-yellow-500" />
  }

  // JSON
  if (ext === 'json') {
    return <FileJson className="w-4 h-4 text-yellow-600" />
  }

  // Markdown
  if (ext === 'md' || ext === 'mdx') {
    return <FileText className="w-4 h-4 text-blue-600" />
  }

  // Images
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) {
    return <Image className="w-4 h-4 text-purple-500" />
  }

  // CSS/SCSS
  if (['css', 'scss', 'sass', 'less'].includes(ext || '')) {
    return <FileCode className="w-4 h-4 text-pink-500" />
  }

  // HTML
  if (ext === 'html') {
    return <FileCode className="w-4 h-4 text-orange-500" />
  }

  // Default
  return <File className="w-4 h-4 text-muted-foreground" />
}

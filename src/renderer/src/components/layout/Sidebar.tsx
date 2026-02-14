interface SidebarHeaderProps {
  showText: boolean
}

// traffic lights 拖拽区域，不显示 logo 和标题
export function SidebarHeader({ showText: _showText }: SidebarHeaderProps) {
  return (
    <div
      className="h-10 mt-2 flex-shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    />
  )
}

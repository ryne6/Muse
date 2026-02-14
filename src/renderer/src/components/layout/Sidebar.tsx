import logoImage from '~/assets/providers/logo.png'

interface SidebarHeaderProps {
  showText: boolean
}

export function SidebarHeader({ showText }: SidebarHeaderProps) {
  return (
    <div
      className="flex items-center px-4 h-12 mt-6 overflow-hidden"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <img
        src={logoImage}
        alt="Muse"
        className="w-6 h-6 rounded flex-shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      />
      <span
        className="ml-2 text-[17px] font-semibold text-foreground whitespace-nowrap transition-opacity duration-200"
        style={
          {
            opacity: showText ? 1 : 0,
            width: showText ? 'auto' : 0,
            overflow: 'hidden',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties
        }
      >
        Muse
      </span>
    </div>
  )
}

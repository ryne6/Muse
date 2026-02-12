import * as React from 'react'

import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuPositioner,
  DropdownMenuPopup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  type DropdownMenuPlacement,
} from '@lobehub/ui'

// Re-export atoms directly
const DropdownMenu = DropdownMenuRoot

// Alias for backward compat
const DropdownMenuLabel = DropdownMenuGroupLabel

// Wrapper that composes Portal + Positioner + Popup into a single component
interface DropdownMenuContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}

function DropdownMenuContent({
  children,
  className,
  align,
  sideOffset,
}: DropdownMenuContentProps) {
  const placementMap: Record<string, DropdownMenuPlacement> = {
    start: 'bottomLeft',
    center: 'bottom',
    end: 'bottomRight',
  }
  const placement = placementMap[align ?? 'start']

  return (
    <DropdownMenuPortal>
      <DropdownMenuPositioner
        placement={placement}
        sideOffset={sideOffset}
      >
        <DropdownMenuPopup className={className}>
          {children}
        </DropdownMenuPopup>
      </DropdownMenuPositioner>
    </DropdownMenuPortal>
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
}

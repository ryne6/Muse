import { Loader2 } from 'lucide-react'
import { useLoadingStore } from '@/stores/loadingStore'

interface LoadingInlineProps {
  label?: string
  className?: string
}

export function LoadingOverlay() {
  const { global } = useLoadingStore()

  if (!global) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="flex items-center gap-2 rounded-lg bg-background px-4 py-3 shadow">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading</span>
      </div>
    </div>
  )
}

export function LoadingInline({ label = 'Loading...', className }: LoadingInlineProps) {
  return (
    <div className={className || 'flex items-center justify-center p-4'}>
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="ml-2 text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

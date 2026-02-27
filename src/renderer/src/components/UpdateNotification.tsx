import { useState, useEffect } from 'react'
import { Download, X, RefreshCw } from 'lucide-react'

interface UpdateStatus {
  status:
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error'
  version?: string
  progress?: number
  error?: string
}

export function UpdateNotification() {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!window.api?.updater?.onStatus) return

    const unsubscribe = window.api.updater.onStatus(
      (newStatus: UpdateStatus) => {
        setStatus(newStatus)
        if (
          newStatus.status === 'available' ||
          newStatus.status === 'downloaded'
        ) {
          setDismissed(false)
        }
      }
    )

    return unsubscribe
  }, [])

  const handleDownload = async () => {
    await window.api?.updater?.download()
  }

  const handleInstall = () => {
    window.api?.updater?.install()
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  // Don't show if dismissed or no relevant status
  if (dismissed || !status) return null
  if (status.status === 'not-available' || status.status === 'checking')
    return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[hsl(var(--border))] rounded-2xl shadow-[var(--glass-shadow)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {status.status === 'downloading' ? (
              <RefreshCw className="w-5 h-5 text-[hsl(var(--primary))] animate-spin" />
            ) : status.status === 'error' ? (
              <Download className="w-5 h-5 text-[hsl(var(--destructive))]" />
            ) : (
              <Download className="w-5 h-5 text-[hsl(var(--primary))]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {status.status === 'available' && (
              <>
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  发现新版本
                </p>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  v{status.version} 已可下载
                </p>
                <button
                  onClick={handleDownload}
                  className="mt-2 px-3 py-1.5 text-xs font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:opacity-90 transition-opacity"
                >
                  下载更新
                </button>
              </>
            )}

            {status.status === 'downloading' && (
              <>
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  正在下载更新...
                </p>
                <div className="mt-2 w-full bg-[hsl(var(--surface-2))] rounded-full h-1.5">
                  <div
                    className="bg-[hsl(var(--primary))] h-1.5 rounded-full transition-all"
                    style={{ width: `${status.progress || 0}%` }}
                  />
                </div>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  {status.progress}%
                </p>
              </>
            )}

            {status.status === 'downloaded' && (
              <>
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                  更新已就绪
                </p>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  重启以应用 v{status.version}
                </p>
                <button
                  onClick={handleInstall}
                  className="mt-2 px-3 py-1.5 text-xs font-medium bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-lg hover:opacity-90 transition-opacity"
                >
                  立即重启
                </button>
              </>
            )}

            {status.status === 'error' && (
              <>
                <p className="text-sm font-medium text-[hsl(var(--destructive))]">
                  更新失败
                </p>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  {status.error}
                </p>
              </>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-[hsl(var(--surface-2))] rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-[hsl(var(--text-muted))]" />
          </button>
        </div>
      </div>
    </div>
  )
}

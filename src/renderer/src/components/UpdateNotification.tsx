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
      <div className="bg-[hsl(var(--bg-main))] border border-[hsl(var(--border))] rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {status.status === 'downloading' ? (
              <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
            ) : (
              <Download className="w-5 h-5 text-green-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {status.status === 'available' && (
              <>
                <p className="text-sm font-medium">New version available</p>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  Version {status.version} is ready to download
                </p>
                <button
                  onClick={handleDownload}
                  className="mt-2 px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Download Update
                </button>
              </>
            )}

            {status.status === 'downloading' && (
              <>
                <p className="text-sm font-medium">Downloading update...</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
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
                <p className="text-sm font-medium">Update ready</p>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  Restart to apply version {status.version}
                </p>
                <button
                  onClick={handleInstall}
                  className="mt-2 px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  Restart Now
                </button>
              </>
            )}

            {status.status === 'error' && (
              <>
                <p className="text-sm font-medium text-red-500">
                  Update failed
                </p>
                <p className="text-xs text-[hsl(var(--text-muted))] mt-1">
                  {status.error}
                </p>
              </>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-[hsl(var(--surface-2))] rounded"
          >
            <X className="w-4 h-4 text-[hsl(var(--text-muted))]" />
          </button>
        </div>
      </div>
    </div>
  )
}

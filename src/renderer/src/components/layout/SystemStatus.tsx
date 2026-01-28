import { useEffect, useState } from 'react'
import { Activity, AlertCircle, CheckCircle } from 'lucide-react'

export function SystemStatus() {
  const [isServerHealthy, setIsServerHealthy] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    checkServerHealth()
    // Check every 30 seconds
    const interval = setInterval(checkServerHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkServerHealth = async () => {
    setIsChecking(true)
    try {
      const healthy = await window.api.ipc.invoke('check-server-health')
      setIsServerHealthy(healthy)
    } catch (error) {
      setIsServerHealthy(false)
    } finally {
      setIsChecking(false)
    }
  }

  if (isChecking && isServerHealthy === null) {
    return null // Don't show anything while first check is in progress
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs">
      {isServerHealthy ? (
        <>
          <CheckCircle className="h-3 w-3 text-green-600" />
          <span className="text-muted-foreground">API Server Active</span>
        </>
      ) : (
        <>
          <AlertCircle className="h-3 w-3 text-red-600" />
          <span className="text-destructive">API Server Offline</span>
        </>
      )}
      {isChecking && <Activity className="h-3 w-3 animate-pulse" />}
    </div>
  )
}

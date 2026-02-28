import { useState, useEffect, useCallback } from 'react'
import {
  Globe,
  LogIn,
  Trash2,
  CheckCircle,
  XCircle,
  HelpCircle,
} from 'lucide-react'
import { useSettingsStore } from '~/stores/settingsStore'

type SessionStatus = 'logged_in' | 'logged_out' | 'unknown'

export function WebSearchSettings() {
  const webSearchEngine = useSettingsStore(s => s.webSearchEngine)
  const setWebSearchEngine = useSettingsStore(s => s.setWebSearchEngine)
  const [status, setStatus] = useState<SessionStatus>('unknown')

  const fetchStatus = useCallback(async () => {
    try {
      const res = await window.api.web.sessionStatus()
      setStatus(res.status)
    } catch {
      setStatus('unknown')
    }
  }, [])

  // 轮询 session 状态
  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 30000)
    return () => clearInterval(id)
  }, [fetchStatus])

  const handleLogin = useCallback(async () => {
    await window.api.web.openLogin(webSearchEngine)
  }, [webSearchEngine])

  const handleClear = useCallback(async () => {
    await window.api.web.clearSession()
    fetchStatus()
  }, [fetchStatus])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Web Search</h2>
        <p className="text-sm text-muted-foreground mt-1">
          配置搜索引擎和登录状态
        </p>
      </div>

      {/* 搜索引擎选择 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">搜索引擎</label>
        <div className="flex gap-3">
          {(['google', 'bing'] as const).map(engine => (
            <button
              key={engine}
              onClick={() => setWebSearchEngine(engine)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                webSearchEngine === engine
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              <Globe className="w-4 h-4" />
              {engine === 'google' ? 'Google' : 'Bing'}
            </button>
          ))}
        </div>
      </div>

      {/* Session 状态卡片 */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIndicator status={status} />
            <span className="text-sm font-medium">
              {status === 'logged_in' && 'Active'}
              {status === 'logged_out' && 'Expired'}
              {status === 'unknown' && 'Not configured'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border hover:bg-accent transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Login
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusIndicator({ status }: { status: SessionStatus }) {
  if (status === 'logged_in')
    return <CheckCircle className="w-4 h-4 text-green-500" />
  if (status === 'logged_out')
    return <XCircle className="w-4 h-4 text-red-500" />
  return <HelpCircle className="w-4 h-4 text-muted-foreground" />
}

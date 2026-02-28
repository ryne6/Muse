import { BrowserWindow, session } from 'electron'

export interface WebSearchResult {
  title: string
  url: string
  snippet?: string
}

// 串行锁：防止并发搜索
let searchQueue: Promise<unknown> = Promise.resolve()
let lastSearchTime = 0

// 构造真实 UA
const chromeVersion = process.versions.chrome || '120.0.0.0'
const UA = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`

const SESSION = 'persist:websearch'

function getSession() {
  return session.fromPartition(SESSION)
}

// 随机延迟 2-10s
function randomDelay(): Promise<void> {
  const ms = 2000 + Math.random() * 8000
  return new Promise(r => setTimeout(r, ms))
}

// 创建隐藏窗口
function createHiddenWindow(): BrowserWindow {
  return new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: {
      partition: SESSION,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  })
}

export class WebBrowserService {
  // 可见窗口，用户手动登录
  static async openLoginWindow(
    engine: 'google' | 'bing'
  ): Promise<void> {
    const url =
      engine === 'google'
        ? 'https://accounts.google.com'
        : 'https://login.live.com'

    const win = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        partition: SESSION,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
      },
    })

    win.webContents.setUserAgent(UA)
    await win.loadURL(url)

    return new Promise<void>(resolve => {
      win.on('closed', () => resolve())
    })
  }

  // 隐藏窗口 + 串行锁搜索
  static async search(
    query: string,
    options?: {
      engine?: 'google' | 'bing'
      limit?: number
      recencyDays?: number
      domains?: string[]
    }
  ): Promise<WebSearchResult[]> {
    const task = searchQueue.then(() => this._doSearch(query, options))
    searchQueue = task.catch(() => {})
    return task
  }

  private static async _doSearch(
    query: string,
    options?: {
      engine?: 'google' | 'bing'
      limit?: number
      recencyDays?: number
      domains?: string[]
    }
  ): Promise<WebSearchResult[]> {
    // 随机延迟防止频率过高
    const elapsed = Date.now() - lastSearchTime
    if (elapsed < 2000) await randomDelay()

    const engine = options?.engine || 'google'
    const limit = options?.limit || 5
    const win = createHiddenWindow()
    win.webContents.setUserAgent(UA)

    try {
      const url = this.buildSearchUrl(
        query,
        engine,
        limit,
        options?.recencyDays,
        options?.domains
      )
      await win.loadURL(url)
      // 等待页面渲染
      await new Promise(r => setTimeout(r, 2000))

      const results: WebSearchResult[] =
        engine === 'bing'
          ? await this.extractBing(win, limit)
          : await this.extractGoogle(win, limit)

      lastSearchTime = Date.now()
      return results
    } finally {
      win.destroy()
    }
  }

  private static buildSearchUrl(
    query: string,
    engine: 'google' | 'bing',
    limit: number,
    recencyDays?: number,
    domains?: string[]
  ): string {
    // 域名过滤拼入 query
    let q = query
    if (domains && domains.length > 0) {
      const siteFilter = domains.map(d => `site:${d}`).join(' OR ')
      q = `${query} ${siteFilter}`
    }

    if (engine === 'bing') {
      const url = new URL('https://www.bing.com/search')
      url.searchParams.set('q', q)
      url.searchParams.set('count', String(limit))
      return url.toString()
    }

    // Google
    const url = new URL('https://www.google.com/search')
    url.searchParams.set('q', q)
    url.searchParams.set('num', String(limit + 5))
    url.searchParams.set('hl', 'en')
    url.searchParams.set('pws', '0')

    if (recencyDays !== undefined) {
      if (recencyDays <= 1) url.searchParams.set('tbs', 'qdr:d')
      else if (recencyDays <= 7) url.searchParams.set('tbs', 'qdr:w')
      else if (recencyDays <= 30) url.searchParams.set('tbs', 'qdr:m')
      else url.searchParams.set('tbs', 'qdr:y')
    }

    return url.toString()
  }

  private static async extractGoogle(
    win: BrowserWindow,
    limit: number
  ): Promise<WebSearchResult[]> {
    return win.webContents.executeJavaScript(`
      Array.from(document.querySelectorAll('h3')).map(h3 => {
        const link = h3.closest('a')
        if (!link || link.href.includes('/aclk?') || link.href.includes('googleadservices')) return null
        const container = h3.closest('[data-hveid]') || h3.parentElement?.parentElement
        return {
          title: h3.textContent || '',
          url: link.href,
          snippet: container?.querySelector('[data-sncf]')?.textContent || ''
        }
      }).filter(Boolean).slice(0, ${limit})
    `)
  }

  private static async extractBing(
    win: BrowserWindow,
    limit: number
  ): Promise<WebSearchResult[]> {
    return win.webContents.executeJavaScript(`
      Array.from(document.querySelectorAll('li.b_algo')).map(el => ({
        title: el.querySelector('h2 a')?.textContent || '',
        url: el.querySelector('h2 a')?.href || '',
        snippet: el.querySelector('.b_caption p')?.textContent || ''
      })).slice(0, ${limit})
    `)
  }

  // 隐藏窗口抓取页面内容
  static async fetch(url: string, maxLength = 50000): Promise<string> {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('HTTP(S) only')
    }

    const win = createHiddenWindow()
    win.webContents.setUserAgent(UA)

    try {
      await win.loadURL(url)
      await new Promise(r => setTimeout(r, 2000))

      const text: string = await win.webContents.executeJavaScript(`
        document.body.innerText || document.body.textContent || ''
      `)
      return text.slice(0, maxLength)
    } finally {
      win.destroy()
    }
  }

  // 检查 Google cookie 有效性
  static async getSessionStatus(): Promise<
    'logged_in' | 'logged_out' | 'unknown'
  > {
    try {
      const cookies = await getSession().cookies.get({
        domain: '.google.com',
      })
      const hasSID = cookies.some(c => c.name === 'SID')
      return hasSID ? 'logged_in' : 'logged_out'
    } catch {
      return 'unknown'
    }
  }

  // 清除 session
  static async clearSession(): Promise<void> {
    await getSession().clearStorageData()
  }
}

import axios from 'axios'

export interface WebSearchResult {
  title: string
  url: string
  snippet?: string
}

export class WebService {
  async fetch(url: string, maxLength = 50000): Promise<string> {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') {
      throw new Error('HTTPS only')
    }

    const res = await axios.get(url, { timeout: 30000 })
    const content = typeof res.data === 'string'
      ? this.htmlToText(res.data)
      : JSON.stringify(res.data)

    return content.slice(0, maxLength)
  }

  async search(
    query: string,
    limit = 5,
    recencyDays?: number,
    domains?: string[]
  ): Promise<WebSearchResult[]> {
    const url = new URL('https://duckduckgo.com/html/')
    url.searchParams.set('q', query)

    if (recencyDays !== undefined) {
      if (recencyDays <= 1) url.searchParams.set('df', 'd')
      else if (recencyDays <= 7) url.searchParams.set('df', 'w')
      else if (recencyDays <= 30) url.searchParams.set('df', 'm')
      else url.searchParams.set('df', 'y')
    }

    const res = await axios.get(url.toString(), { timeout: 30000 })
    const html = typeof res.data === 'string' ? res.data : ''
    const results = this.parseResults(html, limit)

    if (domains && domains.length > 0) {
      const allowlist = domains.map((domain) => domain.toLowerCase())
      return results.filter((result) => {
        try {
          const host = new URL(result.url).hostname.toLowerCase()
          return allowlist.some((domain) => host === domain || host.endsWith(`.${domain}`))
        } catch {
          return false
        }
      })
    }

    return results
  }

  private parseResults(html: string, limit: number): WebSearchResult[] {
    const results: WebSearchResult[] = []
    const blockRegex = /<div[^>]*class="result__body"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g
    let match: RegExpExecArray | null

    while ((match = blockRegex.exec(html)) && results.length < limit) {
      const block = match[1]
      const linkMatch = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(block)
      if (!linkMatch) continue

      const url = this.decodeEntities(linkMatch[1])
      const title = this.htmlToText(linkMatch[2])
      const snippetMatch = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i.exec(block)
      const snippetRaw = snippetMatch ? (snippetMatch[1] || snippetMatch[2]) : ''
      const snippet = snippetRaw ? this.htmlToText(snippetRaw) : undefined

      results.push({ title, url, snippet })
    }

    return results
  }

  private decodeEntities(value: string): string {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

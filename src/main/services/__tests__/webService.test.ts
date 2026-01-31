import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import { WebService } from '../webService'

vi.mock('axios')

describe('WebService', () => {
  let service: WebService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new WebService()
  })

  it('should enforce HTTPS for fetch', async () => {
    await expect(service.fetch('http://example.com'))
      .rejects.toThrow('HTTPS only')
  })

  it('should strip HTML when fetching', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: '<html><body><h1>Title</h1><script>alert(1)</script></body></html>'
    })

    const result = await service.fetch('https://example.com')

    expect(result).toContain('Title')
    expect(result).not.toContain('alert')
  })

  it('should parse search results', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: `
        <div class="result">
          <div class="result__body">
            <a class="result__a" href="https://example.com">Example Title</a>
            <a class="result__snippet">Snippet text</a>
          </div>
        </div>
      `
    })

    const results = await service.search('test', 5)

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      title: 'Example Title',
      url: 'https://example.com',
      snippet: 'Snippet text'
    })
  })
})

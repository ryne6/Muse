import { describe, it, expect } from 'vitest'
import { parseCorsOrigins } from '../index'

describe('CORS origins', () => {
  it('should parse CORS origins from env', () => {
    const origins = parseCorsOrigins('http://a.com,http://b.com')
    expect(origins).toEqual(['http://a.com', 'http://b.com'])
  })
})

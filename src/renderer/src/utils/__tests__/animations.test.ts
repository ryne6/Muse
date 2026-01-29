import { describe, it, expect } from 'vitest'
import { fadeInUpClass } from '../animations'

describe('animations', () => {
  it('should expose fadeInUpClass', () => {
    expect(fadeInUpClass).toBeDefined()
  })
})

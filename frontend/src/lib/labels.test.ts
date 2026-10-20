import { describe, expect, it } from 'vitest'
import { humanize } from '@/lib/labels'

describe('humanize', () => {
  it('splits camel case into a sentence-case label', () => {
    expect(humanize('SportsCourt')).toBe('Sports court')
    expect(humanize('ClubPresident')).toBe('Club president')
  })

  it('leaves single words as they are', () => {
    expect(humanize('Gym')).toBe('Gym')
    expect(humanize('Any')).toBe('Any')
  })
})

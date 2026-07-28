import { describe, expect, it } from 'vitest'
import {
  validateContact,
  validateConnection,
  validateFavor,
  validateInteraction,
  validateEnum,
  validateIntRange,
  validateMaxLength,
  validateMultiEnum,
  validateTagsArray,
  MAX_TAGS_PER_ITEM,
} from '@/lib/validation'

describe('validateEnum', () => {
  it('accepts an allowed value and treats empty as unset', () => {
    expect(validateEnum('friend', ['friend', 'family'], 'type')).toBeNull()
    expect(validateEnum(undefined, ['friend'], 'type')).toBeNull()
    expect(validateEnum('', ['friend'], 'type')).toBeNull()
  })

  it('rejects anything outside the list', () => {
    expect(validateEnum('enemy', ['friend'], 'type')).toBe('Invalid type')
    expect(validateEnum(42, ['friend'], 'type')).toBe('Invalid type')
  })
})

describe('validateMultiEnum', () => {
  it('accepts a comma-separated list of allowed values', () => {
    expect(validateMultiEnum('direct, analytical', ['direct', 'analytical'], 'style')).toBeNull()
  })

  it('names the offending entry', () => {
    expect(validateMultiEnum('direct,loud', ['direct'], 'style')).toBe('Invalid style: loud')
  })
})

describe('validateIntRange', () => {
  it('accepts integers inside the range and rejects the rest', () => {
    expect(validateIntRange(3, 0, 5, 'rating')).toBeNull()
    expect(validateIntRange(0, 0, 5, 'rating')).toBeNull()
    expect(validateIntRange(6, 0, 5, 'rating')).toBe('rating must be integer 0-5')
    expect(validateIntRange(2.5, 0, 5, 'rating')).toBe('rating must be integer 0-5')
    expect(validateIntRange('3', 0, 5, 'rating')).toBe('rating must be integer 0-5')
  })

  it('treats null and undefined as unset', () => {
    expect(validateIntRange(null, 0, 5, 'rating')).toBeNull()
    expect(validateIntRange(undefined, 0, 5, 'rating')).toBeNull()
  })
})

describe('validateMaxLength', () => {
  it('enforces the limit', () => {
    expect(validateMaxLength('abc', 5, 'notes')).toBeNull()
    expect(validateMaxLength('abcdef', 5, 'notes')).toBe('notes must be 5 characters or less')
  })
})

describe('validateTagsArray', () => {
  it('rejects non-arrays and oversized lists', () => {
    expect(validateTagsArray('nope')).toBe('Invalid tags')
    expect(validateTagsArray(Array.from({ length: MAX_TAGS_PER_ITEM + 1 }, () => 'x'))).toContain('Too many')
  })

  it('accepts a reasonable list', () => {
    expect(validateTagsArray(['founder', 'lisbon'])).toBeNull()
  })
})

describe('validateContact', () => {
  it('requires a name when asked to', () => {
    expect(validateContact({})).toBe('Name is required')
    expect(validateContact({ name: '   ' })).toBe('Name is required')
    expect(validateContact({}, false)).toBeNull()
  })

  it('rejects an over-long name', () => {
    expect(validateContact({ name: 'x'.repeat(201) })).toContain('200 characters')
  })

  it('validates email shape', () => {
    expect(validateContact({ name: 'A', email: 'a@b.co' })).toBeNull()
    expect(validateContact({ name: 'A', email: 'not-an-email' })).toBe('Invalid email')
  })

  it('requires URLs to be absolute http(s)', () => {
    expect(validateContact({ name: 'A', website: 'https://example.com' })).toBeNull()
    expect(validateContact({ name: 'A', website: 'example.com' })).toContain('must start with http')
    expect(validateContact({ name: 'A', website: 'javascript:alert(1)' })).toContain('must start with http')
  })

  it('accepts a telegram handle with or without the @', () => {
    expect(validateContact({ name: 'A', telegram: '@someone' })).toBeNull()
    expect(validateContact({ name: 'A', telegram: 'someone' })).toBeNull()
    expect(validateContact({ name: 'A', telegram: 'no' })).toBe('Invalid telegram')
  })

  it('bounds the numeric scores', () => {
    expect(validateContact({ name: 'A', rating: 5 })).toBeNull()
    expect(validateContact({ name: 'A', rating: 9 })).toContain('rating')
    expect(validateContact({ name: 'A', influenceLevel: 11 })).toContain('influenceLevel')
    expect(validateContact({ name: 'A', trustLevel: 6 })).toContain('trustLevel')
  })

  it('rejects unknown enum values', () => {
    expect(validateContact({ name: 'A', relationshipType: 'nemesis' })).toBe('Invalid relationshipType')
    expect(validateContact({ name: 'A', gender: 'other' })).toBe('Invalid gender')
  })
})

describe('validateConnection', () => {
  it('checks both the type and the strength range', () => {
    expect(validateConnection({ connectionType: 'knows', strength: 3 })).toBeNull()
    expect(validateConnection({ connectionType: 'hates' })).toBe('Invalid connectionType')
    expect(validateConnection({ connectionType: 'knows', strength: 0 })).toContain('strength')
  })
})

describe('validateFavor', () => {
  it('validates direction, type and value', () => {
    expect(validateFavor({ direction: 'given', type: 'advice', value: 'high' })).toBeNull()
    expect(validateFavor({ direction: 'sideways' })).toBe('Invalid direction')
    expect(validateFavor({ direction: 'given', type: 'nonsense' })).toBe('Invalid type')
  })
})

describe('validateInteraction', () => {
  it('accepts a valid past interaction', () => {
    expect(validateInteraction({ type: 'meeting', date: '2026-01-01' })).toBeNull()
  })

  it('rejects an unknown type', () => {
    expect(validateInteraction({ type: 'telepathy' })).toBe('Invalid type')
  })

  it('rejects an unparseable date', () => {
    expect(validateInteraction({ type: 'meeting', date: 'not a date' })).toBe('Invalid date')
  })

  it('rejects a date in the future', () => {
    const future = new Date(Date.now() + 10 * 86_400_000).toISOString()
    expect(validateInteraction({ type: 'meeting', date: future })).toBe('Date cannot be in the future')
  })

  it('rejects a date before 1970', () => {
    expect(validateInteraction({ type: 'meeting', date: '1900-01-01' })).toBe('Date is too far in the past')
  })
})

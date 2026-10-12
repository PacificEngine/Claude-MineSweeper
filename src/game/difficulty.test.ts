import { describe, expect, it } from 'vitest'
import { DIFFICULTIES } from './difficulty'

describe('DIFFICULTIES', () => {
  it('offers the three classic presets', () => {
    expect(DIFFICULTIES).toEqual({
      beginner: { width: 9, height: 9, mines: 10 },
      intermediate: { width: 16, height: 16, mines: 40 },
      expert: { width: 30, height: 16, mines: 99 },
    })
  })
})

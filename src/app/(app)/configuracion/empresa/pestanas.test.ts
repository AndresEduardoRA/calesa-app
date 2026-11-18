import { describe, expect, it } from 'vitest'
import { alMenosUna } from './pestanas'

describe('alMenosUna', () => {
  it('una lista vacía es null y una con algo es ella misma', () => {
    expect(alMenosUna([])).toBeNull()
    expect(alMenosUna([1])).toEqual([1])
    expect(alMenosUna([1, 2])).toEqual([1, 2])
  })
})

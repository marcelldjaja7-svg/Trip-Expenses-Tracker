import { describe, expect, it } from 'vitest'
import { equalShares, sharesMatchTotal } from './money'
import { ratesForBase } from './currencies'

describe('equalShares', () => {
  it('splits cents without losing remainder', () => {
    const ids = ['a', 'b', 'c']
    const shares = equalShares(10, ids, 'USD')
    expect(shares.a + shares.b + shares.c).toBeCloseTo(10, 6)
    expect(sharesMatchTotal(shares, 10, 'USD')).toBe(true)
  })

  it('uses whole units for IDR', () => {
    const shares = equalShares(100, ['a', 'b', 'c'], 'IDR')
    expect(shares.a + shares.b + shares.c).toBe(100)
    expect(Object.values(shares).every((n) => Number.isInteger(n))).toBe(true)
  })
})

describe('ratesForBase', () => {
  it('keeps the base currency at 1', () => {
    expect(ratesForBase('IDR').IDR).toBe(1)
    expect(ratesForBase('USD').USD).toBe(1)
  })

  it('converts consistently through USD', () => {
    const idr = ratesForBase('IDR')
    const usd = ratesForBase('USD')
    expect(idr.USD * usd.IDR).toBeCloseTo(1, 6)
  })
})

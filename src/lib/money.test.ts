import { describe, expect, it } from 'vitest'
import { convertAmount, equalPercents, equalShares, percentToAmounts, percentsMatch100, sharesMatchTotal } from './money'
import { ratesForBase } from './currencies'
import type { Trip } from '../types'

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

describe('percent split', () => {
  it('splits a percent bill without losing remainder', () => {
    const amounts = percentToAmounts(100_000, { a: 70, b: 30 }, ['a', 'b'], 'IDR')
    expect(amounts.a + amounts.b).toBe(100_000)
    expect(amounts.a).toBe(70_000)
    expect(amounts.b).toBe(30_000)
  })

  it('equal percents sum to 100', () => {
    const pct = equalPercents(['a', 'b', 'c'])
    expect(percentsMatch100(pct, ['a', 'b', 'c'])).toBe(true)
  })
})

describe('ratesForBase', () => {
  it('keeps the base currency at 1', () => {
    expect(ratesForBase('IDR').IDR).toBe(1)
    expect(ratesForBase('USD').USD).toBe(1)
    expect(ratesForBase('NOK').NOK).toBe(1)
  })

  it('converts consistently through USD', () => {
    const idr = ratesForBase('IDR')
    const usd = ratesForBase('USD')
    expect(idr.USD * usd.IDR).toBeCloseTo(1, 6)
  })

  it('includes Nordic currencies', () => {
    const idr = ratesForBase('IDR')
    expect(idr.ISK).toBeGreaterThan(0)
    expect(idr.DKK).toBeGreaterThan(0)
    expect(idr.NOK).toBeGreaterThan(0)
    expect(idr.SEK).toBeGreaterThan(0)
  })
})

describe('convertAmount', () => {
  it('converts through the trip base currency', () => {
    const trip = { baseCurrency: 'IDR', rates: ratesForBase('IDR') } as Trip
    expect(convertAmount(1, 'USD', 'IDR', trip)).toBeCloseTo(16200, 0)
    expect(convertAmount(16200, 'IDR', 'USD', trip)).toBeCloseTo(1, 5)
    expect(convertAmount(100, 'NOK', 'IDR', trip)).toBeGreaterThan(0)
    expect(convertAmount(50, 'EUR', 'EUR', trip)).toBe(50)
  })
})

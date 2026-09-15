import { describe, expect, it } from 'vitest'
import { createDemoTrip, defaultCategories } from './demo'
import { ratesForBase } from './currencies'
import { computeSpenders, expensesPaidBy, spenderTitle } from './leaderboard'
import type { Trip } from '../types'

function trip(over: Partial<Trip> & Pick<Trip, 'people' | 'expenses'>): Trip {
  return {
    id: 't',
    name: 'Test',
    emoji: '✈️',
    startDate: '',
    endDate: '',
    baseCurrency: 'USD',
    categories: defaultCategories(),
    rates: ratesForBase('USD'),
    createdAt: 1,
    updatedAt: 1,
    ...over,
  }
}

describe('computeSpenders', () => {
  it('ranks by amount paid and ignores settle-up payments', () => {
    const a = 'a'
    const b = 'b'
    const t = trip({
      people: [
        { id: a, name: 'Maya', color: '#000' },
        { id: b, name: 'Jordan', color: '#111' },
      ],
      expenses: [
        {
          id: 'e1',
          amount: 80,
          currency: 'USD',
          paidBy: a,
          participantIds: [a, b],
          splitMode: 'equal',
          categoryId: 'food',
          note: 'Dinner',
          date: '2026-09-01',
          createdAt: 1,
        },
        {
          id: 'e2',
          amount: 20,
          currency: 'USD',
          paidBy: b,
          participantIds: [a, b],
          splitMode: 'equal',
          categoryId: 'food',
          note: 'Coffee',
          date: '2026-09-01',
          createdAt: 2,
        },
        {
          id: 'e3',
          amount: 1000,
          currency: 'USD',
          paidBy: b,
          participantIds: [a],
          splitMode: 'equal',
          categoryId: 'settlement',
          note: 'Settle up',
          date: '2026-09-02',
          createdAt: 3,
        },
      ],
    })
    const ranks = computeSpenders(t, 'paid')
    expect(ranks[0]?.personId).toBe(a)
    expect(ranks[0]?.paid).toBe(80)
    expect(ranks[0]?.bills).toBe(1)
    expect(ranks[1]?.paid).toBe(20)
    expect(ranks.map((r) => r.rank)).toEqual([1, 2])
  })

  it('can rank by share instead of paid', () => {
    const a = 'a'
    const b = 'b'
    const t = trip({
      people: [
        { id: a, name: 'Maya', color: '#000' },
        { id: b, name: 'Jordan', color: '#111' },
      ],
      expenses: [
        {
          id: 'e1',
          amount: 100,
          currency: 'USD',
          paidBy: a,
          participantIds: [b],
          splitMode: 'equal',
          categoryId: 'food',
          note: 'Jordan only',
          date: '2026-09-01',
          createdAt: 1,
        },
      ],
    })
    const paid = computeSpenders(t, 'paid')
    const share = computeSpenders(t, 'share')
    expect(paid[0]?.personId).toBe(a)
    expect(share[0]?.personId).toBe(b)
    expect(share[0]?.share).toBe(100)
  })

  it('ranks the Bali demo by who paid most', () => {
    const demo = createDemoTrip()
    const ranks = computeSpenders(demo, 'paid')
    expect(ranks[0]?.rank).toBe(1)
    expect(ranks[0]?.paid).toBeGreaterThan(ranks[1]?.paid ?? 0)
    expect(ranks.every((r) => r.paid >= 0)).toBe(true)
    expect(expensesPaidBy(demo, ranks[0].personId).length).toBe(ranks[0].bills)
  })
})

describe('spenderTitle', () => {
  it('names the podium', () => {
    expect(spenderTitle(1)).toBe('High roller')
    expect(spenderTitle(4)).toBe('At the table')
  })
})

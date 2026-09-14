import { describe, expect, it } from 'vitest'
import type { Trip } from '../types'
import { createDemoTrip, defaultCategories } from './demo'
import { ratesForBase } from './currencies'
import { computeBalances, suggestedTransfers } from './settle'

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

describe('computeBalances', () => {
  it('nets a simple equal dinner', () => {
    const a = 'a'
    const b = 'b'
    const t = trip({
      people: [
        { id: a, name: 'A', color: '#000' },
        { id: b, name: 'B', color: '#111' },
      ],
      expenses: [
        {
          id: 'e1',
          amount: 40,
          currency: 'USD',
          paidBy: a,
          participantIds: [a, b],
          splitMode: 'equal',
          categoryId: 'food',
          note: 'Dinner',
          date: '2026-09-01',
          createdAt: 1,
        },
      ],
    })
    const nets = Object.fromEntries(computeBalances(t).map((b) => [b.personId, b.net]))
    expect(nets[a]).toBeCloseTo(20)
    expect(nets[b]).toBeCloseTo(-20)
  })

  it('converts foreign currency with the trip rate', () => {
    const a = 'a'
    const b = 'b'
    const t = trip({
      rates: { USD: 1, EUR: 2 },
      people: [
        { id: a, name: 'A', color: '#000' },
        { id: b, name: 'B', color: '#111' },
      ],
      expenses: [
        {
          id: 'e1',
          amount: 10,
          currency: 'EUR',
          paidBy: a,
          participantIds: [a, b],
          splitMode: 'equal',
          categoryId: 'food',
          note: '',
          date: '2026-09-01',
          createdAt: 1,
        },
      ],
    })
    const nets = Object.fromEntries(computeBalances(t).map((x) => [x.personId, x.net]))
    expect(nets[a]).toBeCloseTo(10)
    expect(nets[b]).toBeCloseTo(-10)
  })

  it('honors custom shares', () => {
    const a = 'a'
    const b = 'b'
    const t = trip({
      people: [
        { id: a, name: 'A', color: '#000' },
        { id: b, name: 'B', color: '#111' },
      ],
      expenses: [
        {
          id: 'e1',
          amount: 90,
          currency: 'USD',
          paidBy: a,
          participantIds: [a, b],
          splitMode: 'custom',
          shares: { [a]: 30, [b]: 60 },
          categoryId: 'food',
          note: '',
          date: '2026-09-01',
          createdAt: 1,
        },
      ],
    })
    const nets = Object.fromEntries(computeBalances(t).map((x) => [x.personId, x.net]))
    expect(nets[a]).toBeCloseTo(60)
    expect(nets[b]).toBeCloseTo(-60)
  })
})

describe('suggestedTransfers', () => {
  it('minimizes to one payment for two people', () => {
    const a = 'a'
    const b = 'b'
    const t = trip({
      people: [
        { id: a, name: 'A', color: '#000' },
        { id: b, name: 'B', color: '#111' },
      ],
      expenses: [
        {
          id: 'e1',
          amount: 50,
          currency: 'USD',
          paidBy: a,
          participantIds: [a, b],
          splitMode: 'equal',
          categoryId: 'food',
          note: '',
          date: '2026-09-01',
          createdAt: 1,
        },
      ],
    })
    const xfers = suggestedTransfers(t)
    expect(xfers).toHaveLength(1)
    expect(xfers[0]).toMatchObject({ fromId: b, toId: a, amount: 25 })
  })

  it('settles a three-person cycle with two transfers or fewer', () => {
    const a = 'a'
    const b = 'b'
    const c = 'c'
    const t = trip({
      people: [
        { id: a, name: 'A', color: '#000' },
        { id: b, name: 'B', color: '#111' },
        { id: c, name: 'C', color: '#222' },
      ],
      expenses: [
        {
          id: 'e1',
          amount: 30,
          currency: 'USD',
          paidBy: a,
          participantIds: [a, b],
          splitMode: 'equal',
          categoryId: 'food',
          note: '',
          date: '2026-09-01',
          createdAt: 1,
        },
        {
          id: 'e2',
          amount: 30,
          currency: 'USD',
          paidBy: b,
          participantIds: [b, c],
          splitMode: 'equal',
          categoryId: 'food',
          note: '',
          date: '2026-09-01',
          createdAt: 2,
        },
        {
          id: 'e3',
          amount: 30,
          currency: 'USD',
          paidBy: c,
          participantIds: [c, a],
          splitMode: 'equal',
          categoryId: 'food',
          note: '',
          date: '2026-09-01',
          createdAt: 3,
        },
      ],
    })
    const nets = computeBalances(t)
    expect(nets.every((n) => Math.abs(n.net) < 0.01)).toBe(true)
    expect(suggestedTransfers(t)).toHaveLength(0)
  })

  it('keeps the demo trip nets summing to ~zero', () => {
    const nets = computeBalances(createDemoTrip())
    const sum = nets.reduce((s, b) => s + b.net, 0)
    expect(Math.abs(sum)).toBeLessThan(0.05)
    expect(suggestedTransfers(createDemoTrip()).length).toBeGreaterThan(0)
  })
})

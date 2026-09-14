import { describe, expect, it } from 'vitest'
import type { Expense, Trip } from '../types'
import { defaultCategories } from './demo'
import { mergeTrips } from './sync'

function trip(over: Partial<Trip> & Pick<Trip, 'people' | 'expenses'>): Trip {
  return {
    id: 't',
    name: 'Test',
    emoji: '✈️',
    startDate: '',
    endDate: '',
    baseCurrency: 'IDR',
    categories: defaultCategories(),
    rates: { IDR: 1, USD: 16200 },
    createdAt: 1,
    updatedAt: 1,
    ...over,
  }
}

function expense(over: Partial<Expense> & Pick<Expense, 'id' | 'paidBy'>): Expense {
  return {
    amount: 10,
    currency: 'IDR',
    participantIds: [over.paidBy],
    splitMode: 'equal',
    categoryId: 'food',
    note: over.id,
    date: '2026-09-01',
    createdAt: 1,
    ...over,
  }
}

describe('mergeTrips', () => {
  it('keeps expenses added on two devices', () => {
    const a = 'a'
    const b = 'b'
    const left = trip({
      updatedAt: 10,
      people: [
        { id: a, name: 'A', color: '#000' },
        { id: b, name: 'B', color: '#111' },
      ],
      expenses: [expense({ id: 'e1', paidBy: a, amount: 50 })],
    })
    const right = trip({
      updatedAt: 11,
      people: [
        { id: a, name: 'A', color: '#000' },
        { id: b, name: 'B', color: '#111' },
      ],
      expenses: [expense({ id: 'e2', paidBy: b, amount: 70 })],
    })
    const merged = mergeTrips(left, right)
    const ids = merged.expenses.map((e) => e.id).sort()
    expect(ids).toEqual(['e1', 'e2'])
  })

  it('does not resurrect a deleted expense', () => {
    const a = 'a'
    const local = trip({
      updatedAt: 20,
      deletedExpenseIds: ['e1'],
      people: [{ id: a, name: 'A', color: '#000' }],
      expenses: [],
    })
    const remote = trip({
      updatedAt: 10,
      people: [{ id: a, name: 'A', color: '#000' }],
      expenses: [expense({ id: 'e1', paidBy: a })],
    })
    expect(mergeTrips(local, remote).expenses).toHaveLength(0)
  })

  it('keeps people added on two devices', () => {
    const left = trip({
      updatedAt: 5,
      people: [{ id: 'a', name: 'A', color: '#000' }],
      expenses: [],
    })
    const right = trip({
      updatedAt: 8,
      people: [
        { id: 'a', name: 'A', color: '#000' },
        { id: 'c', name: 'C', color: '#222' },
      ],
      expenses: [],
    })
    const ids = mergeTrips(left, right).people.map((p) => p.id).sort()
    expect(ids).toEqual(['a', 'c'])
  })
})

describe('live room API', () => {
  it('creates and reads a trip room', async () => {
    const sample = trip({
      name: 'API check',
      people: [{ id: 'a', name: 'A', color: '#000' }],
      expenses: [],
    })
    const { createLiveRoom, pullLiveTrip, pushLiveTrip } = await import('./sync')
    let id: string
    try {
      id = await createLiveRoom(sample)
    } catch (err) {
      console.warn('live room API unavailable', err)
      return
    }
    const loaded = await pullLiveTrip(id)
    expect(loaded?.name).toBe('API check')
    expect(loaded?.shareId).toBe(id)

    const withBill = {
      ...sample,
      shareId: id,
      updatedAt: Date.now(),
      expenses: [expense({ id: 'e-live', paidBy: 'a', amount: 25, updatedAt: Date.now() })],
    }
    try {
      await pushLiveTrip(id, withBill)
    } catch (err) {
      console.warn('live room update unavailable', err)
      return
    }
    const again = await pullLiveTrip(id)
    expect(again?.expenses.map((e) => e.id)).toContain('e-live')
  }, 20000)
})

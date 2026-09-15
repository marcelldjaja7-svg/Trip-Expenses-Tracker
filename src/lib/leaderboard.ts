import type { Expense, Person, Trip } from '../types'
import { currencyDecimals } from './currencies'
import { expenseShares, fromMinor, isSettlement, toBaseMinor } from './money'

export type LeaderboardMode = 'paid' | 'share'

export type SpenderStat = {
  personId: string
  paid: number
  share: number
  bills: number
  score: number
  rank: number
}

export function computeSpenders(trip: Trip, mode: LeaderboardMode = 'paid'): SpenderStat[] {
  const decimals = currencyDecimals(trip.baseCurrency)
  const paid = new Map<string, number>()
  const share = new Map<string, number>()
  const bills = new Map<string, number>()
  for (const person of trip.people) {
    paid.set(person.id, 0)
    share.set(person.id, 0)
    bills.set(person.id, 0)
  }

  for (const expense of trip.expenses) {
    if (isSettlement(trip, expense)) continue
    const totalMinor = toBaseMinor(expense.amount, expense.currency, trip)
    paid.set(expense.paidBy, (paid.get(expense.paidBy) ?? 0) + totalMinor)
    bills.set(expense.paidBy, (bills.get(expense.paidBy) ?? 0) + 1)

    const parts = expenseShares(expense)
    const partSum = Object.values(parts).reduce((s, n) => s + n, 0)
    if (partSum <= 0 || expense.participantIds.length === 0) continue

    let allocated = 0
    expense.participantIds.forEach((id, index) => {
      const last = index === expense.participantIds.length - 1
      let minor: number
      if (last) {
        minor = totalMinor - allocated
      } else {
        minor = Math.round((parts[id] / partSum) * totalMinor)
        allocated += minor
      }
      share.set(id, (share.get(id) ?? 0) + minor)
    })
  }

  const names = new Map(trip.people.map((p) => [p.id, p.name.toLowerCase()]))
  const rows = trip.people.map((person) => {
    const paidAmt = fromMinor(paid.get(person.id) ?? 0, decimals)
    const shareAmt = fromMinor(share.get(person.id) ?? 0, decimals)
    return {
      personId: person.id,
      paid: paidAmt,
      share: shareAmt,
      bills: bills.get(person.id) ?? 0,
      score: mode === 'share' ? shareAmt : paidAmt,
      rank: 0,
    }
  })

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.bills !== a.bills) return b.bills - a.bills
    return (names.get(a.personId) ?? '').localeCompare(names.get(b.personId) ?? '')
  })

  return rows.map((row, index) => ({ ...row, rank: index + 1 }))
}

export function spenderTitle(rank: number): string {
  if (rank === 1) return 'High roller'
  if (rank === 2) return 'Whale'
  if (rank === 3) return 'On a streak'
  return 'At the table'
}

export function expensesPaidBy(trip: Trip, personId: string): Expense[] {
  return trip.expenses
    .filter((e) => e.paidBy === personId && !isSettlement(trip, e))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt)
}

export function personById(trip: Trip, id: string): Person | undefined {
  return trip.people.find((p) => p.id === id)
}

import type { PersonBalance, Transfer, Trip } from '../types'
import { convertAmount, formatMoney } from './money'
import { formatPaymentMethod, primaryPayment } from './payments'
import { computeBalances, suggestedTransfers } from './settle'
import { normalizeTrip } from './storage'

export function tripSummaryText(trip: Trip): string {
  const people = new Map(trip.people.map((p) => [p.id, p.name]))
  const balances = computeBalances(trip)
  const transfers = suggestedTransfers(trip)
  const dates = [trip.startDate, trip.endDate].filter(Boolean).join(' → ')
  const lines: string[] = [
    `${trip.emoji} ${trip.name}`,
    dates ? `${dates} · ${trip.baseCurrency}` : trip.baseCurrency,
    '',
    'Balances',
  ]

  for (const b of balances) {
    const name = people.get(b.personId) ?? 'Friend'
    lines.push(`• ${name}: ${describeNet(b, trip.baseCurrency)}`)
  }

  lines.push('')
  if (transfers.length === 0) {
    lines.push('Everyone is settled. Nice.')
  } else {
    lines.push('Settle up')
    for (const t of transfers) {
      const from = people.get(t.fromId) ?? 'Friend'
      const to = people.get(t.toId) ?? 'Friend'
      lines.push(`• ${from} → ${to}  ${formatMoney(t.amount, trip.baseCurrency)}`)
    }
  }

  lines.push('', `Expenses (${trip.expenses.length})`)
  const cats = new Map(trip.categories.map((c) => [c.id, c]))
  const sorted = [...trip.expenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  for (const e of sorted) {
    const payer = people.get(e.paidBy) ?? 'Friend'
    const cat = cats.get(e.categoryId)
    const label = e.note.trim() || cat?.name || 'Expense'
    const converted =
      e.currency === trip.baseCurrency
        ? ''
        : ` → ${formatMoney(e.amount * (trip.rates[e.currency] ?? 1), trip.baseCurrency)}`
    lines.push(
      `• ${e.date || 'undated'}  ${label}  ${formatMoney(e.amount, e.currency)}${converted}  (paid by ${payer})`,
    )
  }

  lines.push('', '— shared from TripTab')
  return lines.join('\n')
}

function describeNet(b: PersonBalance, currency: string): string {
  if (Math.abs(b.net) < 0.005) return 'settled'
  if (b.net > 0) return `is owed ${formatMoney(b.net, currency)}`
  return `owes ${formatMoney(-b.net, currency)}`
}

export function encodeTripShare(trip: Trip): string {
  const json = JSON.stringify(trip)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function decodeTripShare(payload: string): Trip | null {
  try {
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
    const binary = atob(b64 + pad)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    return normalizeTrip(JSON.parse(json))
  } catch {
    return null
  }
}

export function shareUrlForTrip(trip: Trip): string {
  const encoded = encodeTripShare(trip)
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = `import=${encoded}`
  return url.toString()
}

export function parseImportFromLocation(): Trip | null {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  const params = new URLSearchParams(hash.includes('=') ? hash : window.location.search)
  const payload = params.get('import')
  if (!payload) return null
  return decodeTripShare(payload)
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'trip'
  )
}

export function describeTransfer(trip: Trip, t: Transfer, payCurrency?: string): string {
  const from = trip.people.find((p) => p.id === t.fromId)?.name ?? 'Friend'
  const toPerson = trip.people.find((p) => p.id === t.toId)
  const to = toPerson?.name ?? 'Friend'
  const lines = [`${from} pays ${to} ${formatMoney(t.amount, trip.baseCurrency)}`]
  if (payCurrency && payCurrency !== trip.baseCurrency) {
    lines.push(`≈ ${formatMoney(convertAmount(t.amount, trip.baseCurrency, payCurrency, trip), payCurrency)}`)
  }
  const pay = primaryPayment(toPerson)
  if (pay) lines.push(`Pay ${to}: ${formatPaymentMethod(pay)}`)
  return lines.join('\n')
}

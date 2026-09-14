import type { Trip } from '../types'
import { normalizeTrip } from './storage'

const API = 'https://api.restful-api.dev/objects'
const TIMEOUT_MS = 10000

async function request(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = globalThis.setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    })
  } finally {
    globalThis.clearTimeout(timer)
  }
}

export async function createLiveRoom(trip: Trip): Promise<string> {
  const res = await request(API, {
    method: 'POST',
    body: JSON.stringify({ name: 'triptab', data: trip }),
  })
  if (!res.ok) throw new Error('Could not create a live trip')
  const json = (await res.json()) as { id?: string }
  if (!json.id) throw new Error('Could not create a live trip')
  return json.id
}

export async function pullLiveTrip(shareId: string): Promise<Trip | null> {
  try {
    const res = await request(`${API}/${encodeURIComponent(shareId)}`, { method: 'GET' })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: unknown }
    const trip = normalizeTrip(json.data ?? json)
    if (!trip) return null
    return { ...trip, shareId, isDemo: false }
  } catch {
    return null
  }
}

export async function pushLiveTrip(shareId: string, trip: Trip): Promise<void> {
  const res = await request(`${API}/${encodeURIComponent(shareId)}`, {
    method: 'PUT',
    body: JSON.stringify({ name: 'triptab', data: { ...trip, shareId } }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Could not sync trip (${res.status}): ${detail.slice(0, 300)}`)
  }
}

function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]))
}

export function mergeTrips(local: Trip, remote: Trip): Trip {
  const newer = local.updatedAt >= remote.updatedAt ? local : remote
  const older = newer === local ? remote : local
  const deleted = new Set([...(local.deletedExpenseIds ?? []), ...(remote.deletedExpenseIds ?? [])])

  const expenses = byId(older.expenses)
  for (const expense of newer.expenses) {
    const prev = expenses.get(expense.id)
    if (!prev) {
      expenses.set(expense.id, expense)
      continue
    }
    const prevAt = prev.updatedAt ?? prev.createdAt
    const nextAt = expense.updatedAt ?? expense.createdAt
    expenses.set(expense.id, nextAt >= prevAt ? expense : prev)
  }
  for (const id of deleted) expenses.delete(id)

  const people = byId(older.people)
  for (const person of newer.people) people.set(person.id, person)

  const categories = byId(older.categories)
  for (const category of newer.categories) categories.set(category.id, category)

  return {
    ...newer,
    shareId: local.shareId || remote.shareId,
    people: [...people.values()],
    categories: [...categories.values()],
    expenses: [...expenses.values()].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)),
    rates: { ...older.rates, ...newer.rates, [newer.baseCurrency]: 1 },
    deletedExpenseIds: [...deleted],
    isDemo: false,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  }
}

export function tripFingerprint(trip: Trip): string {
  return [
    trip.updatedAt,
    trip.name,
    trip.people.map((p) => `${p.id}:${p.name}`).join(','),
    trip.expenses.map((e) => `${e.id}:${e.updatedAt ?? e.createdAt}:${e.amount}`).join(','),
    (trip.deletedExpenseIds ?? []).join(','),
  ].join('|')
}

export function liveShareUrl(shareId: string): string {
  const url = new URL(window.location.href)
  url.hash = ''
  url.search = ''
  url.searchParams.set('t', shareId)
  return url.toString()
}

export function parseLiveShareId(): string | null {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  const fromHash = new URLSearchParams(hash.includes('=') ? hash : '')
  const fromQuery = new URLSearchParams(window.location.search)
  const id = fromQuery.get('t') || fromQuery.get('trip') || fromHash.get('t') || fromHash.get('trip')
  return id && id.length > 4 ? id : null
}

export function setLiveShareHash(shareId: string): void {
  const url = new URL(window.location.href)
  url.searchParams.set('t', shareId)
  url.searchParams.delete('trip')
  url.hash = ''
  const next = `${url.pathname}${url.search}`
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== next) {
    window.history.replaceState(null, '', next)
  }
}

export function clearLiveShareLocation(): void {
  const url = new URL(window.location.href)
  url.searchParams.delete('t')
  url.searchParams.delete('trip')
  url.hash = ''
  window.history.replaceState(null, '', `${url.pathname}${url.search}`)
}

export function isLocalHost(): boolean {
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

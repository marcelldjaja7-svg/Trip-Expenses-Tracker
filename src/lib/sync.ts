import type { Trip } from '../types'
import { normalizeTrip } from './storage'

const API = 'https://bytebin.lucko.me'
const TIMEOUT_MS = 10000
const PUT_TIMEOUT_MS = 6000

async function request(url: string, init: RequestInit, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      credentials: 'omit',
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

/** `pasteKey.modificationKey` so friends can both read and write. */
export function parseShareParts(shareId: string): { key: string; mod: string } | null {
  const i = shareId.indexOf('.')
  if (i < 4 || i === shareId.length - 1) return null
  const key = shareId.slice(0, i)
  const mod = shareId.slice(i + 1)
  if (!/^[\w-]+$/.test(key) || !/^[\w-]+$/.test(mod)) return null
  return { key, mod }
}

export async function createLiveRoom(trip: Trip): Promise<string> {
  const res = await request(`${API}/post`, {
    method: 'POST',
    headers: { 'Allow-Modification': 'true' },
    body: JSON.stringify({ ...trip, isDemo: false }),
  })
  if (!res.ok) throw new Error('Could not create a live trip')
  const json = (await res.json()) as { key?: string }
  const key = json.key || res.headers.get('location')
  const mod = res.headers.get('modification-key')
  if (!key || !mod) throw new Error('Could not create a live trip')
  return `${key}.${mod}`
}

export async function pullLiveTrip(shareId: string): Promise<Trip | null> {
  const parts = parseShareParts(shareId)
  if (!parts) return null
  try {
    const res = await request(`${API}/${encodeURIComponent(parts.key)}`, { method: 'GET' })
    if (!res.ok) return null
    const json: unknown = await res.json()
    const trip = normalizeTrip(json)
    if (!trip) return null
    return { ...trip, shareId, isDemo: false }
  } catch {
    return null
  }
}

export async function pushLiveTrip(shareId: string, trip: Trip): Promise<void> {
  const parts = parseShareParts(shareId)
  if (!parts) throw new Error('Could not sync trip')
  const payload = JSON.stringify({ ...trip, shareId, isDemo: false })
  try {
    const res = await request(
      `${API}/${encodeURIComponent(parts.key)}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${parts.mod}` },
        body: payload,
      },
      PUT_TIMEOUT_MS,
    )
    if (res.status === 401 || res.status === 403) throw new Error('Could not sync trip')
    if (!res.ok && res.status !== 504 && res.status !== 408) {
      throw new Error('Could not sync trip')
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    if (error instanceof Error && /abort/i.test(error.message)) return
    throw error
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

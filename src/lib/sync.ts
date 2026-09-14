import type { Trip } from '../types'
import { normalizeTrip } from './storage'

const SNAPSHOT = 'https://bytebin.lucko.me'
const ROOM = 'https://api.restful-api.dev/objects'
const TIMEOUT_MS = 10000

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

async function postSnapshot(trip: Trip): Promise<string> {
  const res = await request(`${SNAPSHOT}/post`, {
    method: 'POST',
    body: JSON.stringify({ ...trip, isDemo: false }),
  })
  if (!res.ok) throw new Error('Could not sync trip')
  const json = (await res.json()) as { key?: string }
  if (!json.key) throw new Error('Could not sync trip')
  return json.key
}

async function readSnapshot(bin: string): Promise<Trip | null> {
  const res = await request(`${SNAPSHOT}/${encodeURIComponent(bin)}`, { method: 'GET' })
  if (!res.ok) return null
  return normalizeTrip(await res.json())
}

type Pointer = { id?: string; data?: { bin?: unknown }; bin?: unknown }

function pointerBin(json: Pointer): string | null {
  const bin = json.data && typeof json.data === 'object' ? json.data.bin : json.bin
  return typeof bin === 'string' && bin.length > 3 ? bin : null
}

export async function createLiveRoom(trip: Trip): Promise<string> {
  const bin = await postSnapshot(trip)
  const res = await request(ROOM, {
    method: 'POST',
    body: JSON.stringify({ name: 'triptab', data: { bin } }),
  })
  if (!res.ok) throw new Error('Could not create a live trip')
  const json = (await res.json()) as Pointer
  if (!json.id) throw new Error('Could not create a live trip')
  return json.id
}

export async function pullLiveTrip(shareId: string): Promise<Trip | null> {
  try {
    const res = await request(`${ROOM}/${encodeURIComponent(shareId)}`, { method: 'GET' })
    if (!res.ok) return null
    const bin = pointerBin((await res.json()) as Pointer)
    if (!bin) return null
    const trip = await readSnapshot(bin)
    if (!trip) return null
    return { ...trip, shareId, isDemo: false }
  } catch {
    return null
  }
}

export async function pushLiveTrip(shareId: string, trip: Trip): Promise<void> {
  const bin = await postSnapshot({ ...trip, shareId })
  const res = await request(`${ROOM}/${encodeURIComponent(shareId)}`, {
    method: 'PUT',
    body: JSON.stringify({ name: 'triptab', data: { bin } }),
  })
  if (!res.ok) throw new Error('Could not sync trip')
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

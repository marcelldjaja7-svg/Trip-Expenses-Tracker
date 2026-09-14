import { Copy, Download, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { PERSON_COLORS, TRIP_EMOJIS } from '../lib/colors'
import { convertRatesToNewBase, CURRENCIES, fetchLiveRates } from '../lib/currencies'
import { inverseRate, roundTo } from '../lib/money'
import { downloadJson, shareUrlForTrip, slugify, tripSummaryText } from '../lib/share'
import { normalizeAppData, normalizeTrip } from '../lib/storage'
import { cn, uid } from '../lib/utils'
import type { Trip } from '../types'
import { Avatar, Button, Field, Select, TextInput } from './ui'

export function TripSettings({
  trip,
  onChange,
  onDeleteTrip,
  onNotify,
}: {
  trip: Trip
  onChange: (trip: Trip) => void
  onDeleteTrip: () => void
  onNotify: (message: string) => void
}) {
  const [fetching, setFetching] = useState(false)
  const [newFriend, setNewFriend] = useState('')
  const [newCat, setNewCat] = useState('')

  const usedCurrencies = Array.from(
    new Set([trip.baseCurrency, ...trip.expenses.map((e) => e.currency), ...CURRENCIES.map((c) => c.code)]),
  )

  const copySummary = async () => {
    await navigator.clipboard.writeText(tripSummaryText(trip))
    onNotify('Summary copied')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrlForTrip(trip))
      onNotify('Share link copied')
    } catch {
      onNotify('Could not copy link')
    }
  }

  const pullRates = async () => {
    setFetching(true)
    const live = await fetchLiveRates(trip.baseCurrency)
    setFetching(false)
    if (!live) {
      onNotify('Live rates unavailable — edit manually')
      return
    }
    onChange({
      ...trip,
      rates: { ...trip.rates, ...live, [trip.baseCurrency]: 1 },
      ratesUpdatedAt: new Date().toISOString(),
    })
    onNotify('Rates updated from Frankfurter')
  }

  const involved = (personId: string) =>
    trip.expenses.some((e) => e.paidBy === personId || e.participantIds.includes(personId))

  return (
    <div className="space-y-6">
      <section className="card-solid rounded-[1.75rem] p-5 space-y-4">
        <h3 className="font-display text-xl">Trip details</h3>
        <div className="flex flex-wrap gap-1.5">
          {TRIP_EMOJIS.map((e) => (
            <button
              type="button"
              key={e}
              onClick={() => onChange({ ...trip, emoji: e })}
              className={cn(
                'grid h-10 w-10 place-items-center rounded-2xl text-xl',
                trip.emoji === e ? 'bg-rose-100 ring-2 ring-rose-400 dark:bg-rose-500/20' : 'hover:bg-black/5 dark:hover:bg-white/10',
              )}
            >
              {e}
            </button>
          ))}
        </div>
        <Field label="Name">
          <TextInput value={trip.name} onChange={(e) => onChange({ ...trip, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <TextInput type="date" value={trip.startDate} onChange={(e) => onChange({ ...trip, startDate: e.target.value })} />
          </Field>
          <Field label="End">
            <TextInput type="date" value={trip.endDate} onChange={(e) => onChange({ ...trip, endDate: e.target.value })} />
          </Field>
        </div>
        <Field label="Base currency">
          <Select
            value={trip.baseCurrency}
            onChange={(e) => {
              const base = e.target.value
              onChange({
                ...trip,
                baseCurrency: base,
                rates: convertRatesToNewBase(trip.rates, base),
              })
            }}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </section>

      <section className="card-solid rounded-[1.75rem] p-5 space-y-3">
        <h3 className="font-display text-xl">Friends</h3>
        {trip.people.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-2">
            <Avatar person={p} />
            <TextInput
              className="min-w-[8rem] flex-1"
              value={p.name}
              onChange={(e) =>
                onChange({
                  ...trip,
                  people: trip.people.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)),
                })
              }
            />
            <div className="flex gap-1">
              {PERSON_COLORS.slice(0, 6).map((c) => (
                <button
                  type="button"
                  key={c}
                  aria-label={`Color ${c}`}
                  className={cn('h-6 w-6 rounded-full', p.color === c && 'ring-2 ring-offset-2 ring-black/40')}
                  style={{ background: c }}
                  onClick={() =>
                    onChange({
                      ...trip,
                      people: trip.people.map((x) => (x.id === p.id ? { ...x, color: c } : x)),
                    })
                  }
                />
              ))}
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                if (involved(p.id)) {
                  onNotify('This friend is on an expense — remove those first')
                  return
                }
                onChange({ ...trip, people: trip.people.filter((x) => x.id !== p.id) })
              }}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <TextInput
            value={newFriend}
            placeholder="Add a friend"
            onChange={(e) => setNewFriend(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newFriend.trim()) {
                const color = PERSON_COLORS[trip.people.length % PERSON_COLORS.length]
                onChange({
                  ...trip,
                  people: [...trip.people, { id: uid(), name: newFriend.trim(), color }],
                })
                setNewFriend('')
              }
            }}
          />
          <Button
            variant="secondary"
            onClick={() => {
              if (!newFriend.trim()) return
              const color = PERSON_COLORS[trip.people.length % PERSON_COLORS.length]
              onChange({
                ...trip,
                people: [...trip.people, { id: uid(), name: newFriend.trim(), color }],
              })
              setNewFriend('')
            }}
          >
            Add
          </Button>
        </div>
      </section>

      <section className="card-solid rounded-[1.75rem] p-5 space-y-3">
        <h3 className="font-display text-xl">Categories</h3>
        {trip.categories.map((c) => (
          <div key={c.id} className="flex gap-2">
            <TextInput
              className="w-16 text-center"
              value={c.emoji}
              onChange={(e) =>
                onChange({
                  ...trip,
                  categories: trip.categories.map((x) => (x.id === c.id ? { ...x, emoji: e.target.value } : x)),
                })
              }
            />
            <TextInput
              className="flex-1"
              value={c.name}
              onChange={(e) =>
                onChange({
                  ...trip,
                  categories: trip.categories.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)),
                })
              }
            />
            {c.id !== 'settlement' && (
              <Button
                variant="ghost"
                onClick={() => {
                  if (trip.expenses.some((e) => e.categoryId === c.id)) {
                    onNotify('Move expenses off this category first')
                    return
                  }
                  onChange({ ...trip, categories: trip.categories.filter((x) => x.id !== c.id) })
                }}
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <TextInput value={newCat} placeholder="Custom category" onChange={(e) => setNewCat(e.target.value)} />
          <Button
            variant="secondary"
            onClick={() => {
              if (!newCat.trim()) return
              onChange({
                ...trip,
                categories: [...trip.categories, { id: uid(), name: newCat.trim(), emoji: '✨' }],
              })
              setNewCat('')
            }}
          >
            Add
          </Button>
        </div>
      </section>

      <section className="card-solid rounded-[1.75rem] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-xl">Conversion rates</h3>
            <p className="text-sm text-[var(--muted)]">
              1 unit of each currency in {trip.baseCurrency}. Manual is enough; live fetch is optional.
            </p>
            {trip.ratesUpdatedAt && (
              <p className="text-xs font-bold text-[var(--muted)]">
                Last fetch {new Date(trip.ratesUpdatedAt).toLocaleString()}
              </p>
            )}
          </div>
          <Button variant="secondary" onClick={() => void pullRates()} disabled={fetching}>
            <RefreshCw size={16} className={fetching ? 'animate-spin' : ''} /> Fetch live
          </Button>
        </div>
        <div className="space-y-2">
          {usedCurrencies
            .filter((code, i, arr) => arr.indexOf(code) === i && code !== trip.baseCurrency)
            .slice(0, 18)
            .map((code) => {
              const rate = trip.rates[code] ?? 1
              return (
                <div key={code} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2">
                  <span className="font-extrabold">{code}</span>
                  <RateInput
                    value={rate}
                    onCommit={(n) =>
                      onChange({
                        ...trip,
                        rates: { ...trip.rates, [code]: n },
                      })
                    }
                  />
                  <span className="text-xs font-bold text-[var(--muted)]">
                    1 {trip.baseCurrency} ≈ {roundTo(inverseRate(rate), rate < 0.01 ? 0 : 2)} {code}
                  </span>
                </div>
              )
            })}
        </div>
      </section>

      <section className="card-solid rounded-[1.75rem] p-5 space-y-3">
        <h3 className="font-display text-xl">Share & backup</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void copySummary()}>
            <Copy size={16} /> Copy summary
          </Button>
          <Button variant="secondary" onClick={() => void copyLink()}>
            <Copy size={16} /> Copy share link
          </Button>
          <Button
            variant="secondary"
            onClick={() => downloadJson(`${slugify(trip.name)}.triptab.json`, trip)}
          >
            <Download size={16} /> Download trip
          </Button>
          <label className="pressable inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-2.5 text-sm font-bold dark:bg-white/10">
            <Upload size={16} /> Import JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                try {
                  const raw = JSON.parse(await file.text()) as unknown
                  const one = normalizeTrip(raw)
                  if (one && one.people) {
                    onChange({ ...one, id: trip.id })
                    onNotify('Replaced this trip from file')
                    return
                  }
                  const app = normalizeAppData(raw)
                  if (app?.trips[0]) {
                    onChange({ ...app.trips[0], id: trip.id })
                    onNotify('Replaced this trip from file')
                    return
                  }
                  onNotify('Could not read that file')
                } catch {
                  onNotify('Could not read that file')
                }
              }}
            />
          </label>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-rose-300/60 bg-rose-50 p-5 dark:bg-rose-950/30">
        <h3 className="font-display text-xl text-rose-700 dark:text-rose-300">Danger zone</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">Delete this trip from this browser. Export first if you might need it.</p>
        <Button variant="danger" className="mt-3" onClick={onDeleteTrip}>
          <Trash2 size={16} /> Delete trip
        </Button>
      </section>
    </div>
  )
}

function RateInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => {
    setDraft(String(value))
  }, [value])
  return (
    <TextInput
      inputMode="decimal"
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        const n = Number(e.target.value)
        if (Number.isFinite(n) && n > 0) onCommit(n)
      }}
    />
  )
}

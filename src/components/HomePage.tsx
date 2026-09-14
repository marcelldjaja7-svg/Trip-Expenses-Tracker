import { Download, Palmtree, Plus, Sparkles, Upload } from 'lucide-react'
import { useState } from 'react'
import { TRIP_EMOJIS } from '../lib/colors'
import { CURRENCIES } from '../lib/currencies'
import { formatMoney, tripTotalBase } from '../lib/money'
import { downloadJson } from '../lib/share'
import { cn, todayISO } from '../lib/utils'
import { useStore } from '../state'
import { AvatarStack, Button, Field, Modal, Select, TextInput, ThemeToggle } from './ui'

export function HomePage() {
  const { data, selectTrip, createTrip, loadDemo, importData, notify } = useStore()
  const [open, setOpen] = useState(false)

  const onImport = async (file: File | undefined) => {
    if (!file) return
    try {
      const text = await file.text()
      const ok = importData(JSON.parse(text))
      notify(ok ? 'Trip imported' : 'Could not read that file')
    } catch {
      notify('Could not read that file')
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:pt-10">
      <header className="mb-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-linear-to-br from-rose-500 to-amber-400 text-lg text-white shadow-lg shadow-rose-500/30">
            ✈️
          </div>
          <div>
            <p className="font-display text-2xl leading-none">TripTab</p>
            <p className="text-sm font-semibold text-[var(--muted)]">Split the trip, keep the friendship</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <section className="glass mb-8 overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <p className="text-sm font-extrabold uppercase tracking-widest text-rose-500">Ready when you are</p>
        <h1 className="font-display mt-2 max-w-xl text-4xl leading-tight sm:text-5xl">Fair splits without the spreadsheet energy.</h1>
        <p className="mt-3 max-w-lg text-[var(--muted)]">
          Log who paid, in whatever currency you used, then let TripTab tell you who owes whom. Everything stays on this device.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => setOpen(true)}>
            <Plus size={18} /> New trip
          </Button>
          <Button variant="secondary" onClick={() => loadDemo()}>
            <Sparkles size={18} /> Peek at a Bali demo
          </Button>
          <label className="pressable inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-2.5 text-sm font-bold dark:bg-white/10">
            <Upload size={16} /> Import JSON
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                void onImport(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          {data.trips.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => downloadJson('triptab-backup.json', { version: 1, trips: data.trips })}
            >
              <Download size={16} /> Export all
            </Button>
          )}
        </div>
      </section>

      {data.trips.length === 0 ? (
        <div className="card-solid rounded-[2rem] px-6 py-16 text-center">
          <Palmtree className="mx-auto mb-3 text-rose-400" />
          <p className="font-display text-2xl">No trips yet</p>
          <p className="mt-1 text-[var(--muted)]">Create one for your crew, or open the sample Bali getaway.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.trips.map((trip, i) => (
            <button
              type="button"
              key={trip.id}
              onClick={() => selectTrip(trip.id)}
              className="pressable card-solid fade-up rounded-[1.75rem] p-5 text-left"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-3xl">{trip.emoji}</div>
                  <h2 className="font-display mt-2 text-2xl">{trip.name}</h2>
                  <p className="text-sm font-semibold text-[var(--muted)]">
                    {trip.startDate && trip.endDate
                      ? `${trip.startDate} → ${trip.endDate}`
                      : trip.startDate || 'Dates TBD'}
                    {' · '}
                    {trip.baseCurrency}
                    {trip.isDemo ? ' · demo' : ''}
                  </p>
                </div>
                <AvatarStack people={trip.people} />
              </div>
              <div className="mt-5 flex items-end justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">Spent</p>
                  <p className="text-xl font-extrabold">{formatMoney(tripTotalBase(trip), trip.baseCurrency)}</p>
                </div>
                <p className="text-sm font-bold text-[var(--muted)]">
                  {trip.expenses.length} {trip.expenses.length === 1 ? 'expense' : 'expenses'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <NewTripModal open={open} onClose={() => setOpen(false)} onCreate={createTrip} />
    </div>
  )
}

function NewTripModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (input: {
    name: string
    emoji: string
    baseCurrency: string
    startDate?: string
    endDate?: string
    people: string[]
  }) => void
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🏝️')
  const [baseCurrency, setBaseCurrency] = useState('USD')
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState('')
  const [people, setPeople] = useState(['', ''])

  const submit = () => {
    const names = people.map((p) => p.trim()).filter(Boolean)
    if (!name.trim()) return
    if (names.length < 1) return
    onCreate({ name, emoji, baseCurrency, startDate, endDate, people: names })
    onClose()
    setName('')
    setPeople(['', ''])
  }

  return (
    <Modal open={open} onClose={onClose} title="New trip">
      <div className="space-y-4">
        <Field label="Trip vibe">
          <div className="flex flex-wrap gap-1.5">
            {TRIP_EMOJIS.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setEmoji(e)}
                className={cn(
                  'grid h-10 w-10 place-items-center rounded-2xl text-xl hover:bg-black/5 dark:hover:bg-white/10',
                  emoji === e && 'bg-rose-100 ring-2 ring-rose-400 dark:bg-rose-500/20',
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Trip name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Tokyo bite-sized" autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="End">
            <TextInput type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Home currency">
          <Select value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">Friends on the trip</p>
          <div className="space-y-2">
            {people.map((p, i) => (
              <div key={i} className="flex gap-2">
                <TextInput
                  value={p}
                  placeholder={i === 0 ? 'You' : 'Friend name'}
                  onChange={(e) => setPeople((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                />
                {people.length > 1 && (
                  <Button variant="ghost" onClick={() => setPeople((prev) => prev.filter((_, j) => j !== i))}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button variant="secondary" className="mt-3" onClick={() => setPeople((p) => [...p, ''])}>
            <Plus size={16} /> Add friend
          </Button>
        </div>
        <Button className="w-full" onClick={submit} disabled={!name.trim() || people.every((p) => !p.trim())}>
          Let’s go
        </Button>
      </div>
    </Modal>
  )
}

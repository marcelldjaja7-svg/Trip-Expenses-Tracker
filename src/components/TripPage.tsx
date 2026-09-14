import { ArrowLeft, Plus, Receipt, Scale, Settings2 } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { convertedLabel, formatMoney, isSettlement, tripTotalBase } from '../lib/money'
import { cn } from '../lib/utils'
import { useStore } from '../state'
import type { Expense, Trip } from '../types'
import { BalancesView } from './BalancesView'
import { ExpenseForm } from './ExpenseForm'
import { TripSettings } from './TripSettings'
import { Avatar, AvatarStack, Button } from './ui'

type Tab = 'expenses' | 'settle' | 'settings'

export function TripPage({ trip }: { trip: Trip }) {
  const { selectTrip, saveTrip, deleteTrip, notify } = useStore()
  const [tab, setTab] = useState<Tab>('expenses')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [burst, setBurst] = useState(false)

  const peopleById = useMemo(() => new Map(trip.people.map((p) => [p.id, p])), [trip.people])
  const cats = useMemo(() => new Map(trip.categories.map((c) => [c.id, c])), [trip.categories])

  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>()
    const sorted = [...trip.expenses].sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt - a.createdAt)
    for (const e of sorted) {
      const key = e.date || 'Undated'
      const list = map.get(key) ?? []
      list.push(e)
      map.set(key, list)
    }
    return [...map.entries()]
  }, [trip.expenses])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const saveExpense = (expense: Expense, rate?: { currency: string; rate: number }) => {
    const rates = rate ? { ...trip.rates, [rate.currency]: rate.rate } : trip.rates
    const exists = trip.expenses.some((e) => e.id === expense.id)
    saveTrip({
      ...trip,
      rates,
      expenses: exists
        ? trip.expenses.map((e) => (e.id === expense.id ? expense : e))
        : [expense, ...trip.expenses],
    })
    setFormOpen(false)
    setEditing(null)
    setBurst(true)
    window.setTimeout(() => setBurst(false), 900)
    notify(exists ? 'Expense updated' : 'Expense added')
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-36 pt-4 sm:pb-16 sm:pt-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => selectTrip(null)}
          className="pressable inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold hover:bg-black/5 dark:hover:bg-white/10"
        >
          <ArrowLeft size={16} /> Trips
        </button>
        <div className="hidden sm:flex gap-1 rounded-2xl border border-[var(--line)] bg-white/50 p-1 dark:bg-white/10">
          <TabBtn on={tab === 'expenses'} onClick={() => setTab('expenses')} icon={<Receipt size={16} />} label="Expenses" />
          <TabBtn on={tab === 'settle'} onClick={() => setTab('settle')} icon={<Scale size={16} />} label="Settle up" />
          <TabBtn on={tab === 'settings'} onClick={() => setTab('settings')} icon={<Settings2 size={16} />} label="Trip" />
        </div>
      </div>

      <header className="glass relative overflow-hidden rounded-[2rem] p-6">
        {burst && <Confetti />}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-5xl">{trip.emoji}</div>
            <h1 className="font-display mt-2 text-4xl">{trip.name}</h1>
            <p className="mt-1 font-semibold text-[var(--muted)]">
              {trip.startDate && trip.endDate ? `${trip.startDate} → ${trip.endDate}` : trip.startDate || 'Open dates'}
              {' · '}
              {trip.people.length} {trip.people.length === 1 ? 'friend' : 'friends'}
              {' · '}
              {trip.baseCurrency}
            </p>
          </div>
          <AvatarStack people={trip.people} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/60 p-3 dark:bg-black/20">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">Spent</p>
            <p className="font-display text-2xl">{formatMoney(tripTotalBase(trip), trip.baseCurrency)}</p>
          </div>
          <div className="rounded-2xl bg-white/60 p-3 dark:bg-black/20">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">Logged</p>
            <p className="font-display text-2xl">
              {trip.expenses.length} {trip.expenses.length === 1 ? 'bill' : 'bills'}
            </p>
          </div>
        </div>
        {trip.isDemo && (
          <p className="mt-4 rounded-2xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
            Sample Bali data so you can click around. Start a real trip anytime — or just edit this one.
          </p>
        )}
      </header>

      <div className="mt-6">
        {tab === 'expenses' && (
          <div className="space-y-6">
            {grouped.length === 0 ? (
              <div className="card-solid rounded-[1.75rem] px-6 py-14 text-center">
                <p className="font-display text-2xl">No expenses yet</p>
                <p className="mt-1 text-[var(--muted)]">Add the first taxi, meal, or villa and the rest gets easy.</p>
                <Button className="mt-4" onClick={openNew}>
                  <Plus size={16} /> Add expense
                </Button>
              </div>
            ) : (
              grouped.map(([date, items]) => (
                <section key={date}>
                  <h3 className="mb-2 px-1 text-xs font-extrabold uppercase tracking-widest text-[var(--muted)]">
                    {prettyDate(date)}
                  </h3>
                  <div className="space-y-2">
                    {items.map((expense) => {
                      const payer = peopleById.get(expense.paidBy)
                      const cat = cats.get(expense.categoryId)
                      const splitPeople = expense.participantIds
                        .map((id) => peopleById.get(id))
                        .filter((p): p is NonNullable<typeof p> => Boolean(p))
                      return (
                        <button
                          type="button"
                          key={expense.id}
                          onClick={() => {
                            setEditing(expense)
                            setFormOpen(true)
                          }}
                          className="pressable card-solid flex w-full items-center gap-3 rounded-3xl p-3 text-left"
                        >
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-black/5 text-xl dark:bg-white/10">
                            {cat?.emoji ?? '📦'}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-extrabold">
                              {expense.note.trim() || cat?.name || 'Expense'}
                              {isSettlement(trip, expense) ? ' · payment' : ''}
                            </span>
                            <span className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
                              {payer && <Avatar person={payer} size="sm" />}
                              {payer ? `${payer.name} paid` : 'Paid'}
                              {' · '}
                              {expense.splitMode === 'custom' ? 'custom split' : `${splitPeople.length} ways`}
                            </span>
                          </span>
                          <span className="text-right">
                            <span className="block font-extrabold">
                              {formatMoney(expense.amount, expense.currency)}
                            </span>
                            {expense.currency !== trip.baseCurrency && (
                              <span className="text-xs font-bold text-[var(--muted)]">
                                {convertedLabel(trip, expense.amount, expense.currency)}
                              </span>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        )}

        {tab === 'settle' && (
          <BalancesView
            trip={trip}
            onLogSettlement={(next) => {
              saveTrip(next)
              notify('Payment logged')
            }}
          />
        )}

        {tab === 'settings' && (
          <TripSettings
            trip={trip}
            onChange={saveTrip}
            onDeleteTrip={() => {
              deleteTrip(trip.id)
              notify('Trip deleted')
            }}
            onNotify={notify}
          />
        )}
      </div>

      {tab !== 'settings' && (
        <button
          type="button"
          onClick={openNew}
          className="pressable fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-linear-to-br from-rose-500 to-amber-500 font-extrabold text-white shadow-xl shadow-rose-500/30 sm:bottom-8 sm:w-auto sm:px-5"
          aria-label="Add expense"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">Add expense</span>
        </button>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[var(--bg-2)]/90 px-3 py-2 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-md justify-around">
          <TabBtn on={tab === 'expenses'} onClick={() => setTab('expenses')} icon={<Receipt size={18} />} label="Expenses" />
          <TabBtn on={tab === 'settle'} onClick={() => setTab('settle')} icon={<Scale size={18} />} label="Settle" />
          <TabBtn on={tab === 'settings'} onClick={() => setTab('settings')} icon={<Settings2 size={18} />} label="Trip" />
        </div>
      </nav>

      {formOpen && (
        <ExpenseForm
          key={editing?.id ?? 'new'}
          trip={trip}
          expense={editing}
          open={formOpen}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSave={saveExpense}
          onDelete={(id) => {
            saveTrip({ ...trip, expenses: trip.expenses.filter((e) => e.id !== id) })
            setFormOpen(false)
            setEditing(null)
            notify('Expense deleted')
          }}
        />
      )}
    </div>
  )
}

function TabBtn({
  on,
  onClick,
  icon,
  label,
}: {
  on: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-extrabold sm:flex-row sm:gap-2 sm:text-sm',
        on ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'text-[var(--muted)]',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function prettyDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function Confetti() {
  const bits = ['🎉', '🌴', '💸', '✨', '🍜', '✈️']
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b, i) => (
        <span
          key={i}
          className="confetti-bit text-xl"
          style={
            {
              left: `${20 + i * 12}%`,
              top: '20%',
              '--dx': `${(i - 2.5) * 28}px`,
              '--dy': `${-80 - i * 8}px`,
              '--rot': `${i * 40}deg`,
            } as CSSProperties
          }
        >
          {b}
        </span>
      ))}
    </div>
  )
}

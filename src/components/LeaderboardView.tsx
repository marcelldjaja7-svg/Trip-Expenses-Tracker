import { Crown, Dices, Sparkles, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { computeSpenders, expensesPaidBy, spenderTitle, type LeaderboardMode, type SpenderStat } from '../lib/leaderboard'
import { formatMoney, isSettlement } from '../lib/money'
import { cn } from '../lib/utils'
import type { Expense, Person, Trip } from '../types'
import { Avatar } from './ui'

export function LeaderboardView({
  trip,
  onOpenExpense,
}: {
  trip: Trip
  onOpenExpense: (expense: Expense) => void
}) {
  const [mode, setMode] = useState<LeaderboardMode>('paid')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dealing, setDealing] = useState(false)
  const [dealt, setDealt] = useState<SpenderStat[] | null>(null)

  const real = useMemo(() => computeSpenders(trip, mode), [trip, mode])
  const display = dealing && dealt ? dealt : real
  const peopleById = useMemo(() => new Map(trip.people.map((p) => [p.id, p])), [trip.people])
  const cats = useMemo(() => new Map(trip.categories.map((c) => [c.id, c])), [trip.categories])
  const hasSpend = real.some((r) => r.score > 0)

  const selected = selectedId ? real.find((r) => r.personId === selectedId) : real[0]
  const selectedPerson = selected ? peopleById.get(selected.personId) : undefined
  const selectedBills = selectedPerson ? expensesPaidBy(trip, selectedPerson.id) : []
  const podium = display.slice(0, 3)
  const rest = display.slice(3)

  const deal = () => {
    if (dealing || real.length < 2) return
    setDealing(true)
    const shuffled = [...real].sort(() => Math.random() - 0.5)
    setDealt(shuffled.map((row, i) => ({ ...row, rank: i + 1 })))
    window.setTimeout(() => {
      setDealt(null)
      setDealing(false)
    }, 720)
  }

  const pick = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="casino-floor -mx-4 px-4 pb-6 pt-2">
      <div className="casino-marquee">
        <span className="casino-lights" aria-hidden />
        <div className="relative z-[1] px-4 pb-5 pt-6 text-center">
          <p className="casino-kicker">
            <Sparkles size={12} strokeWidth={2} /> High rollers
          </p>
          <h2 className="casino-title">Top spenders</h2>
          <p className="mt-1 text-[13px] text-[#e8d5a3]/80">
            {mode === 'paid' ? 'Who put the most on the table.' : 'Who’s on the biggest tab.'} Tap a name.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              className={cn('casino-chip-btn', mode === 'paid' && 'on')}
              onClick={() => setMode('paid')}
            >
              Paid
            </button>
            <button
              type="button"
              className={cn('casino-chip-btn', mode === 'share' && 'on')}
              onClick={() => setMode('share')}
            >
              On the tab
            </button>
            <button type="button" className="casino-chip-btn deal" onClick={deal} disabled={dealing || !hasSpend}>
              <Dices size={14} strokeWidth={2} />
              {dealing ? 'Dealing…' : 'Deal'}
            </button>
          </div>
        </div>
      </div>

      {!hasSpend ? (
        <div className="mt-6 rounded-[16px] border border-[#d4af37]/35 bg-[#0c2418] px-5 py-10 text-center">
          <Trophy size={28} className="mx-auto text-[#d4af37]" />
          <p className="mt-3 text-[17px] font-semibold text-[#f6e7b2]">The floor is quiet</p>
          <p className="mt-1 text-[14px] text-[#e8d5a3]/70">Log a bill and the high rollers take the podium.</p>
        </div>
      ) : (
        <>
          <div className={cn('casino-podium mt-4', dealing && 'dealing')}>
            {([1, 0, 2] as const).map((slot) => {
              const row = podium[slot]
              if (!row) return <div key={slot} />
              const person = peopleById.get(row.personId)
              if (!person) return <div key={slot} />
              const place = row.rank
              const on = selected?.personId === person.id
              return (
                <button
                  type="button"
                  key={person.id}
                  className={cn('casino-seat', place === 1 && 'first', place === 2 && 'second', place === 3 && 'third', on && 'selected')}
                  onClick={() => pick(person.id)}
                  aria-pressed={on}
                >
                  {place === 1 && <Crown size={16} className="casino-crown" strokeWidth={2} />}
                  <Avatar person={person} size={place === 1 ? 'lg' : 'md'} />
                  <span className="casino-place">#{place}</span>
                  <span className="truncate text-[14px] font-semibold text-[#fff6d4]">{person.name}</span>
                  <span className="casino-score">
                    <CountUp value={row.score} currency={trip.baseCurrency} active={!dealing} />
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[#d4af37]/90">{spenderTitle(place)}</span>
                </button>
              )
            })}
          </div>

          {rest.length > 0 && (
            <div className="casino-rail mt-4">
              {rest.map((row) => {
                const person = peopleById.get(row.personId)
                if (!person) return null
                const on = selected?.personId === person.id
                return (
                  <button
                    type="button"
                    key={person.id}
                    className={cn('casino-row', on && 'selected')}
                    onClick={() => pick(person.id)}
                    aria-pressed={on}
                  >
                    <span className="casino-rank-pip">{row.rank}</span>
                    <Avatar person={person} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-left text-[16px] font-medium text-[#fff6d4]">
                      {person.name}
                    </span>
                    <span className="text-right text-[15px] font-semibold tabular-nums text-[#f6e27a]">
                      {formatMoney(row.score, trip.baseCurrency)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {selectedPerson && selected && (
            <PlayerHand
              trip={trip}
              person={selectedPerson}
              stat={selected}
              bills={selectedBills}
              cats={cats}
              onOpenExpense={onOpenExpense}
            />
          )}
        </>
      )}
    </div>
  )
}

function PlayerHand({
  trip,
  person,
  stat,
  bills,
  cats,
  onOpenExpense,
}: {
  trip: Trip
  person: Person
  stat: SpenderStat
  bills: Expense[]
  cats: Map<string, { id: string; name: string; emoji: string }>
  onOpenExpense: (expense: Expense) => void
}) {
  return (
    <div className="casino-hand mt-4">
      <div className="flex items-center gap-3">
        <Avatar person={person} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold text-[#fff6d4]">{person.name}’s hand</p>
          <p className="text-[13px] text-[#e8d5a3]/75">
            #{stat.rank} · {stat.bills} {stat.bills === 1 ? 'bill' : 'bills'} paid · tab{' '}
            {formatMoney(stat.share, trip.baseCurrency)}
          </p>
        </div>
      </div>
      {bills.length === 0 ? (
        <p className="mt-3 text-[14px] text-[#e8d5a3]/70">No bills on this player yet — they rode someone else’s chip.</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {bills.map((expense) => {
            const cat = cats.get(expense.categoryId)
            return (
              <button
                type="button"
                key={expense.id}
                className="casino-bill"
                onClick={() => onOpenExpense(expense)}
              >
                <span className="text-[16px]">{cat?.emoji ?? '🎰'}</span>
                <span className="min-w-0 flex-1 truncate text-left">
                  {expense.note.trim() || cat?.name || 'Expense'}
                  {isSettlement(trip, expense) ? ' · Payment' : ''}
                </span>
                <span className="shrink-0 tabular-nums text-[#f6e27a]">
                  {formatMoney(expense.amount, expense.currency)}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CountUp({ value, currency, active }: { value: number; currency: string; active: boolean }) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (!active) {
      setShown(value)
      return
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setShown(value)
      return
    }
    const start = performance.now()
    const from = 0
    const dur = 700
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - (1 - t) ** 3
      setShown(from + (value - from) * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, active])
  return <>{formatMoney(shown, currency)}</>
}

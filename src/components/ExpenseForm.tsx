import { useMemo, useState } from 'react'
import { CURRENCIES } from '../lib/currencies'
import {
  equalPercents,
  equalShares,
  formatMoney,
  percentToAmounts,
  percentsMatch100,
  roundTo,
  sharesMatchTotal,
  sharesSum,
} from '../lib/money'
import { cn, todayISO, uid } from '../lib/utils'
import type { Expense, SplitMode, Trip } from '../types'
import { Avatar, Button, Field, Modal, Select, TextInput } from './ui'

type Props = {
  trip: Trip
  expense?: Expense | null
  open: boolean
  onClose: () => void
  onSave: (expense: Expense, rate?: { currency: string; rate: number }) => void
  onDelete?: (id: string) => void
}

const SPLIT_TABS: { id: SplitMode; label: string }[] = [
  { id: 'equal', label: 'Equal' },
  { id: 'custom', label: 'Amounts' },
  { id: 'percent', label: '%' },
]

export function ExpenseForm({ trip, expense, open, onClose, onSave, onDelete }: Props) {
  const editing = Boolean(expense)
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [currency, setCurrency] = useState(expense?.currency ?? trip.baseCurrency)
  const [paidBy, setPaidBy] = useState(expense?.paidBy ?? trip.people[0]?.id ?? '')
  const [participants, setParticipants] = useState<string[]>(
    expense?.participantIds ?? trip.people.map((p) => p.id),
  )
  const [splitMode, setSplitMode] = useState<SplitMode>(expense?.splitMode ?? 'equal')
  const [amountShares, setAmountShares] = useState<Record<string, string>>(() => {
    if (expense?.splitMode === 'custom' && expense.shares) {
      return Object.fromEntries(Object.entries(expense.shares).map(([k, v]) => [k, String(v)]))
    }
    return {}
  })
  const [percentShares, setPercentShares] = useState<Record<string, string>>(() => {
    if (expense?.splitMode === 'percent' && expense.shares) {
      return Object.fromEntries(Object.entries(expense.shares).map(([k, v]) => [k, String(v)]))
    }
    return {}
  })
  const [categoryId, setCategoryId] = useState(
    expense?.categoryId ?? trip.categories.find((c) => c.id !== 'settlement')?.id ?? trip.categories[0]?.id,
  )
  const [note, setNote] = useState(expense?.note ?? '')
  const [date, setDate] = useState(expense?.date || todayISO())
  const [rateDraft, setRateDraft] = useState(() => {
    const r = trip.rates[expense?.currency ?? trip.baseCurrency]
    return r ? String(roundTo(r, 8)) : '1'
  })
  const [error, setError] = useState('')

  const parsedAmount = Number(amount)
  const rate = Number(rateDraft)
  const hasRate = currency === trip.baseCurrency || (Number.isFinite(rate) && rate > 0)
  const converted =
    Number.isFinite(parsedAmount) && hasRate
      ? currency === trip.baseCurrency
        ? parsedAmount
        : parsedAmount * rate
      : null

  const equal = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || participants.length === 0) return {}
    return equalShares(parsedAmount, participants, currency)
  }, [parsedAmount, participants, currency])

  const parsedAmounts = useMemo(() => {
    const out: Record<string, number> = {}
    for (const id of participants) {
      const n = Number(amountShares[id])
      out[id] = Number.isFinite(n) ? n : 0
    }
    return out
  }, [participants, amountShares])

  const parsedPercents = useMemo(() => {
    const out: Record<string, number> = {}
    for (const id of participants) {
      const n = Number(percentShares[id])
      out[id] = Number.isFinite(n) ? n : 0
    }
    return out
  }, [participants, percentShares])

  const percentAmounts = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || participants.length === 0) return {}
    return percentToAmounts(parsedAmount, parsedPercents, participants, currency)
  }, [parsedAmount, parsedPercents, participants, currency])

  const amountLeft = Number.isFinite(parsedAmount) ? parsedAmount - sharesSum(parsedAmounts) : 0
  const percentLeft = 100 - sharesSum(parsedPercents)

  const togglePerson = (id: string) => {
    setParticipants((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev
        return prev.filter((x) => x !== id)
      }
      return [...prev, id]
    })
  }

  const fillEqualAmounts = (ids: string[] = participants) => {
    if (!Number.isFinite(parsedAmount) || ids.length === 0) return
    setAmountShares(Object.fromEntries(Object.entries(equalShares(parsedAmount, ids, currency)).map(([k, v]) => [k, String(v)])))
  }

  const fillEqualPercents = (ids: string[] = participants) => {
    setPercentShares(Object.fromEntries(Object.entries(equalPercents(ids)).map(([k, v]) => [k, String(v)])))
  }

  const setMode = (mode: SplitMode) => {
    setSplitMode(mode)
    if (mode === 'custom') fillEqualAmounts()
    if (mode === 'percent') fillEqualPercents()
  }

  const submit = () => {
    setError('')
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (!paidBy) {
      setError('Who paid?')
      return
    }
    if (participants.length === 0) {
      setError('Include at least one person on this bill.')
      return
    }
    if (splitMode === 'custom' && !sharesMatchTotal(parsedAmounts, parsedAmount, currency)) {
      setError(`Amounts must add up to ${formatMoney(parsedAmount, currency)}.`)
      return
    }
    if (splitMode === 'percent' && !percentsMatch100(parsedPercents, participants)) {
      setError('Percentages must add up to 100%.')
      return
    }
    if (currency !== trip.baseCurrency && (!Number.isFinite(rate) || rate <= 0)) {
      setError('Set a conversion rate first.')
      return
    }
    const next: Expense = {
      id: expense?.id ?? uid(),
      amount: parsedAmount,
      currency,
      paidBy,
      participantIds: participants,
      splitMode,
      shares: splitMode === 'custom' ? parsedAmounts : splitMode === 'percent' ? parsedPercents : undefined,
      categoryId,
      note: note.trim(),
      date,
      createdAt: expense?.createdAt ?? Date.now(),
    }
    onSave(next, currency === trip.baseCurrency ? undefined : { currency, rate })
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit expense' : 'Add expense'} wide>
      {trip.people.length === 0 ? (
        <p className="text-[var(--muted)]">Add friends to the trip before logging expenses.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <Field label="Amount">
              <TextInput
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </Field>
            <Field label="Currency">
              <Select
                value={currency}
                onChange={(e) => {
                  const code = e.target.value
                  setCurrency(code)
                  const existing = trip.rates[code]
                  setRateDraft(existing ? String(roundTo(existing, 8)) : '1')
                }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {currency !== trip.baseCurrency && (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-black/5 p-3 dark:bg-white/5">
              <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
                Rate to {trip.baseCurrency}
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm font-bold">
                <span>1 {currency} =</span>
                <TextInput
                  inputMode="decimal"
                  className="max-w-[10rem]"
                  value={rateDraft}
                  onChange={(e) => setRateDraft(e.target.value)}
                />
                <span>{trip.baseCurrency}</span>
              </div>
              {converted !== null && (
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Converts to {formatMoney(converted, trip.baseCurrency)}
                </p>
              )}
            </div>
          )}

          <Field label="Date">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>

          <div>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">Who paid</p>
            <div className="flex flex-wrap gap-2">
              {trip.people.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPaidBy(p.id)}
                  data-on={paidBy === p.id}
                  className={cn(
                    'chip flex items-center gap-2 rounded-full border px-2 py-1.5 pr-3 text-sm font-bold',
                    paidBy === p.id
                      ? 'border-transparent text-white shadow'
                      : 'border-[var(--line)] bg-white/70 dark:bg-white/10',
                  )}
                  style={paidBy === p.id ? { background: p.color } : undefined}
                >
                  <Avatar person={p} size="sm" />
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">Split the bill</p>
            <div className="grid grid-cols-3 rounded-2xl bg-black/5 p-1 dark:bg-white/10">
              {SPLIT_TABS.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setMode(tab.id)}
                  className={cn(
                    'rounded-xl py-2 text-sm font-extrabold',
                    splitMode === tab.id ? 'bg-rose-500 text-white shadow' : 'text-[var(--muted)]',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs font-semibold text-[var(--muted)]">
              Tap In / Out to leave someone off this expense.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="rounded-full bg-black/5 px-3 py-1 text-xs font-extrabold dark:bg-white/10"
                onClick={() => {
                  const ids = trip.people.map((p) => p.id)
                  setParticipants(ids)
                  if (splitMode === 'custom') fillEqualAmounts(ids)
                  if (splitMode === 'percent') fillEqualPercents(ids)
                }}
              >
                Everyone
              </button>
              <button
                type="button"
                className="rounded-full bg-black/5 px-3 py-1 text-xs font-extrabold dark:bg-white/10"
                onClick={() => {
                  if (!paidBy) return
                  setParticipants([paidBy])
                  if (splitMode === 'custom') fillEqualAmounts([paidBy])
                  if (splitMode === 'percent') fillEqualPercents([paidBy])
                }}
              >
                Just payer
              </button>
            </div>

            <div className="mt-3 divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)]">
              {trip.people.map((p) => {
                const on = participants.includes(p.id)
                return (
                  <div
                    key={p.id}
                    className={cn('flex flex-wrap items-center gap-2 px-3 py-2.5', !on && 'opacity-50')}
                  >
                    <Avatar person={p} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-extrabold">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => togglePerson(p.id)}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-extrabold',
                        on ? 'bg-teal-500 text-white' : 'bg-black/10 dark:bg-white/10',
                      )}
                    >
                      {on ? 'In' : 'Out'}
                    </button>
                    {on && splitMode === 'equal' && Number.isFinite(parsedAmount) && (
                      <span className="w-full text-right text-sm font-bold text-[var(--muted)] sm:w-auto">
                        {formatMoney(equal[p.id] ?? 0, currency)}
                      </span>
                    )}
                    {on && splitMode === 'custom' && (
                      <TextInput
                        inputMode="decimal"
                        className="w-28 py-2 text-right"
                        value={amountShares[p.id] ?? ''}
                        onChange={(e) => setAmountShares((s) => ({ ...s, [p.id]: e.target.value }))}
                        placeholder="0"
                        aria-label={`${p.name} amount`}
                      />
                    )}
                    {on && splitMode === 'percent' && (
                      <div className="flex items-center gap-1">
                        <TextInput
                          inputMode="decimal"
                          className="w-20 py-2 text-right"
                          value={percentShares[p.id] ?? ''}
                          onChange={(e) => setPercentShares((s) => ({ ...s, [p.id]: e.target.value }))}
                          placeholder="0"
                          aria-label={`${p.name} percent`}
                        />
                        <span className="text-sm font-extrabold">%</span>
                        {Number.isFinite(parsedAmount) && (
                          <span className="hidden text-xs font-bold text-[var(--muted)] sm:inline">
                            {formatMoney(percentAmounts[p.id] ?? 0, currency)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {splitMode === 'equal' && Number.isFinite(parsedAmount) && participants.length > 0 && (
              <p className="mt-2 text-sm font-semibold text-[var(--muted)]">
                {participants.length} {participants.length === 1 ? 'person' : 'people'} ·{' '}
                {formatMoney(equal[participants[0]] ?? 0, currency)} each
              </p>
            )}
            {splitMode === 'custom' && Number.isFinite(parsedAmount) && (
              <p className={cn('mt-2 text-sm font-bold', Math.abs(amountLeft) < 0.005 ? 'text-[var(--muted)]' : 'text-rose-500')}>
                {Math.abs(amountLeft) < 0.005
                  ? `Adds up to ${formatMoney(parsedAmount, currency)}`
                  : `${formatMoney(Math.abs(amountLeft), currency)} ${amountLeft > 0 ? 'left' : 'over'}`}
              </p>
            )}
            {splitMode === 'percent' && (
              <p className={cn('mt-2 text-sm font-bold', Math.abs(percentLeft) < 0.005 ? 'text-[var(--muted)]' : 'text-rose-500')}>
                {Math.abs(percentLeft) < 0.005 ? 'Adds up to 100%' : `${roundTo(Math.abs(percentLeft), 2)}% ${percentLeft > 0 ? 'left' : 'over'}`}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">Category</p>
            <div className="flex flex-wrap gap-2">
              {trip.categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-bold',
                    categoryId === c.id ? 'bg-ink text-white dark:bg-white dark:text-ink' : 'bg-black/5 dark:bg-white/10',
                  )}
                >
                  {c.emoji} {c.name}
                </button>
              ))}
            </div>
          </div>

          <Field label="Note">
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nasi goreng, taxi, tickets…" />
          </Field>

          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button className="w-full flex-1" onClick={submit}>
              {editing ? 'Save changes' : 'Add expense'}
            </Button>
            {editing && onDelete && expense && (
              <Button variant="danger" onClick={() => onDelete(expense.id)}>
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

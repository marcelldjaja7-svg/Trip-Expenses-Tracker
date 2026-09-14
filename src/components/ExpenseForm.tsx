import { useMemo, useState } from 'react'
import { CURRENCIES } from '../lib/currencies'
import { equalShares, formatMoney, roundTo, sharesMatchTotal } from '../lib/money'
import { cn, todayISO, uid } from '../lib/utils'
import type { Expense, Trip } from '../types'
import { Avatar, Button, Field, Modal, Select, TextInput } from './ui'

type Props = {
  trip: Trip
  expense?: Expense | null
  open: boolean
  onClose: () => void
  onSave: (expense: Expense, rate?: { currency: string; rate: number }) => void
  onDelete?: (id: string) => void
}

export function ExpenseForm({ trip, expense, open, onClose, onSave, onDelete }: Props) {
  const editing = Boolean(expense)
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [currency, setCurrency] = useState(expense?.currency ?? trip.baseCurrency)
  const [paidBy, setPaidBy] = useState(expense?.paidBy ?? trip.people[0]?.id ?? '')
  const [participants, setParticipants] = useState<string[]>(
    expense?.participantIds ?? trip.people.map((p) => p.id),
  )
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>(expense?.splitMode ?? 'equal')
  const [shares, setShares] = useState<Record<string, string>>(() => {
    if (expense?.splitMode === 'custom' && expense.shares) {
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

  const customShares = useMemo(() => {
    const out: Record<string, number> = {}
    for (const id of participants) {
      const n = Number(shares[id])
      out[id] = Number.isFinite(n) ? n : 0
    }
    return out
  }, [participants, shares])

  const togglePerson = (id: string) => {
    setParticipants((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev
        return prev.filter((x) => x !== id)
      }
      return [...prev, id]
    })
  }

  const fillEqual = () => {
    setShares(Object.fromEntries(Object.entries(equal).map(([k, v]) => [k, String(v)])))
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
      setError('Pick at least one person sharing this.')
      return
    }
    if (splitMode === 'custom' && !sharesMatchTotal(customShares, parsedAmount, currency)) {
      setError(`Custom shares must add up to ${formatMoney(parsedAmount, currency)}.`)
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
      shares: splitMode === 'custom' ? customShares : undefined,
      categoryId,
      note: note.trim(),
      date,
      createdAt: expense?.createdAt ?? Date.now(),
    }
    onSave(
      next,
      currency === trip.baseCurrency ? undefined : { currency, rate },
    )
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
                placeholder="0.00"
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

          {currency === trip.baseCurrency && converted !== null && (
            <p className="text-sm text-[var(--muted)]">Saved in {trip.baseCurrency}.</p>
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
            <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">Split with</p>
            <div className="flex flex-wrap gap-2">
              {trip.people.map((p) => {
                const on = participants.includes(p.id)
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => togglePerson(p.id)}
                    data-on={on}
                    className={cn(
                      'chip flex items-center gap-2 rounded-full border px-2 py-1.5 pr-3 text-sm font-bold',
                      on ? 'border-transparent text-white shadow' : 'border-[var(--line)] bg-white/70 dark:bg-white/10',
                    )}
                    style={on ? { background: p.color } : undefined}
                  >
                    <Avatar person={p} size="sm" />
                    {p.name}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className={cn('rounded-full px-3 py-1 text-xs font-extrabold', splitMode === 'equal' && 'bg-rose-500 text-white')}
                onClick={() => setSplitMode('equal')}
              >
                Equal
              </button>
              <button
                type="button"
                className={cn('rounded-full px-3 py-1 text-xs font-extrabold', splitMode === 'custom' && 'bg-rose-500 text-white')}
                onClick={() => {
                  setSplitMode('custom')
                  fillEqual()
                }}
              >
                Custom shares
              </button>
            </div>
            {splitMode === 'equal' && Number.isFinite(parsedAmount) && participants.length > 0 && (
              <p className="mt-2 text-sm text-[var(--muted)]">
                {participants.length} ways · {formatMoney(equal[participants[0]] ?? 0, currency)} each
              </p>
            )}
            {splitMode === 'custom' && (
              <div className="mt-3 space-y-2">
                {participants.map((id) => {
                  const person = trip.people.find((p) => p.id === id)
                  if (!person) return null
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <Avatar person={person} size="sm" />
                      <span className="w-24 truncate text-sm font-bold">{person.name}</span>
                      <TextInput
                        inputMode="decimal"
                        value={shares[id] ?? ''}
                        onChange={(e) => setShares((s) => ({ ...s, [id]: e.target.value }))}
                      />
                    </div>
                  )
                })}
                <p className="text-sm text-[var(--muted)]">
                  Total {formatMoney(
                    Object.values(customShares).reduce((s, n) => s + n, 0),
                    currency,
                  )}{' '}
                  / {Number.isFinite(parsedAmount) ? formatMoney(parsedAmount, currency) : '—'}
                </p>
              </div>
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
            <Button className="flex-1" onClick={submit}>
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

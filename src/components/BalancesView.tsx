import { ArrowLeftRight, ArrowUpRight, Check, Copy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CURRENCIES } from '../lib/currencies'
import { convertAmount, formatMoney } from '../lib/money'
import { filledPaymentMethods, formatPaymentMethod } from '../lib/payments'
import { describeTransfer } from '../lib/share'
import { computeBalances, settlementExpense, suggestedTransfers } from '../lib/settle'
import { cn } from '../lib/utils'
import type { Trip } from '../types'
import { Avatar, Button, Group, GroupRow, SectionLabel, Select, TextInput } from './ui'

export function BalancesView({
  trip,
  onLogSettlement,
}: {
  trip: Trip
  onLogSettlement: (next: Trip) => void
}) {
  const balances = computeBalances(trip)
  const transfers = suggestedTransfers(trip)
  const maxAbs = Math.max(...balances.map((b) => Math.abs(b.net)), 1)
  const [payCurrency, setPayCurrency] = useState(trip.baseCurrency)
  const [convAmount, setConvAmount] = useState('')
  const [convFrom, setConvFrom] = useState(trip.baseCurrency)
  const [convTo, setConvTo] = useState(pickDefaultTo(trip.baseCurrency))

  const parsedConv = Number(convAmount)
  const convResult =
    Number.isFinite(parsedConv) && parsedConv > 0
      ? convertAmount(parsedConv, convFrom, convTo, trip)
      : null

  const chips = useMemo(() => {
    const codes = [trip.baseCurrency, 'USD', 'EUR', 'ISK', 'DKK', 'NOK', 'GBP', 'SGD']
    return [...new Set(codes)].filter((code) => CURRENCIES.some((c) => c.code === code))
  }, [trip.baseCurrency])

  const showConverted = payCurrency !== trip.baseCurrency

  return (
    <div>
      <SectionLabel>Pay in</SectionLabel>
      <p className="mb-2 px-4 text-[13px] text-[var(--muted)]">
        See suggested payments in another currency. Uses this trip’s rates — edit them under Trip.
      </p>
      <Group>
        <GroupRow>
          <span className="w-[5.75rem] shrink-0 text-[17px] text-[var(--muted)]">Show as</span>
          <Select
            className="min-w-0 flex-1 appearance-none rounded-none bg-transparent px-0 py-1 text-right dark:bg-transparent"
            value={payCurrency}
            aria-label="Show settle amounts in"
            onChange={(e) => setPayCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </Select>
        </GroupRow>
        <div className="row-sep flex flex-wrap gap-2 px-4 py-3">
          {chips.map((code) => (
            <button
              type="button"
              key={code}
              onClick={() => setPayCurrency(code)}
              className={cn(
                'min-h-[36px] rounded-full px-3 py-1.5 text-[13px] font-semibold',
                payCurrency === code ? 'bg-[var(--accent)] text-white' : 'bg-[var(--fill)]',
              )}
            >
              {code}
            </button>
          ))}
        </div>
      </Group>

      <SectionLabel>Converter</SectionLabel>
      <Group>
        <GroupRow>
          <span className="w-[5.75rem] shrink-0 text-[17px] text-[var(--muted)]">Amount</span>
          <TextInput
            className="rounded-none bg-transparent px-0 py-0 text-right text-[22px] font-semibold tabular-nums dark:bg-transparent"
            inputMode="decimal"
            value={convAmount}
            onChange={(e) => setConvAmount(e.target.value)}
            placeholder={transfers[0] ? String(transfers[0].amount) : '0'}
            aria-label="Amount to convert"
          />
        </GroupRow>
        <GroupRow>
          <span className="w-[5.75rem] shrink-0 text-[17px] text-[var(--muted)]">From</span>
          <Select
            className="min-w-0 flex-1 appearance-none rounded-none bg-transparent px-0 py-1 text-right dark:bg-transparent"
            value={convFrom}
            aria-label="Convert from currency"
            onChange={(e) => setConvFrom(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </Select>
        </GroupRow>
        <GroupRow>
          <span className="w-[5.75rem] shrink-0 text-[17px] text-[var(--muted)]">To</span>
          <Select
            className="min-w-0 flex-1 appearance-none rounded-none bg-transparent px-0 py-1 text-right dark:bg-transparent"
            value={convTo}
            aria-label="Convert to currency"
            onChange={(e) => setConvTo(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </Select>
        </GroupRow>
        <GroupRow>
          <button
            type="button"
            className="inline-flex min-h-[36px] items-center gap-1 text-[15px] font-medium text-[var(--accent)]"
            onClick={() => {
              setConvFrom(convTo)
              setConvTo(convFrom)
            }}
          >
            <ArrowLeftRight size={14} strokeWidth={2} /> Swap
          </button>
          <span className="flex-1 text-right text-[17px] font-semibold tabular-nums">
            {convResult === null ? '—' : formatMoney(convResult, convTo)}
          </span>
        </GroupRow>
      </Group>

      <SectionLabel>Balances</SectionLabel>
      <Group>
        {balances.map((b) => {
          const person = trip.people.find((p) => p.id === b.personId)
          if (!person) return null
          const settled = Math.abs(b.net) < 0.005
          const owed = b.net > 0
          const absNet = Math.abs(b.net)
          return (
            <GroupRow key={b.personId} inset className="py-3">
              <Avatar person={person} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-medium">{person.name}</p>
                <p className="text-[13px] text-[var(--muted)]">
                  paid {formatMoney(b.paid, trip.baseCurrency)} · share {formatMoney(b.share, trip.baseCurrency)}
                </p>
                <div className="balance-bar mt-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (Math.abs(b.net) / maxAbs) * 100)}%`,
                      background: settled ? 'var(--muted)' : person.color,
                    }}
                  />
                </div>
              </div>
              <p
                className={cn(
                  'text-right text-[17px] font-semibold tabular-nums',
                  settled && 'text-[var(--muted)]',
                  !settled && owed && 'text-[var(--positive)]',
                  !settled && !owed && 'text-[var(--negative)]',
                )}
              >
                {settled ? 'Settled' : owed ? formatMoney(b.net, trip.baseCurrency) : formatMoney(-b.net, trip.baseCurrency)}
                {!settled && (
                  <span className="mt-0.5 block text-[12px] font-medium">
                    {owed ? 'is owed' : 'owes'}
                    {showConverted
                      ? ` · ${formatMoney(convertAmount(absNet, trip.baseCurrency, payCurrency, trip), payCurrency)}`
                      : ''}
                  </span>
                )}
              </p>
            </GroupRow>
          )
        })}
      </Group>

      <SectionLabel>Suggested payments</SectionLabel>
      {transfers.length === 0 ? (
        <Group>
          <GroupRow>
            <p className="py-2 text-[15px] text-[var(--muted)]">Nobody owes anybody.</p>
          </GroupRow>
        </Group>
      ) : (
        <Group>
          {transfers.map((t) => {
            const from = trip.people.find((p) => p.id === t.fromId)
            const to = trip.people.find((p) => p.id === t.toId)
            if (!from || !to) return null
            const converted = showConverted
              ? convertAmount(t.amount, trip.baseCurrency, payCurrency, trip)
              : null
            const payHow = filledPaymentMethods(to)
            return (
              <GroupRow key={`${t.fromId}-${t.toId}-${t.amount}`} className="flex-wrap py-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative h-9 w-14 shrink-0">
                    <span className="absolute left-0 top-0">
                      <Avatar person={from} />
                    </span>
                    <span className="absolute left-5 top-0">
                      <Avatar person={to} />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-medium">
                      {from.name} <span className="text-[var(--muted)]">to</span> {to.name}
                    </p>
                    <p className="flex items-center gap-1 text-[15px] font-semibold tabular-nums">
                      <ArrowUpRight size={14} strokeWidth={2} className="text-[var(--accent)]" />
                      {formatMoney(t.amount, trip.baseCurrency)}
                    </p>
                    {converted !== null && (
                      <p className="text-[13px] font-medium tabular-nums text-[var(--muted)]">
                        ≈ {formatMoney(converted, payCurrency)}
                      </p>
                    )}
                    {payHow.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {payHow.map((method) => (
                          <p key={method.id} className="truncate text-[13px] text-[var(--muted)]">
                            {to.name}: {formatPaymentMethod(method)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    variant="secondary"
                    className="flex-1 px-3 py-2 text-[15px] sm:flex-none"
                    onClick={async () => {
                      await navigator.clipboard.writeText(describeTransfer(trip, t, payCurrency))
                    }}
                  >
                    <Copy size={14} strokeWidth={2} /> Copy
                  </Button>
                  <Button
                    className="flex-1 px-3 py-2 text-[15px] sm:flex-none"
                    onClick={() => {
                      onLogSettlement({
                        ...trip,
                        expenses: [...trip.expenses, settlementExpense(trip, t.fromId, t.toId, t.amount)],
                      })
                    }}
                  >
                    <Check size={14} strokeWidth={2.25} /> Log
                  </Button>
                </div>
              </GroupRow>
            )
          })}
        </Group>
      )}
    </div>
  )
}

function pickDefaultTo(base: string): string {
  if (base === 'USD') return 'EUR'
  if (base === 'EUR') return 'USD'
  return 'USD'
}

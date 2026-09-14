import { ArrowRight, Check, Copy, Sparkles } from 'lucide-react'
import { formatMoney } from '../lib/money'
import { describeTransfer } from '../lib/share'
import { computeBalances, settlementExpense, suggestedTransfers } from '../lib/settle'
import { cn } from '../lib/utils'
import type { Trip } from '../types'
import { Avatar, Button } from './ui'

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

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {balances.map((b) => {
          const person = trip.people.find((p) => p.id === b.personId)
          if (!person) return null
          const settled = Math.abs(b.net) < 0.005
          const owed = b.net > 0
          return (
            <div key={b.personId} className="card-solid rounded-3xl p-4">
              <div className="flex items-center gap-3">
                <Avatar person={person} />
                <div className="min-w-0">
                  <p className="truncate font-extrabold">{person.name}</p>
                  <p className="text-sm font-semibold text-[var(--muted)]">
                    paid {formatMoney(b.paid, trip.baseCurrency)} · share {formatMoney(b.share, trip.baseCurrency)}
                  </p>
                </div>
              </div>
              <p
                className={cn(
                  'mt-3 font-display text-2xl',
                  settled && 'text-[var(--muted)]',
                  !settled && owed && 'text-teal-600 dark:text-teal-400',
                  !settled && !owed && 'text-rose-600 dark:text-rose-400',
                )}
              >
                {settled
                  ? 'All square'
                  : owed
                    ? `is owed ${formatMoney(b.net, trip.baseCurrency)}`
                    : `owes ${formatMoney(-b.net, trip.baseCurrency)}`}
              </p>
              <div className="balance-bar mt-3">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (Math.abs(b.net) / maxAbs) * 100)}%`,
                    background: settled ? '#a8a29e' : person.color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <section className="card-solid rounded-[1.75rem] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-amber-500" />
          <h3 className="font-display text-xl">Settle up</h3>
        </div>
        {transfers.length === 0 ? (
          <p className="text-[var(--muted)]">Nobody owes anybody. That’s a rare and beautiful thing.</p>
        ) : (
          <div className="space-y-3">
            {transfers.map((t) => {
              const from = trip.people.find((p) => p.id === t.fromId)
              const to = trip.people.find((p) => p.id === t.toId)
              if (!from || !to) return null
              return (
                <div
                  key={`${t.fromId}-${t.toId}-${t.amount}`}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white/50 p-3 sm:flex-row sm:items-center sm:justify-between dark:bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <Avatar person={from} />
                    <ArrowRight size={16} className="text-[var(--muted)]" />
                    <Avatar person={to} />
                    <div>
                      <p className="font-extrabold">
                        {from.name} → {to.name}
                      </p>
                      <p className="font-display text-lg">{formatMoney(t.amount, trip.baseCurrency)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        await navigator.clipboard.writeText(describeTransfer(trip, t))
                      }}
                    >
                      <Copy size={14} /> Copy
                    </Button>
                    <Button
                      onClick={() => {
                        onLogSettlement({
                          ...trip,
                          expenses: [...trip.expenses, settlementExpense(trip, t.fromId, t.toId, t.amount)],
                        })
                      }}
                    >
                      <Check size={14} /> Log payment
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

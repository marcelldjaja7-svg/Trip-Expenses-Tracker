import { ArrowUpRight, Check, Copy } from 'lucide-react'
import { formatMoney } from '../lib/money'
import { describeTransfer } from '../lib/share'
import { computeBalances, settlementExpense, suggestedTransfers } from '../lib/settle'
import { cn } from '../lib/utils'
import type { Trip } from '../types'
import { Avatar, Button, Group, GroupRow, SectionLabel } from './ui'

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
    <div>
      <SectionLabel>Balances</SectionLabel>
      <Group>
        {balances.map((b) => {
          const person = trip.people.find((p) => p.id === b.personId)
          if (!person) return null
          const settled = Math.abs(b.net) < 0.005
          const owed = b.net > 0
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
                  </div>
                </div>
                <div className="flex w-full gap-2 sm:w-auto">
                  <Button
                    variant="secondary"
                    className="flex-1 px-3 py-2 text-[15px] sm:flex-none"
                    onClick={async () => {
                      await navigator.clipboard.writeText(describeTransfer(trip, t))
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

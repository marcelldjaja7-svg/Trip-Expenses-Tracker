import type { PaymentKind, PaymentMethod, Person } from '../types'

export const PAYMENT_KINDS: { id: PaymentKind; label: string }[] = [
  { id: 'bank', label: 'Bank' },
  { id: 'ewallet', label: 'E-wallet' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'wise', label: 'Wise' },
  { id: 'venmo', label: 'Venmo' },
  { id: 'cash', label: 'Cash' },
  { id: 'other', label: 'Other' },
]

const KIND_IDS = new Set(PAYMENT_KINDS.map((k) => k.id))

export function isPaymentKind(value: string): value is PaymentKind {
  return KIND_IDS.has(value as PaymentKind)
}

export function paymentKindLabel(kind: PaymentKind): string {
  return PAYMENT_KINDS.find((k) => k.id === kind)?.label ?? 'Other'
}

export function accountPlaceholder(kind: PaymentKind): string {
  if (kind === 'bank') return 'Account / IBAN'
  if (kind === 'ewallet') return 'Phone or wallet ID'
  if (kind === 'paypal') return 'PayPal email'
  if (kind === 'wise') return 'Email or account'
  if (kind === 'venmo') return '@username'
  if (kind === 'cash') return 'Where to meet'
  return 'Account or handle'
}

export function emptyPaymentMethod(id: string, kind: PaymentKind = 'bank'): PaymentMethod {
  return { id, kind, label: '', accountName: '', accountNumber: '', details: '' }
}

export function formatPaymentMethod(method: PaymentMethod): string {
  const kind = paymentKindLabel(method.kind)
  const title = method.label.trim() || kind
  const who = method.accountName?.trim()
  const account = method.accountNumber?.trim()
  const extra = method.details?.trim()
  const head = method.label.trim() && method.label.trim().toLowerCase() !== kind.toLowerCase() ? `${kind} · ${title}` : title
  return [head, who, account, extra].filter(Boolean).join(' · ')
}

export function filledPaymentMethods(person: Person | undefined): PaymentMethod[] {
  if (!person?.paymentMethods?.length) return []
  return person.paymentMethods.filter(
    (m) => m.label.trim() || m.accountName?.trim() || m.accountNumber?.trim() || m.details?.trim(),
  )
}

export function primaryPayment(person: Person | undefined): PaymentMethod | undefined {
  return filledPaymentMethods(person)[0]
}

import { Moon, Sun, X } from 'lucide-react'
import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { cn } from '../lib/utils'
import { useStore } from '../state'
import type { Person } from '../types'

export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}) {
  const styles = {
    primary:
      'bg-linear-to-br from-rose-500 to-amber-500 text-white shadow-md shadow-rose-500/20 hover:brightness-105',
    secondary: 'bg-white/70 dark:bg-white/10 border border-[var(--line)] hover:bg-white dark:hover:bg-white/15',
    ghost: 'hover:bg-black/5 dark:hover:bg-white/10',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
  } as const
  return (
    <button
      type="button"
      className={cn(
        'pressable inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 disabled:pointer-events-none',
        styles[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Avatar({ person, size = 'md' }: { person: Person; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'h-7 w-7 text-[11px]' : size === 'lg' ? 'h-12 w-12 text-lg' : 'h-9 w-9 text-sm'
  const initial = person.name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white shadow-sm ring-2 ring-white/70 dark:ring-black/30',
        dim,
      )}
      style={{ background: person.color }}
      title={person.name}
    >
      {initial}
    </span>
  )
}

export function AvatarStack({ people }: { people: Person[] }) {
  return (
    <div className="flex -space-x-2">
      {people.slice(0, 5).map((p) => (
        <Avatar key={p.id} person={p} size="sm" />
      ))}
      {people.length > 5 && (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/10 text-[11px] font-bold dark:bg-white/15">
          +{people.length - 5}
        </span>
      )}
    </div>
  )
}

export function ThemeToggle() {
  const { data, setTheme } = useStore()
  const next = data.theme === 'dark' ? 'light' : data.theme === 'light' ? 'system' : 'dark'
  const label = data.theme === 'system' ? 'System' : data.theme === 'dark' ? 'Dark' : 'Light'
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="pressable inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/50 px-3 py-2 text-sm font-bold dark:bg-white/10"
      aria-label={`Theme: ${label}. Click to switch.`}
      title={`Theme: ${label}`}
    >
      {data.theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'sheet-in relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl card-solid',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button type="button" className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="scrollbar-thin overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">{label}</span>
      {children}
    </label>
  )
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-2xl border border-[var(--line)] bg-white/80 px-3 py-2.5 outline-none ring-rose-400/40 focus:ring-2 dark:bg-black/20',
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-2xl border border-[var(--line)] bg-white/80 px-3 py-2.5 outline-none ring-rose-400/40 focus:ring-2 dark:bg-black/20',
        className,
      )}
      {...props}
    />
  )
}

export function Toast({ message }: { message: string }) {
  return (
    <div className="fade-up pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white shadow-lg dark:bg-white dark:text-ink">
      {message}
    </div>
  )
}

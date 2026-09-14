import { ChevronRight, Moon, Sun, X } from 'lucide-react'
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
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'plain'
}) {
  const styles = {
    primary: 'bg-[var(--accent)] text-white hover:brightness-110',
    secondary: 'bg-[var(--fill)] text-[var(--text)] hover:bg-[var(--fill-strong)]',
    ghost: 'text-[var(--accent)] hover:bg-[var(--fill)]',
    danger: 'bg-[var(--danger)] text-white hover:brightness-110',
    plain: 'text-[var(--accent)] px-2 py-2',
  } as const
  return (
    <button
      type="button"
      className={cn(
        'pressable inline-flex items-center justify-center gap-2 rounded-full px-4 py-[11px] text-[17px] font-semibold disabled:opacity-40 disabled:pointer-events-none',
        styles[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Avatar({ person, size = 'md' }: { person: Person; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'h-7 w-7 text-[12px]' : size === 'lg' ? 'h-11 w-11 text-[17px]' : 'h-9 w-9 text-[15px]'
  const initial = person.name.trim().charAt(0).toUpperCase() || '?'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
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
    <div className="flex -space-x-1.5">
      {people.slice(0, 5).map((p) => (
        <Avatar key={p.id} person={p} size="sm" />
      ))}
      {people.length > 5 && (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--fill)] text-[11px] font-semibold text-[var(--muted)]">
          +{people.length - 5}
        </span>
      )}
    </div>
  )
}

export function Glyph({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-[var(--fill)] text-[16px]',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function ThemeToggle() {
  const { data, setTheme } = useStore()
  const dark = data.theme !== 'light'
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className="pressable inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--fill)] text-[var(--text)]"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Dark' : 'Light'}
    >
      {dark ? <Moon size={16} strokeWidth={1.75} /> : <Sun size={16} strokeWidth={1.75} />}
    </button>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
  leading,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
  leading?: ReactNode
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
      <button
        type="button"
        className="overlay-in absolute inset-0 bg-[var(--sheet-overlay)] backdrop-blur-[8px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'sheet-in relative z-10 flex max-h-[min(92dvh,100%)] w-full min-h-0 flex-col overflow-hidden rounded-t-[28px] bg-[var(--bg-elevated)] sm:rounded-[28px]',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-[var(--fill-strong)] sm:hidden" />
        <div className="grid grid-cols-[minmax(4.5rem,1fr)_auto_minmax(4.5rem,1fr)] items-center px-2 pb-1 pt-1 sm:pt-3">
          {leading ?? (
            <button
              type="button"
              className="pressable justify-self-start px-2 text-left text-[17px] text-[var(--accent)]"
              onClick={onClose}
            >
              Cancel
            </button>
          )}
          <h2 className="text-center text-[17px] font-semibold">{title}</h2>
          <button
            type="button"
            className="justify-self-end rounded-full p-2 text-[var(--muted)] hover:bg-[var(--fill)]"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="scrollbar-thin min-h-0 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1">
          {children}
        </div>
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="px-1 text-[13px] font-normal text-[var(--muted)]">{label}</span>
      {children}
    </label>
  )
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-w-0 rounded-xl bg-[var(--grouped)] px-3.5 py-[11px] text-[17px] outline-none ring-[var(--accent)] focus:ring-2 dark:bg-[var(--grouped-2)]',
        !className?.match(/(?:^|\s)w-/) && 'w-full',
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
        'min-w-0 appearance-none rounded-xl bg-[var(--grouped)] px-3.5 py-[11px] text-[17px] outline-none ring-[var(--accent)] focus:ring-2 dark:bg-[var(--grouped-2)]',
        !className?.match(/(?:^|\s)w-/) && 'w-full',
        className,
      )}
      {...props}
    />
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 pb-1.5 pt-6 text-[13px] font-normal uppercase tracking-[0.04em] text-[var(--muted)] first:pt-2">
      {children}
    </p>
  )
}

export function Group({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grouped rounded-[12px]', className)}>{children}</div>
}

export function GroupRow({
  children,
  onClick,
  className,
  inset,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  inset?: boolean
}) {
  const cls = cn(
    'row-sep relative flex w-full min-h-[44px] items-center gap-3 px-4 py-2.5 text-left',
    inset && 'row-sep-inset',
    onClick && 'pressable',
    className,
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {children}
      </button>
    )
  }
  return <div className={cls}>{children}</div>
}

export function Chevron() {
  return <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-[var(--muted)] opacity-50" />
}

export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-3 rounded-[9px] bg-[var(--fill)] p-[2px]">
      {options.map((opt) => (
        <button
          type="button"
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            'rounded-[7px] py-1.5 text-[13px] font-semibold transition-[background,color,box-shadow] duration-200',
            value === opt.id
              ? 'bg-white text-black shadow-sm dark:bg-[var(--grouped-3)] dark:text-white'
              : 'text-[var(--muted)]',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function Toast({ message }: { message: string }) {
  return (
    <div className="fade-up pointer-events-none fixed bottom-[max(2rem,env(safe-area-inset-bottom))] left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#1c1c1e] px-4 py-2 text-[15px] font-semibold text-white shadow-lg dark:bg-white dark:text-black">
      {message}
    </div>
  )
}

export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto min-h-dvh w-full max-w-[430px] overflow-x-hidden px-4 pb-10 sm:max-w-2xl', className)}>
      {children}
    </div>
  )
}

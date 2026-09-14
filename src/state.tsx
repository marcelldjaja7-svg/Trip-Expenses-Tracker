import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppData, Theme, Trip } from './types'
import { createDemoTrip, emptyTrip } from './lib/demo'
import { parseImportFromLocation } from './lib/share'
import { defaultAppData, loadAppData, normalizeAppData, normalizeTrip, saveAppData } from './lib/storage'
import { nextPersonColor } from './lib/colors'
import { uid } from './lib/utils'

type Toast = { id: string; message: string }

type StoreValue = {
  data: AppData
  currentTrip: Trip | null
  toast: Toast | null
  setTheme: (theme: Theme) => void
  selectTrip: (id: string | null) => void
  createTrip: (input: {
    name: string
    emoji: string
    baseCurrency: string
    startDate?: string
    endDate?: string
    people: string[]
  }) => Trip
  saveTrip: (trip: Trip) => void
  deleteTrip: (id: string) => void
  loadDemo: () => Trip
  importData: (raw: unknown) => boolean
  resetAll: () => void
  notify: (message: string) => void
}

const StoreContext = createContext<StoreValue | null>(null)

function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadAppData())
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    saveAppData(data)
    applyTheme(data.theme)
  }, [data])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme(data.theme)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [data.theme])

  useEffect(() => {
    const shared = parseImportFromLocation()
    if (!shared) return
    const imported = { ...shared, isDemo: false, id: uid(), updatedAt: Date.now() }
    setData((prev) => {
      if (prev.trips.some((t) => t.id === shared.id)) {
        return { ...prev, currentTripId: shared.id }
      }
      return {
        ...prev,
        trips: [imported, ...prev.trips],
        currentTripId: imported.id,
      }
    })
    window.history.replaceState(null, '', window.location.pathname)
    setToast({ id: uid(), message: `Imported “${shared.name}”` })
  }, [])

  const notify = (message: string) => {
    const id = uid()
    setToast({ id, message })
    window.setTimeout(() => {
      setToast((t) => (t?.id === id ? null : t))
    }, 2400)
  }

  const value = useMemo<StoreValue>(() => {
    const currentTrip = data.trips.find((t) => t.id === data.currentTripId) ?? null
    return {
      data,
      currentTrip,
      toast,
      setTheme: (theme) => setData((d) => ({ ...d, theme })),
      selectTrip: (id) => setData((d) => ({ ...d, currentTripId: id })),
      createTrip: (input) => {
        const trip = emptyTrip(input.name, input.emoji, input.baseCurrency)
        trip.startDate = input.startDate ?? ''
        trip.endDate = input.endDate ?? ''
        const colors: string[] = []
        trip.people = input.people
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => {
            const color = nextPersonColor(colors)
            colors.push(color)
            return { id: uid(), name, color }
          })
        setData((d) => ({
          ...d,
          trips: [trip, ...d.trips],
          currentTripId: trip.id,
        }))
        return trip
      },
      saveTrip: (trip) =>
        setData((d) => ({
          ...d,
          trips: d.trips.map((t) => (t.id === trip.id ? { ...trip, updatedAt: Date.now(), isDemo: false } : t)),
        })),
      deleteTrip: (id) =>
        setData((d) => {
          const trips = d.trips.filter((t) => t.id !== id)
          return {
            ...d,
            trips,
            currentTripId: d.currentTripId === id ? trips[0]?.id ?? null : d.currentTripId,
          }
        }),
      loadDemo: () => {
        const trip = createDemoTrip()
        setData((d) => ({
          ...d,
          trips: [trip, ...d.trips.filter((t) => !t.isDemo)],
          currentTripId: trip.id,
        }))
        return trip
      },
      importData: (raw) => {
        const parsed = normalizeAppData(raw)
        if (parsed && parsed.trips.length > 0) {
          setData((d) => {
            const ids = new Set(d.trips.map((t) => t.id))
            const incoming = parsed.trips.map((t) => (ids.has(t.id) ? { ...t, id: uid() } : t))
            return {
              ...d,
              trips: [...incoming, ...d.trips],
              currentTripId: incoming[0]?.id ?? d.currentTripId,
            }
          })
          return true
        }
        const one = normalizeTrip(raw)
        if (!one) return false
        const id = uid()
        setData((d) => ({
          ...d,
          trips: [{ ...one, id }, ...d.trips],
          currentTripId: id,
        }))
        return true
      },
      resetAll: () => setData(defaultAppData()),
      notify,
    }
  }, [data, toast])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

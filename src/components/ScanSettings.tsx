import { useEffect, useState } from 'react'
import { loadVisionKey, maskVisionKey, saveVisionKey } from '../lib/receipt'
import { Group, GroupRow, TextInput } from './ui'

export function ScanSettings({ onNotify }: { onNotify?: (message: string) => void }) {
  const [saved, setSaved] = useState(() => loadVisionKey())
  const [draft, setDraft] = useState('')

  useEffect(() => {
    setSaved(loadVisionKey())
  }, [])

  const persist = (value: string) => {
    saveVisionKey(value)
    setSaved(value.trim())
    setDraft('')
    onNotify?.(value.trim() ? 'Scanner key saved on this device' : 'Scanner key removed')
  }

  return (
    <>
      <p className="mb-2 px-4 text-[13px] text-[var(--muted)]">
        Optional. Paste a Google Gemini API key to scan receipt photos. Stored only in this browser — never in trip
        backups or live invite links. The rest of TripTab works without it.
      </p>
      <Group>
        {saved ? (
          <>
            <GroupRow>
              <span className="flex-1 text-[17px]">Key on this phone</span>
              <span className="text-[15px] tabular-nums text-[var(--muted)]">{maskVisionKey(saved)}</span>
            </GroupRow>
            <GroupRow onClick={() => persist('')}>
              <span className="flex-1 text-[17px] text-[var(--danger)]">Remove key</span>
            </GroupRow>
          </>
        ) : (
          <div className="space-y-2 px-4 py-3">
            <TextInput
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="AIza…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={() => persist(draft)}
              className="pressable min-h-[44px] w-full rounded-full bg-[var(--accent)] text-[15px] font-semibold text-white disabled:opacity-40"
            >
              Save key
            </button>
          </div>
        )}
      </Group>
      <p className="mt-2 px-4 text-[13px] text-[var(--muted)]">
        Create a key at{' '}
        <a
          className="text-[var(--accent)]"
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
        >
          Google AI Studio
        </a>
        . Free tier is enough for occasional scans.
      </p>
    </>
  )
}

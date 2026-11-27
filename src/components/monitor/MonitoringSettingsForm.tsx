'use client'

import { toast } from '@/components/ui/ToasterProvider'
import { useState } from 'react'
import { apiRequest } from '@/lib/client/request'
import { DEFAULT_SETTINGS, LOCKED_AFTER_START, NUMBERS, TOGGLES, type MonitoringSettings, type NumberKey } from '@/lib/monitoring'

type Props = { examId: number; initial: MonitoringSettings; recordingLocked: boolean }

export function MonitoringSettingsForm({ examId, initial, recordingLocked }: Props) {
  const [settings, setSettings] = useState(initial)
  const [locked, setLocked] = useState(recordingLocked)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fixed = (key: keyof MonitoringSettings) => locked && LOCKED_AFTER_START.includes(key)

  function change(patch: Partial<MonitoringSettings>) {
    setSettings((current) => ({ ...current, ...patch }))
    setMessage('')
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await apiRequest<{ recordingLocked: boolean }>(`/api/exams/${examId}/monitoring`, 'PUT', settings)
      setLocked(result.recordingLocked)
      setMessage('')
      toast.success('Monitoring rules saved', { description: 'Candidates see the updated list before they start.' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="surface-card space-y-4 p-5 text-sm">
      <div>
        <h2 className="font-display font-semibold">What to record</h2>
        <p className="mt-1 text-[color:var(--muted)]">
          {locked
            ? 'Candidates have started and were told what is recorded, so those choices are locked. The board limits can still change.'
            : 'Candidates see this list before they start.'}
        </p>
      </div>

      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Indicators</legend>
        {TOGGLES.map((toggle) => (
          <label key={toggle.key} className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5"
              disabled={fixed(toggle.key)}
              checked={settings[toggle.key]}
              onChange={(e) => change({ [toggle.key]: e.target.checked })}
            />
            <span>
              {toggle.option}
              <span className="block text-xs text-[color:var(--muted)]">{toggle.source === 'server' ? 'Seen by the server' : 'Reported by the browser'}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(NUMBERS) as NumberKey[]).map((key) => (
          <label key={key}>
            <span className="mb-1 block font-medium">{NUMBERS[key].label}</span>
            <input
              type="number"
              required
              min={NUMBERS[key].min}
              max={NUMBERS[key].max}
              step={1}
              disabled={fixed(key)}
              value={Number.isNaN(settings[key]) ? '' : settings[key]}
              onChange={(e) => change({ [key]: e.target.valueAsNumber })}
              className="input-clean w-32 px-3 py-2 disabled:opacity-60"
            />
            <span className="mt-1 block text-xs text-[color:var(--muted)]">{NUMBERS[key].help}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="btn-primary px-4 py-2 disabled:opacity-60">{busy ? 'Saving...' : 'Save settings'}</button>
        {!locked && (
          <button type="button" onClick={() => change(DEFAULT_SETTINGS)} className="btn-ghost px-3 py-2">Use defaults</button>
        )}
        {message && <span role="status" style={{ color: 'var(--success)' }}>{message}</span>}
        {error && <span role="alert" style={{ color: 'var(--danger)' }}>{error}</span>}
      </div>
    </form>
  )
}

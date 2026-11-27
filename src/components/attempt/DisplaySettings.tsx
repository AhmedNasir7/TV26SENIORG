'use client'

import { useState } from 'react'
import { apiRequest } from '@/lib/client/request'
import { DEFAULT_PREFERENCES, PREFERENCE_OPTIONS, type PreferenceKey, type Preferences } from '@/lib/preferences'

/** Applies a choice at once and keeps it on the server, so it follows the candidate to any device. */
export function usePreferences(initial: Preferences) {
  const [preferences, setPreferences] = useState(initial)
  const [message, setMessage] = useState('')

  function save(next: Preferences) {
    setPreferences(next)
    setMessage('')
    apiRequest('/api/me/preferences', 'PUT', next)
      .then(() => setMessage('Saved to your account'))
      .catch(() => setMessage('Applied here, but not saved. Try again when connected.'))
  }

  return { preferences, save, message }
}

type Props = ReturnType<typeof usePreferences> & { listAllowed: boolean }

export function DisplaySettings({ preferences, save, message, listAllowed }: Props) {
  return (
    <details className="surface-card p-4 text-sm">
      <summary className="cursor-pointer font-medium">Display settings</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {(Object.keys(PREFERENCE_OPTIONS) as PreferenceKey[]).map((key) => (
          <label key={key}>
            <span className="mb-1 block font-medium">{PREFERENCE_OPTIONS[key].label}</span>
            <select
              value={preferences[key]}
              disabled={key === 'view' && !listAllowed}
              onChange={(e) => save({ ...preferences, [key]: e.target.value } as Preferences)}
              className="input-clean w-full px-3 py-2 disabled:opacity-60"
            >
              {PREFERENCE_OPTIONS[key].choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        ))}
      </div>
      {!listAllowed && <p className="mt-2 text-[color:var(--muted)]">This examination shows one question at a time.</p>}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => save(DEFAULT_PREFERENCES)} className="btn-ghost px-3 py-1.5">Reset to default</button>
        <span role="status" className="text-[color:var(--muted)]">{message}</span>
      </div>
    </details>
  )
}

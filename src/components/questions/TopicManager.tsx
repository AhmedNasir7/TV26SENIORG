'use client'

import { useState } from 'react'
import { apiRequest } from '@/lib/client/request'
import type { Topic } from './types'

export function TopicManager({ topics, onChanged }: { topics: Topic[]; onChanged: () => void }) {
  const [selected, setSelected] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await apiRequest(selected ? `/api/topics/${selected}` : '/api/topics', selected ? 'PATCH' : 'POST', { name })
      setName('')
      setSelected('')
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the topic')
    }
  }

  return (
    <form onSubmit={save} className="surface-card mb-4 flex flex-wrap items-center gap-3 p-4">
      <span className="text-sm font-medium">Topics</span>
      <select
        aria-label="Topic to rename"
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value)
          setName(topics.find((t) => String(t.id) === e.target.value)?.name ?? '')
        }}
        className="input-clean px-3 py-2 text-sm"
      >
        <option value="">New topic</option>
        {topics.map((t) => (
          <option key={t.id} value={t.id}>
            Rename: {t.name} ({t._count.questions})
          </option>
        ))}
      </select>
      <input aria-label="Topic name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Topic name" className="input-clean px-3 py-2 text-sm" />
      <button type="submit" className="btn-secondary px-3 py-2 text-sm">
        {selected ? 'Rename' : 'Add topic'}
      </button>
      {error && <span role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</span>}
    </form>
  )
}

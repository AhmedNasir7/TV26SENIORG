'use client'

import { useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { downloadText } from '@/lib/client/download'
import { apiRequest } from '@/lib/client/request'
import { CANDIDATE_TEMPLATE, QUESTION_TEMPLATE } from '@/lib/import-parse'
import type { RowReport } from '@/lib/services/imports'

type Reply = {
  rows: RowReport[]
  valid: number
  invalid: number
  committed: boolean
  created: number
  enrolled: number
  passwords: Array<{ email: string; temporaryPassword: string }>
}
type Props = { exams: Array<{ id: number; title: string }> }

// A leading =, +, - or @ would run as a formula in a spreadsheet
const csvCell = (value: string) => `"${value.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`

export function ImportWizard({ exams }: Props) {
  const [kind, setKind] = useState<'candidates' | 'questions'>('candidates')
  const [file, setFile] = useState<{ name: string; content: string } | null>(null)
  const [examId, setExamId] = useState('')
  const [report, setReport] = useState<Reply | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const confirm = useConfirm()

  function reset(next: typeof kind) {
    setKind(next)
    setFile(null)
    setReport(null)
    setError('')
  }

  async function pick(chosen: File | undefined) {
    setReport(null)
    setError('')
    if (!chosen) return setFile(null)
    if (chosen.size > 200_000) return setError('Choose a file smaller than 200 KB')
    setFile({ name: chosen.name, content: await chosen.text() })
  }

  async function send(commit: boolean) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      setReport(
        await apiRequest<Reply>(`/api/import/${kind}`, 'POST', {
          content: file.content,
          format: file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv',
          commit,
          ...(kind === 'candidates' && examId && { examId: Number(examId) }),
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The import failed')
    } finally {
      setBusy(false)
    }
  }

  async function importNow() {
    const ok = await confirm({
      title: `Import ${report?.valid} ${kind}?`,
      body: 'Everything is added together. If any part fails, nothing is added.',
      action: 'Import',
    })
    if (ok) await send(true)
  }

  const errorReport = () =>
    'row,problem\n' + (report?.rows ?? []).filter((r) => r.errors.length).map((r) => `${r.row},${csvCell(r.errors.join('; '))}`).join('\n')
  const passwordFile = () =>
    'email,temporary password\n' + (report?.passwords ?? []).map((p) => `${csvCell(p.email)},${csvCell(p.temporaryPassword)}`).join('\n')

  return (
    <div className="space-y-6">
      <div className="segmented">
        {(['candidates', 'questions'] as const).map((value) => (
          <button key={value} type="button" aria-current={kind === value ? 'page' : undefined} onClick={() => reset(value)} className="segmented-item">
            {value === 'candidates' ? 'Candidates' : 'Questions'}
          </button>
        ))}
      </div>

      <section className="surface-card space-y-5 p-6 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-medium">1. Choose a CSV or JSON file</p>
          <button type="button" onClick={() => downloadText(`${kind}-template.csv`, kind === 'candidates' ? CANDIDATE_TEMPLATE : QUESTION_TEMPLATE)} className="btn-secondary px-3 py-2">
            Download a template
          </button>
        </div>
        <input key={kind} type="file" accept=".csv,.json,text/csv,application/json" aria-label="Import file" onChange={(e) => pick(e.target.files?.[0])} className="input-clean w-full px-3 py-2.5" />
        {kind === 'candidates' && (
          <label className="block">
            <span className="mb-1.5 block font-medium">Also enrol them in (optional)</span>
            <select value={examId} onChange={(e) => { setExamId(e.target.value); setReport(null) }} className="input-clean w-full max-w-md px-3 py-2.5">
              <option value="">No examination</option>
              {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}
            </select>
          </label>
        )}
        <button type="button" disabled={!file || busy} onClick={() => send(false)} className="btn-primary px-4 py-2.5 disabled:opacity-50">
          {busy ? 'Working...' : '2. Check the file'}
        </button>
        {error && <p role="alert" style={{ color: 'var(--danger)' }}>{error}</p>}
      </section>

      {report && (
        <section className="surface-card space-y-4 p-6 text-sm" aria-live="polite">
          {report.committed ? (
            <>
              <p className="font-medium" style={{ color: 'var(--success)' }}>
                Imported {report.created}{report.enrolled > 0 && `, enrolled ${report.enrolled}`}.
              </p>
              {report.passwords.length > 0 && (
                <>
                  <p>Temporary passwords are shown only now. Download them and share each one privately.</p>
                  <button type="button" onClick={() => downloadText('temporary-passwords.csv', passwordFile())} className="btn-primary px-4 py-2.5">
                    Download passwords
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium">{report.valid} ready · {report.invalid} with problems</p>
                {report.invalid === 0 ? (
                  <button type="button" disabled={busy} onClick={importNow} className="btn-primary px-4 py-2.5">3. Import</button>
                ) : (
                  <button type="button" onClick={() => downloadText('import-errors.csv', errorReport())} className="btn-secondary px-4 py-2.5">
                    Download the error report
                  </button>
                )}
              </div>
              <ul className="max-h-96 space-y-2 overflow-y-auto">
                {report.rows.map((row) => (
                  <li key={row.row} className="hairline-row pb-2">
                    <span className="mr-2 text-[color:var(--muted)]">Row {row.row}</span>
                    {row.summary}
                    {row.note && <span className="chip ml-2">{row.note}</span>}
                    {row.errors.map((e) => <span key={e} className="block" style={{ color: 'var(--danger)' }}>{e}</span>)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  )
}

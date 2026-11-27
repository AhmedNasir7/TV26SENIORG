export type DraftOption = { key: number; text: string; correct: boolean }

type Props = { single: boolean; options: DraftOption[]; onChange: (options: DraftOption[]) => void }

export function OptionsEditor({ single, options, onChange }: Props) {
  const patch = (key: number, change: Partial<DraftOption>) =>
    onChange(
      options.map((o) =>
        o.key === key ? { ...o, ...change } : single && change.correct ? { ...o, correct: false } : o
      )
    )

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium">
        Options · mark the correct {single ? 'one' : 'ones'}
      </legend>
      {options.map((option, index) => (
        <div key={option.key} className="flex items-center gap-2">
          <input
            type={single ? 'radio' : 'checkbox'}
            name="correct-option"
            aria-label={`Option ${index + 1} is correct`}
            checked={option.correct}
            onChange={(e) => patch(option.key, { correct: e.target.checked })}
          />
          <input
            aria-label={`Option ${index + 1}`}
            maxLength={1000}
            value={option.text}
            onChange={(e) => patch(option.key, { text: e.target.value })}
            className="input-clean flex-1 px-3 py-1.5 text-sm"
          />
          <button type="button" disabled={options.length <= 2} onClick={() => onChange(options.filter((o) => o.key !== option.key))} className="btn-ghost px-2 py-1 text-xs disabled:opacity-40">
            Remove
          </button>
        </div>
      ))}
      {options.length < 8 && (
        <button type="button" onClick={() => onChange([...options, { key: Math.max(0, ...options.map((o) => o.key)) + 1, text: '', correct: false }])} className="btn-ghost px-2 py-1 text-xs">
          Add option
        </button>
      )}
    </fieldset>
  )
}

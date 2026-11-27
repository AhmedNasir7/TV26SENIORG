'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useId, useState } from 'react'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  disabled?: boolean
  required?: boolean
  minLength?: number
  hint?: string
}

/** A password box with a show/hide button. */
export function PasswordField({ label, value, onChange, hint, required = true, ...rest }: Props) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="input-clean w-full py-3.5 pl-4 pr-12 text-[15px]"
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {hint && <p className="mt-1.5 text-xs text-[color:var(--muted)]">{hint}</p>}
    </div>
  )
}

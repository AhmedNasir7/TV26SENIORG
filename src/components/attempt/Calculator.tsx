'use client'

import { Calculator as CalculatorIcon } from 'lucide-react'
import { useState } from 'react'
import { calculate } from '@/lib/calc'

export function Calculator() {
  const [expression, setExpression] = useState('')
  const result = calculate(expression)
  return (
    <div className="shrink-0 rounded-2xl border-2 border-[var(--border-strong)] bg-[var(--surface-muted)] p-4">
      <label htmlFor="calculator" className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <CalculatorIcon className="h-5 w-5" aria-hidden="true" /> Calculator
      </label>
      <div className="flex items-stretch gap-3">
        <input
          id="calculator"
          inputMode="decimal"
          autoComplete="off"
          placeholder="(12 + 8) * 3"
          maxLength={200}
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          className="input-clean min-w-0 flex-1 px-4 py-3 font-mono text-lg"
        />
        <output
          htmlFor="calculator"
          aria-label="Result"
          className="highlight-card grid min-w-28 place-items-center px-4 font-mono text-xl font-semibold tabular-nums"
        >
          {expression ? (result ?? '…') : '='}
        </output>
      </div>
    </div>
  )
}

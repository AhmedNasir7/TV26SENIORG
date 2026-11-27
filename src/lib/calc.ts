/** A small calculator for rough work: numbers, + - * / % and brackets. Never evaluates code. */
export function calculate(input: string): number | null {
  const text = input.replace(/\s+/g, '')
  if (!text || text.length > 200 || /[^0-9.+\-*/%()]/.test(text)) return null
  let at = 0

  function primary(): number | null {
    if (text[at] === '-') {
      at += 1
      const value = primary()
      return value === null ? null : -value
    }
    if (text[at] === '(') {
      at += 1
      const value = sum()
      if (value === null || text[at] !== ')') return null
      at += 1
      return value
    }
    const match = /^(\d+\.?\d*|\.\d+)/.exec(text.slice(at))
    if (!match) return null
    at += match[0].length
    return Number(match[0])
  }

  function product(): number | null {
    let value = primary()
    while (value !== null && '*/%'.includes(text[at] ?? ' ')) {
      const operator = text[at++]
      const next = primary()
      if (next === null) return null
      value = operator === '*' ? value * next : operator === '/' ? value / next : value % next
    }
    return value
  }

  function sum(): number | null {
    let value = product()
    while (value !== null && (text[at] === '+' || text[at] === '-')) {
      const operator = text[at++]
      const next = product()
      if (next === null) return null
      value = operator === '+' ? value + next : value - next
    }
    return value
  }

  const result = sum()
  return result === null || at !== text.length || !Number.isFinite(result) ? null : Math.round(result * 1e10) / 1e10
}

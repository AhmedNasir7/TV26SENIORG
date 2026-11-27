/** Per-question statistics. Pure functions with no imports, so tests can use them. */
export type Sitting = {
  /** this candidate's total, used to compare strong and weak candidates */
  total: number
  answered: boolean
  marks: number
  maximum: number
}

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0)

export function observedDifficulty(correctRate: number) {
  return correctRate >= 70 ? 'EASY' : correctRate >= 40 ? 'MEDIUM' : 'HARD'
}

/**
 * Upper-lower discrimination: how much better the top 27% did on this question than the bottom 27%.
 * Near zero or negative suggests an ambiguous or mis-keyed question. Needs at least six sittings.
 */
export function discrimination(sittings: Sitting[]) {
  if (sittings.length < 6) return null
  const ranked = [...sittings].sort((a, b) => b.total - a.total)
  const size = Math.max(2, Math.round(ranked.length * 0.27))
  const share = (group: Sitting[]) => group.reduce((sum, s) => sum + (s.maximum ? s.marks / s.maximum : 0), 0) / group.length
  return Math.round((share(ranked.slice(0, size)) - share(ranked.slice(-size))) * 100) / 100
}

export function analyseItem(sittings: Sitting[]) {
  const count = sittings.length
  const full = sittings.filter((s) => s.maximum > 0 && s.marks >= s.maximum).length
  const correctRate = percent(full, count)
  const index = discrimination(sittings)
  return {
    sittings: count,
    skipRate: percent(sittings.filter((s) => !s.answered).length, count),
    correctRate,
    averageMarks: count ? Math.round((sittings.reduce((sum, s) => sum + s.marks, 0) / count) * 100) / 100 : 0,
    observed: count ? observedDifficulty(correctRate) : null,
    discrimination: index,
    review: index !== null && index < 0.1,
  }
}

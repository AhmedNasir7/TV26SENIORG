/**
 * The integrity score: a plain, repeatable number from what was logged, so nobody has to trust a
 * model to rank candidates. Pure, so tests can use it. It points a person at attempts worth a look;
 * it is never proof and never changes a mark.
 */
export type IncidentCount = { type: string; occurrences: number }

// Points per occurrence, and the most one kind of event can add
const WEIGHTS: Record<string, { each: number; cap: number }> = {
  TAB_HIDDEN: { each: 6, cap: 30 },
  WINDOW_BLUR: { each: 3, cap: 15 },
  OFFLINE: { each: 2, cap: 10 },
  SESSION_TAKEOVER: { each: 15, cap: 30 },
  LATE_SAVE_REJECTED: { each: 5, cap: 10 },
  FULLSCREEN_EXIT: { each: 5, cap: 20 },
  PASTE: { each: 8, cap: 24 },
}

export type IntegrityInput = { incidents: IncidentCount[]; closestOtherAnswer: number; left: boolean }
export type IntegrityScore = { score: number; level: 'low' | 'medium' | 'high'; reasons: string[] }

export function integrityScore({ incidents, closestOtherAnswer, left }: IntegrityInput): IntegrityScore {
  const reasons: string[] = []
  let score = 0
  for (const { type, occurrences } of incidents) {
    const weight = WEIGHTS[type]
    if (!weight) continue
    score += Math.min(weight.cap, weight.each * occurrences)
    reasons.push(`${type.toLowerCase().replace(/_/g, ' ')} x${occurrences}`)
  }
  if (closestOtherAnswer >= 0.9) {
    score += 25
    reasons.push(`a written answer is ${Math.round(closestOtherAnswer * 100)}% like another candidate's`)
  } else if (closestOtherAnswer >= 0.75) {
    score += 12
    reasons.push(`a written answer is ${Math.round(closestOtherAnswer * 100)}% like another candidate's`)
  }
  if (left) {
    score += 10
    reasons.push('left the examination')
  }
  score = Math.min(100, score)
  return { score, level: score >= 55 ? 'high' : score >= 25 ? 'medium' : 'low', reasons }
}

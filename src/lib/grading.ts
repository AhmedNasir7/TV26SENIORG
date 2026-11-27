/**
 * Marking rules for objective questions. Pure functions: the same input always gives the same marks.
 * No imports, so scripts and tests can use them too.
 */
export type QuestionOption = { id: string; text: string; correct: boolean }
export type ChoiceType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE'
export type Scoring = 'ALL_OR_NOTHING' | 'PARTIAL'

export const roundMarks = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export function gradeChoice({
  type,
  scoringRule,
  options,
  selected,
  marks,
}: {
  type: ChoiceType
  scoringRule: Scoring
  options: QuestionOption[]
  selected: string[]
  marks: number
}): number {
  const chosen = new Set(selected)
  if (chosen.size === 0) return 0

  const correct = new Set(options.filter((option) => option.correct).map((option) => option.id))
  let right = 0
  let wrong = 0
  for (const id of chosen) {
    if (correct.has(id)) right += 1
    else wrong += 1 // includes ids that aren't options at all
  }

  if (type === 'SINGLE_CHOICE') return chosen.size === 1 && right === 1 ? marks : 0
  if (scoringRule === 'ALL_OR_NOTHING') return wrong === 0 && right === correct.size ? marks : 0
  // Partial credit: wrong picks cancel right ones, never below zero
  return correct.size === 0 ? 0 : roundMarks((marks * Math.max(0, right - wrong)) / correct.size)
}

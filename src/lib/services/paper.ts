/**
 * The only way a paper leaves the server. Fields are picked one by one: correct answers,
 * marking notes, difficulty and internal option ids can't slip out.
 */
import type { QuestionOption } from '@/lib/grading'

/** Options are shown as c1, c2 ... in this candidate's order; internal ids could hint at answers. */
export const optionKey = (index: number) => `c${index + 1}`

export function toOptionIds(optionOrder: string[], keys: string[]) {
  const byKey = new Map(optionOrder.map((id, index) => [optionKey(index), id]))
  const ids = keys.map((key) => byKey.get(key))
  return ids.every(Boolean) ? (ids as string[]) : null
}

type PaperQuestion = {
  id: number
  position: number
  marks: unknown
  optionOrder: unknown
  questionVersion: {
    text: string
    options: unknown
    maxLength: number | null
    question: { type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'WRITTEN' }
  }
  answer: { response: unknown; markedForReview: boolean; revision: number; savedAt: Date } | null
}

export function candidateQuestion(item: PaperQuestion) {
  const order = item.optionOrder as string[]
  const options = new Map((item.questionVersion.options as QuestionOption[]).map((o) => [o.id, o.text]))
  const stored = item.answer?.response as { optionIds?: string[]; text?: string } | null | undefined

  return {
    id: item.id,
    position: item.position,
    type: item.questionVersion.question.type,
    text: item.questionVersion.text,
    marks: Number(item.marks),
    maxLength: item.questionVersion.maxLength,
    options: order.map((id, index) => ({ key: optionKey(index), text: options.get(id) ?? '' })),
    answer: item.answer && {
      response: stored?.optionIds
        ? { optionKeys: stored.optionIds.map((id) => optionKey(order.indexOf(id))) }
        : stored?.text !== undefined
          ? { text: stored.text }
          : null,
      markedForReview: item.answer.markedForReview,
      revision: item.answer.revision,
      savedAt: item.answer.savedAt.toISOString(),
    },
  }
}

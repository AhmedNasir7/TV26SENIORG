/** Insight into each question of one examination, from marked real attempts only. */
import type { QuestionOption } from '@/lib/grading'
import { analyseItem, type Sitting } from '@/lib/item-analysis'
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'

export async function questionInsights(actor: Actor, examId: number) {
  ensureFound(await prisma.exam.findUnique({ where: { id: examId }, select: { ownerId: true } }), (e) => canManageExam(actor, e))
  const items = await prisma.attemptQuestion.findMany({
    where: { attempt: { examId, isSandbox: false, status: 'SUBMITTED', gradingState: 'GRADED' } },
    select: {
      questionVersionId: true,
      marks: true,
      attempt: { select: { score: true } },
      answer: { select: { response: true, autoMarks: true, manualMarks: true } },
      questionVersion: { select: { text: true, options: true, question: { select: { difficulty: true } } } },
    },
  })

  const groups = new Map<number, typeof items>()
  for (const item of items) groups.set(item.questionVersionId, [...(groups.get(item.questionVersionId) ?? []), item])

  return [...groups.values()]
    .map((group) => {
      const { questionVersion, questionVersionId } = group[0]
      const picks = new Map<string, number>()
      const sittings: Sitting[] = group.map((item) => {
        const response = item.answer?.response as { optionIds?: string[]; text?: string } | null | undefined
        for (const id of response?.optionIds ?? []) picks.set(id, (picks.get(id) ?? 0) + 1)
        return {
          total: Number(item.attempt.score ?? 0),
          answered: Boolean(response?.optionIds?.length || response?.text?.trim()),
          marks: Number(item.answer?.manualMarks ?? item.answer?.autoMarks ?? 0),
          maximum: Number(item.marks),
        }
      })
      return {
        id: questionVersionId,
        text: questionVersion.text,
        declared: questionVersion.question.difficulty,
        ...analyseItem(sittings),
        options: (questionVersion.options as unknown as QuestionOption[]).map((o) => ({
          text: o.text,
          correct: o.correct,
          chosen: picks.get(o.id) ?? 0,
        })),
      }
    })
    .sort((a, b) => a.correctRate - b.correctRate)
}

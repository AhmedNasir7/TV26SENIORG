/** Which bank questions an examination uses, in what order and for how many marks. */
import { canManageExam, ensureFound, type Actor } from '@/lib/policies'
import { prisma } from '@/lib/prisma'
import { ApiError } from '@/lib/server/api'
import { audit } from '@/lib/services/audit'
import { roundMarks } from '@/lib/grading'
import type { ExamQuestionsInput } from '@/lib/validation/questions'

export async function getExamQuestions(actor: Actor, examId: number) {
  const exam = ensureFound(
    await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          orderBy: { position: 'asc' },
          include: { question: { select: { type: true, difficulty: true, topic: { select: { name: true } } } }, questionVersion: { select: { text: true } } },
        },
      },
    }),
    (e) => canManageExam(actor, e)
  )
  return {
    exam: {
      id: exam.id,
      title: exam.title,
      status: exam.status,
      ownerId: exam.ownerId,
      totalMarks: Number(exam.totalMarks),
      passMarks: exam.passMarks === null ? null : Number(exam.passMarks),
      editable: exam.status === 'DRAFT',
    },
    items: exam.questions.map((item) => ({
      questionId: item.questionId,
      marks: Number(item.marks),
      text: item.questionVersion.text,
      type: item.question.type,
      difficulty: item.question.difficulty,
      topic: item.question.topic.name,
    })),
  }
}

/** Replaces the whole ordered list, so repeating the same save changes nothing. */
export async function setExamQuestions(actor: Actor, examId: number, { items, syncTotal }: ExamQuestionsInput) {
  await prisma.$transaction(
    async (tx) => {
      const exam = ensureFound(await tx.exam.findUnique({ where: { id: examId } }), (e) => canManageExam(actor, e))
      if (exam.status !== 'DRAFT') throw new ApiError('CONFLICT', 'Only a draft examination can change its questions')

      const ids = items.map((item) => item.questionId)
      const [questions, present] = await Promise.all([
        tx.question.findMany({ where: { id: { in: ids }, ownerId: exam.ownerId }, select: { id: true, currentVersion: true, archivedAt: true, versions: { select: { id: true, version: true } } } }),
        tx.examQuestion.findMany({ where: { examId }, select: { questionId: true } }),
      ])
      const byId = new Map(questions.map((q) => [q.id, q]))
      const already = new Set(present.map((p) => p.questionId))

      const rows = items.map((item, index) => {
        const question = byId.get(item.questionId)
        // Only the exam owner's questions; archived ones can stay but not be newly added
        if (!question || (question.archivedAt && !already.has(question.id))) {
          throw new ApiError('BAD_REQUEST', 'One of these questions is not available for this examination')
        }
        const version = question.versions.find((v) => v.version === question.currentVersion)!
        return { examId, questionId: question.id, questionVersionId: version.id, position: index + 1, marks: item.marks }
      })

      await tx.examQuestion.deleteMany({ where: { examId } })
      if (rows.length) await tx.examQuestion.createMany({ data: rows })

      const total = roundMarks(items.reduce((sum, item) => sum + item.marks, 0))
      if (syncTotal && total > 0) {
        if (exam.passMarks !== null && Number(exam.passMarks) > total) {
          throw new ApiError('CONFLICT', `The pass mark (${Number(exam.passMarks)}) is higher than the new total (${total})`)
        }
        await tx.exam.update({ where: { id: examId }, data: { totalMarks: total } })
      }
      await audit(tx, actor.id, 'exam_questions_updated', 'exam', examId, { count: rows.length, total })
    },
    { isolationLevel: 'Serializable' }
  )
  return getExamQuestions(actor, examId)
}

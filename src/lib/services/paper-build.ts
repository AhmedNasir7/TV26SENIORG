/**
 * Fixes a paper: versions, order, option order and marks never change afterwards. Real and sandbox
 * attempts are built by the same code, so a preview behaves like the real thing. An examination with a
 * fair recipe draws a balanced paper from the bank; otherwise its fixed list is used.
 */
import { randomInt, randomUUID } from 'node:crypto'
import type { Difficulty, Prisma } from '@/generated/prisma/client'
import { readBlueprint } from '@/lib/blueprint'
import { difficultyScore } from '@/lib/fair'
import type { QuestionOption } from '@/lib/grading'
import { seededRandom, shuffled } from '@/lib/shuffle'
import { drawPaper } from '@/lib/services/fair'

/** What to include when loading an examination for paper building. */
export const PAPER_QUESTIONS = {
  orderBy: { position: 'asc' },
  include: { questionVersion: { include: { question: { select: { difficulty: true } } } } },
} satisfies Prisma.Exam$questionsArgs

type Source = {
  ownerId: number
  blueprint: unknown
  shuffleQuestions: boolean
  shuffleOptions: boolean
  totalMarks: Prisma.Decimal
  questions: Prisma.ExamQuestionGetPayload<typeof PAPER_QUESTIONS>[]
}

const declared = (difficulty: Difficulty) => difficultyScore(difficulty, 0, 0)

export async function buildPaper(client: Prisma.TransactionClient, exam: Source) {
  const seed = randomInt(1, 2_147_483_647)
  const next = seededRandom(seed)
  const rules = readBlueprint(exam.blueprint)
  const source = rules
    ? await drawPaper(client, exam.ownerId, rules, seed)
    : exam.questions.map((item) => ({
        questionVersionId: item.questionVersionId,
        options: item.questionVersion.options,
        marks: Number(item.marks),
        score: declared(item.questionVersion.question.difficulty),
      }))
  const items = exam.shuffleQuestions ? shuffled(source, next) : source
  const questions = items.map((item, index) => {
    const ids = (item.options as unknown as QuestionOption[]).map((o) => o.id)
    return {
      questionVersionId: item.questionVersionId,
      position: index + 1,
      marks: item.marks,
      optionOrder: exam.shuffleOptions ? shuffled(ids, next) : ids,
      difficultyScore: Math.round(item.score * 1000) / 10,
    }
  })
  const marks = items.reduce((sum, q) => sum + q.marks, 0)
  return {
    seed,
    activeSessionId: randomUUID(),
    maxScore: exam.totalMarks,
    // 0 easiest to 100 hardest, weighted by marks
    paperDifficulty: marks ? Math.round((items.reduce((sum, q) => sum + q.score * q.marks, 0) / marks) * 1000) / 10 : 0,
    questions: { create: questions },
  }
}

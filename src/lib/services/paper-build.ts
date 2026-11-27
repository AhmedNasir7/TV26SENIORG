/**
 * Fixes a paper: versions, order, option order and marks never change afterwards. Real and sandbox
 * attempts are built by the same code, so a preview behaves like the real thing.
 */
import { randomInt, randomUUID } from 'node:crypto'
import type { Difficulty, Prisma } from '@/generated/prisma/client'
import type { QuestionOption } from '@/lib/grading'
import { seededRandom, shuffled } from '@/lib/shuffle'

const DIFFICULTY_SCORE: Record<Difficulty, number> = { EASY: 1, MEDIUM: 2, HARD: 3 }

/** What to include when loading an examination for paper building. */
export const PAPER_QUESTIONS = {
  orderBy: { position: 'asc' },
  include: { questionVersion: { include: { question: { select: { difficulty: true } } } } },
} satisfies Prisma.Exam$questionsArgs

type Source = {
  shuffleQuestions: boolean
  shuffleOptions: boolean
  totalMarks: Prisma.Decimal
  questions: Prisma.ExamQuestionGetPayload<typeof PAPER_QUESTIONS>[]
}

export function buildPaper(exam: Source) {
  const seed = randomInt(1, 2_147_483_647)
  const next = seededRandom(seed)
  const items = exam.shuffleQuestions ? shuffled(exam.questions, next) : exam.questions
  const questions = items.map((item, index) => {
    const ids = (item.questionVersion.options as unknown as QuestionOption[]).map((o) => o.id)
    return {
      questionVersionId: item.questionVersionId,
      position: index + 1,
      marks: item.marks,
      optionOrder: exam.shuffleOptions ? shuffled(ids, next) : ids,
      difficultyScore: DIFFICULTY_SCORE[item.questionVersion.question.difficulty],
    }
  })
  return {
    seed,
    activeSessionId: randomUUID(),
    maxScore: exam.totalMarks,
    paperDifficulty: questions.reduce((sum, q) => sum + q.difficultyScore, 0) / (questions.length || 1),
    questions: { create: questions },
  }
}

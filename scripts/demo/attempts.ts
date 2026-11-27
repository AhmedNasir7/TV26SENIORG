/** Realistic finished attempts for the completed exam, so results and analytics have real data. */
import { randomUUID } from 'node:crypto'
import { prisma } from '../../src/lib/prisma'
import { gradeChoice, roundMarks, type QuestionOption } from '../../src/lib/grading'

const EASE = { EASY: 0.25, MEDIUM: 0, HARD: -0.25 } as const
const DIFFICULTY_SCORE = { EASY: 1, MEDIUM: 2, HARD: 3 } as const

/** Small seeded generator: the same seed always produces the same demo results. */
function random(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(items: T[], next: () => number) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export async function seedAttempts(examId: number, graderId: number, candidateIds: number[]) {
  const exam = await prisma.exam.findUniqueOrThrow({
    where: { id: examId },
    include: { questions: { orderBy: { position: 'asc' }, include: { questionVersion: { include: { question: true } } } } },
  })

  for (const [index, candidateId] of candidateIds.entries()) {
    const exists = await prisma.attempt.findFirst({ where: { examId, candidateId, isSandbox: false }, select: { id: true } })
    if (exists) continue

    const next = random(1000 + index)
    const ability = 0.35 + next() * 0.55
    const startedAt = new Date(exam.startsAt.getTime() + Math.floor(next() * 600) * 60_000)
    const deadlineAt = new Date(Math.min(startedAt.getTime() + exam.durationMinutes * 60_000, exam.endsAt.getTime()))
    const timedOut = next() < 0.12
    const submittedAt = timedOut ? deadlineAt : new Date(startedAt.getTime() + (0.5 + next() * 0.45) * (deadlineAt.getTime() - startedAt.getTime()))

    let score = 0
    const questions = shuffled(exam.questions, next).map((item, position) => {
      const version = item.questionVersion
      const options = version.options as unknown as QuestionOption[]
      const marks = Number(item.marks)
      const { type, difficulty } = version.question
      const chance = Math.min(0.97, Math.max(0.05, ability + EASE[difficulty]))
      const skipped = next() < (difficulty === 'HARD' ? 0.14 : 0.04)

      let response: { optionIds: string[] } | { text: string } | undefined
      let autoMarks: number | null = null
      let manualMarks: number | null = null

      if (type === 'WRITTEN') {
        manualMarks = skipped ? 0 : roundMarks(Math.round(marks * Math.min(1, chance + next() * 0.15) * 2) / 2)
        if (!skipped) response = { text: 'Sample written answer for demonstration.' }
        score += manualMarks
      } else {
        const right = options.filter((o) => o.correct).map((o) => o.id)
        const wrong = options.filter((o) => !o.correct).map((o) => o.id)
        if (!skipped) {
          const optionIds = next() < chance ? right : type === 'SINGLE_CHOICE' ? [wrong[Math.floor(next() * wrong.length)]] : [right[0], wrong[0]]
          response = { optionIds }
        }
        const selected = response && 'optionIds' in response ? response.optionIds : []
        autoMarks = gradeChoice({ type, scoringRule: version.scoringRule, options, selected, marks })
        score += autoMarks
      }

      return {
        questionVersionId: version.id,
        position: position + 1,
        marks: item.marks,
        optionOrder: shuffled(options.map((o) => o.id), next),
        difficultyScore: DIFFICULTY_SCORE[difficulty],
        answer: {
          create: {
            response,
            revision: response ? 1 : 0,
            savedAt: submittedAt,
            autoMarks,
            manualMarks,
            gradedById: type === 'WRITTEN' ? graderId : null,
            gradedAt: type === 'WRITTEN' ? new Date(exam.endsAt.getTime() + 3_600_000) : null,
          },
        },
      }
    })

    await prisma.attempt.create({
      data: {
        examId,
        candidateId,
        realSlot: 1,
        status: 'SUBMITTED',
        submitReason: timedOut ? 'TIME_EXPIRED' : 'MANUAL',
        gradingState: 'GRADED',
        startedAt,
        deadlineAt,
        submittedAt,
        lastSeenAt: submittedAt,
        seed: 1000 + index,
        activeSessionId: randomUUID(),
        score: roundMarks(score),
        maxScore: exam.totalMarks,
        paperDifficulty: questions.reduce((sum, q) => sum + q.difficultyScore, 0) / questions.length,
        questions: { create: questions },
        // A few neutral indicators so the review screens have something to show
        incidents: index % 6 === 0 ? { create: { type: 'TAB_HIDDEN', occurrences: 1 + (index % 3), firstAt: startedAt, lastAt: submittedAt } } : undefined,
      },
    })
  }

  await prisma.exam.update({
    where: { id: examId },
    data: { resultsPublishedAt: exam.resultsPublishedAt ?? new Date(exam.endsAt.getTime() + 24 * 3_600_000) },
  })
}

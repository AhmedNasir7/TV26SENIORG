/** Creates the demo question bank and examinations. Safe to run again: existing items are reused. */
import { prisma } from '../../src/lib/prisma'
import type { QuestionOption } from '../../src/lib/grading'
import { QUESTION_BANK } from './questions'

const LEVELS = { E: 'EASY', M: 'MEDIUM', H: 'HARD' } as const
const MARKS = { E: 1, M: 2, H: 3 } as const

export async function seedQuestions(ownerId: number) {
  for (const [topicName, questions] of Object.entries(QUESTION_BANK)) {
    const topic = await prisma.topic.upsert({
      where: { ownerId_name: { ownerId, name: topicName } },
      update: {},
      create: { ownerId, name: topicName },
    })

    for (const question of questions) {
      const [level, kind, text, detail] = question
      const exists = await prisma.questionVersion.findFirst({ where: { text, question: { ownerId } }, select: { id: true } })
      if (exists) continue

      const options: QuestionOption[] = Array.isArray(detail)
        ? detail.map((option, index) => ({ id: `o${index + 1}`, text: option.replace(/^\*/, ''), correct: option.startsWith('*') }))
        : []

      await prisma.question.create({
        data: {
          ownerId,
          topicId: topic.id,
          type: kind === 'S' ? 'SINGLE_CHOICE' : kind === 'M' ? 'MULTIPLE_CHOICE' : 'WRITTEN',
          difficulty: LEVELS[level],
          currentText: text,
          versions: {
            create: {
              version: 1,
              text,
              options,
              marks: kind === 'W' ? 5 : MARKS[level],
              scoringRule: kind === 'M' ? 'PARTIAL' : 'ALL_OR_NOTHING',
              guidance: Array.isArray(detail) ? null : detail,
            },
          },
        },
      })
    }
  }
}

type ExamPlan = {
  title: string
  topic: string
  picks: number[] // positions in the topic's list
  status: 'DRAFT' | 'PUBLISHED'
  /** Window relative to now, in minutes */
  window: [number, number]
  durationMinutes: number
}

const DAY = 24 * 60

export const EXAM_PLANS = {
  completed: {
    title: 'Programming Fundamentals: Midterm',
    topic: 'Programming',
    picks: [0, 1, 3, 4, 6, 8, 9, 10, 12, 13],
    status: 'PUBLISHED',
    window: [-7 * DAY, -6 * DAY],
    durationMinutes: 45,
  },
  live: {
    title: 'Database Systems: Quiz',
    topic: 'Databases',
    picks: [0, 1, 3, 6, 8, 9, 10, 12, 13, 14],
    status: 'PUBLISHED',
    window: [-60, 14 * DAY],
    durationMinutes: 30,
  },
  upcoming: {
    title: 'Computer Networks: Final',
    topic: 'Networks',
    picks: [0, 2, 3, 6, 7, 9, 10, 12, 13, 15],
    status: 'PUBLISHED',
    window: [3 * DAY, 4 * DAY],
    durationMinutes: 90,
  },
  draft: {
    title: 'Discrete Mathematics: Practice',
    topic: 'Mathematics',
    picks: [0, 3, 6, 9, 10, 13],
    status: 'DRAFT',
    window: [7 * DAY, 8 * DAY],
    durationMinutes: 40,
  },
} satisfies Record<string, ExamPlan>

export async function seedExam(ownerId: number, plan: ExamPlan, candidateIds: number[]) {
  const now = Date.now()
  const startsAt = new Date(now + plan.window[0] * 60_000)
  const endsAt = new Date(now + plan.window[1] * 60_000)

  const existing = await prisma.exam.findFirst({
    where: { ownerId, title: plan.title },
    include: { _count: { select: { attempts: true } } },
  })
  if (existing) {
    // Keep "open now" and "upcoming" true on later runs, but never move an exam people have attempted
    if (existing._count.attempts === 0) {
      await prisma.exam.update({ where: { id: existing.id }, data: { startsAt, endsAt } })
    }
    return existing.id
  }

  const texts = plan.picks.map((index) => QUESTION_BANK[plan.topic][index][2])
  const versions = await prisma.questionVersion.findMany({ where: { text: { in: texts }, question: { ownerId } } })
  const ordered = texts.map((text) => versions.find((v) => v.text === text)!)
  const totalMarks = ordered.reduce((sum, v) => sum + Number(v.marks), 0)

  const exam = await prisma.exam.create({
    data: {
      ownerId,
      title: plan.title,
      instructions: 'Answer every question. Your answers save automatically. The timer is kept by the server.',
      startsAt,
      endsAt,
      durationMinutes: plan.durationMinutes,
      totalMarks,
      passMarks: Math.ceil(totalMarks / 2),
      status: plan.status,
      publishedAt: plan.status === 'PUBLISHED' ? new Date(Math.min(now, startsAt.getTime()) - 60 * 60_000) : null,
      questions: {
        create: ordered.map((v, position) => ({
          questionId: v.questionId,
          questionVersionId: v.id,
          position: position + 1,
          marks: v.marks,
        })),
      },
      enrollments: { create: candidateIds.map((candidateId) => ({ candidateId })) },
    },
  })
  return exam.id
}

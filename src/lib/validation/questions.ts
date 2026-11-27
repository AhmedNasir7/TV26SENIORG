import { z } from 'zod'

export const QUESTION_TYPES = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'WRITTEN'] as const
export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const
export const SCORING_RULES = ['ALL_OR_NOTHING', 'PARTIAL'] as const
export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 8

const id = z.number().int().positive()
export const marksSchema = z
  .number()
  .positive('Marks must be more than zero')
  .max(1000)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Use at most two decimal places')

const options = z
  .array(z.strictObject({ text: z.string().trim().min(1, 'Options cannot be empty').max(1000), correct: z.boolean() }))
  .min(MIN_OPTIONS, `Add at least ${MIN_OPTIONS} options`)
  .max(MAX_OPTIONS, `Use at most ${MAX_OPTIONS} options`)
  .refine((list) => new Set(list.map((o) => o.text.toLowerCase())).size === list.length, 'Options must be different')

const base = {
  topicId: id,
  difficulty: z.enum(DIFFICULTIES),
  text: z.string().trim().min(1, 'Write the question').max(5000),
  marks: marksSchema,
}

/** Each type has its own marking scheme; fields that don't belong to a type are rejected. */
export const questionSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...base,
    type: z.literal('SINGLE_CHOICE'),
    options: options.refine((list) => list.filter((o) => o.correct).length === 1, 'Mark exactly one correct option'),
  }),
  z.strictObject({
    ...base,
    type: z.literal('MULTIPLE_CHOICE'),
    options: options.refine((list) => list.some((o) => o.correct), 'Mark at least one correct option'),
    scoringRule: z.enum(SCORING_RULES),
  }),
  z.strictObject({
    ...base,
    type: z.literal('WRITTEN'),
    guidance: z.string().trim().max(5000).optional(),
    maxLength: z.number().int().min(50).max(20_000).nullable().optional(),
  }),
])

export const updateQuestionSchema = z.strictObject({
  expectedVersion: z.number().int().positive(),
  question: questionSchema,
})

export const archiveSchema = z.strictObject({ archived: z.boolean() })

export const topicSchema = z.strictObject({ name: z.string().trim().min(1, 'Name the topic').max(80) })

export const questionListSchema = z.strictObject({
  search: z.string().trim().max(200).optional(),
  topicId: z.coerce.number().int().positive().optional(),
  type: z.enum(QUESTION_TYPES).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  archived: z.enum(['true', 'false']).default('false'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
})

export const examQuestionsSchema = z.strictObject({
  items: z
    .array(z.strictObject({ questionId: id, marks: marksSchema }))
    .max(200)
    .refine((list) => new Set(list.map((i) => i.questionId)).size === list.length, 'A question can appear only once'),
  syncTotal: z.boolean().default(false),
})

export type QuestionInput = z.infer<typeof questionSchema>
export type QuestionListFilter = z.infer<typeof questionListSchema>
export type ExamQuestionsInput = z.infer<typeof examQuestionsSchema>

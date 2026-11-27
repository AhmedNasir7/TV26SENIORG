import { z } from 'zod'
import { idSchema } from '@/lib/validation/users'

export const gradingQuerySchema = z.strictObject({
  questionVersionId: idSchema.optional(),
  attemptId: idSchema.optional(),
  show: z.enum(['pending', 'all']).default('pending'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
})

export const gradeSchema = z.strictObject({
  marks: z
    .number()
    .min(0, 'Marks cannot be negative')
    .max(10_000)
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Use at most two decimal places'),
  feedback: z.string().trim().max(2000).default(''),
  expectedVersion: z.number().int().min(0),
})

export const resultsPublishSchema = z.discriminatedUnion('published', [
  z.strictObject({ published: z.literal(true) }),
  z.strictObject({
    published: z.literal(false),
    reason: z.string().trim().min(5, 'Say why the results are being withdrawn').max(500),
  }),
])

export type GradingQuery = z.infer<typeof gradingQuerySchema>
export type GradeInput = z.infer<typeof gradeSchema>
export type ResultsPublishInput = z.infer<typeof resultsPublishSchema>

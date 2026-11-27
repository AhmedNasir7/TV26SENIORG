import { z } from 'zod'
import { blueprintSchema } from '@/lib/blueprint'
import { idSchema } from '@/lib/validation/users'

export const importSchema = z.strictObject({
  content: z.string().min(1, 'The file is empty').max(200_000),
  format: z.enum(['csv', 'json']),
  commit: z.boolean(),
  examId: idSchema.optional(),
})

export const fairSchema = z.strictObject({ rules: blueprintSchema.nullable(), preview: z.boolean().default(false) })

export const disputeSchema = z.strictObject({
  attemptQuestionId: idSchema,
  reason: z.string().trim().min(15, 'Explain the problem in at least 15 characters').max(1000),
})

export const resolveDisputeSchema = z.strictObject({
  accept: z.boolean(),
  response: z.string().trim().min(5, 'Give the candidate a reason').max(1000),
  marks: z.number().min(0).max(10_000).optional(),
})

export const voidSchema = z.strictObject({
  questionVersionId: idSchema,
  reason: z.string().trim().min(5, 'Say why the question is void').max(500),
})

export const forceSubmitSchema = z.strictObject({ reason: z.string().trim().min(5, 'Give a reason').max(500) })

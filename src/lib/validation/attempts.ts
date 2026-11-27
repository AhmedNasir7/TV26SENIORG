import { z } from 'zod'

const sessionId = z.string().min(10).max(64)

export const openAttemptSchema = z.strictObject({
  start: z.boolean(),
  sessionId: sessionId.optional(),
})

/** `response` uses the option keys shown on this candidate's paper, never internal ids. */
export const saveAnswerSchema = z.strictObject({
  sessionId,
  revision: z.number().int().positive().max(1_000_000),
  markedForReview: z.boolean(),
  response: z
    .union([
      z.strictObject({ optionKeys: z.array(z.string().max(8)).max(8) }),
      z.strictObject({ text: z.string().max(20_000) }),
    ])
    .nullable(),
})

export const submitSchema = z.strictObject({ sessionId })

export const progressSchema = z.strictObject({ sessionId, position: z.number().int().min(2).max(500) })

export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>

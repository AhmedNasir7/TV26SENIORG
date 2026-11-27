import { z } from 'zod'
import { marksSchema } from '@/lib/validation/questions'

// Times travel with their offset and are stored in UTC
const instant = z.iso.datetime({ offset: true, error: 'Choose a date and time' })

const fields = {
  title: z.string().trim().min(1, 'Give the examination a title').max(200),
  instructions: z.string().trim().max(10_000).default(''),
  startsAt: instant,
  endsAt: instant,
  durationMinutes: z.number().int('Use whole minutes').min(1, 'Duration must be at least a minute').max(1440),
  totalMarks: marksSchema,
  passMarks: z.number().min(0).max(100_000).nullable().default(null),
  shuffleQuestions: z.boolean().default(true),
  shuffleOptions: z.boolean().default(true),
  allowBackNavigation: z.boolean().default(true),
}

export const examSchema = z.strictObject(fields).superRefine((exam, ctx) => {
  const window = new Date(exam.endsAt).getTime() - new Date(exam.startsAt).getTime()
  if (window <= 0) {
    ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'The end must be after the start' })
  } else if (exam.durationMinutes * 60_000 > window) {
    ctx.addIssue({ code: 'custom', path: ['durationMinutes'], message: 'The duration is longer than the availability window' })
  }
  if (exam.passMarks !== null && exam.passMarks > exam.totalMarks) {
    ctx.addIssue({ code: 'custom', path: ['passMarks'], message: 'The pass mark is higher than the total marks' })
  }
})

/** The only fields that may change once an examination is published but has not started. */
export const publishedEditSchema = z.strictObject({ title: fields.title, instructions: z.string().trim().max(10_000) })

export const publishSchema = z.strictObject({ published: z.boolean() })

export const enrollSchema = z.strictObject({
  candidateIds: z.array(z.number().int().positive()).min(1, 'Choose at least one candidate').max(500),
})

export const extraTimeSchema = z
  .strictObject({
    extraMinutes: z.number().int().min(0).max(600),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.extraMinutes === 0 || Boolean(v.reason), { message: 'Record why extra time is given', path: ['reason'] })

export const peopleQuerySchema = z.strictObject({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
})

export type ExamInput = z.infer<typeof examSchema>
export type PublishedEditInput = z.infer<typeof publishedEditSchema>
export type ExtraTimeInput = z.infer<typeof extraTimeSchema>
export type PeopleQuery = z.infer<typeof peopleQuerySchema>

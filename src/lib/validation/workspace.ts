import { z } from 'zod'
import { PREFERENCE_OPTIONS } from '@/lib/preferences'

const sessionId = z.string().min(10).max(64)
type Values<K extends keyof typeof PREFERENCE_OPTIONS> = (typeof PREFERENCE_OPTIONS)[K]['choices'][number][0]
const choice = <K extends keyof typeof PREFERENCE_OPTIONS>(key: K) =>
  z.enum(PREFERENCE_OPTIONS[key].choices.map(([value]) => value) as [Values<K>, ...Values<K>[]])

export const preferencesSchema = z.strictObject({
  navigator: choice('navigator'),
  view: choice('view'),
  textSize: choice('textSize'),
  spacing: choice('spacing'),
  contrast: choice('contrast'),
  timer: choice('timer'),
})

const coordinate = z.number().int().min(0).max(1000)
const stroke = z.array(z.tuple([coordinate, coordinate])).min(1).max(1000)

export const MAX_NOTES = 10_000
export const MAX_POINTS = 8000

export const scratchpadSchema = z.strictObject({
  sessionId,
  notes: z.string().max(MAX_NOTES),
  drawing: z
    .array(stroke)
    .max(300)
    .refine((strokes) => strokes.reduce((sum, s) => sum + s.length, 0) <= MAX_POINTS, 'The drawing is too large'),
})

export const sandboxStartSchema = z.strictObject({ minutes: z.number().int().min(1).max(1440).optional() })

export const sandboxOpenSchema = z.strictObject({ sessionId: sessionId.optional() })

export type ScratchpadInput = z.infer<typeof scratchpadSchema>

import { z } from 'zod'
import type { Rule } from '@/lib/fair'

export const blueprintSchema = z
  .array(
    z.strictObject({
      topicId: z.number().int().positive(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
      count: z.number().int().min(1).max(50),
      marks: z.number().positive().max(1000).refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, 'Use at most two decimal places'),
    })
  )
  .min(1)
  .max(20)
  .refine((rules) => new Set(rules.map((r) => `${r.topicId}:${r.difficulty}`)).size === rules.length, 'Each topic and difficulty can appear once')

/** The stored fair-paper recipe, or null when the examination uses a fixed question list. */
export function readBlueprint(stored: unknown): Rule[] | null {
  const parsed = blueprintSchema.safeParse(stored)
  return parsed.success ? parsed.data : null
}

export const blueprintCount = (rules: Rule[]) => rules.reduce((sum, r) => sum + r.count, 0)
/** How many questions a candidate will receive. */
export const paperSize = (stored: unknown, fixed: number) => {
  const rules = readBlueprint(stored)
  return rules ? blueprintCount(rules) : fixed
}
export const blueprintMarks = (rules: Rule[]) => rules.flatMap((r) => Array<number>(r.count).fill(r.marks))

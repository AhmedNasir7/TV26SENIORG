import { z } from 'zod'
import { NUMBERS, type NumberKey } from '@/lib/monitoring'

const sessionId = z.string().min(10).max(64)

const range = (key: NumberKey) => z.number().int().min(NUMBERS[key].min).max(NUMBERS[key].max)

export const monitoringSettingsSchema = z.strictObject({
  tabHidden: z.boolean(),
  windowBlur: z.boolean(),
  offline: z.boolean(),
  connectionGap: z.boolean(),
  paste: z.boolean(),
  copy: z.boolean(),
  fullscreen: z.boolean(),
  sessionTakeover: z.boolean(),
  lateSave: z.boolean(),
  minAwaySeconds: range('minAwaySeconds'),
  disconnectedAfterSeconds: range('disconnectedAfterSeconds'),
  flagAfter: range('flagAfter'),
})

/** Only what a browser may report. Server-observed kinds can't be sent by a candidate. */
export const eventsSchema = z.strictObject({
  sessionId,
  events: z
    .array(
      z.strictObject({
        type: z.enum(['TAB_HIDDEN', 'WINDOW_BLUR', 'OFFLINE', 'PASTE', 'COPY', 'FULLSCREEN_EXIT']),
        seconds: z.number().int().min(0).max(86_400).optional(),
        characters: z.number().int().min(0).max(100_000).optional(),
      })
    )
    .min(1)
    .max(20),
})

export const announcementSchema = z.strictObject({
  message: z.string().trim().min(1, 'Write a message').max(1000),
  candidateId: z.number().int().positive().optional(),
})

export const reviewSchema = z.strictObject({ note: z.string().trim().max(1000).default('') })

export const monitorQuerySchema = z.strictObject({
  search: z.string().trim().max(100).optional(),
  state: z.enum(['NOT_STARTED', 'ACTIVE', 'DISCONNECTED', 'SUBMITTED', 'FLAGGED']).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
})

export type EventsInput = z.infer<typeof eventsSchema>
export type MonitorQuery = z.infer<typeof monitorQuerySchema>

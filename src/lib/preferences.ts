/**
 * How a candidate likes the examination screen. Only these keys and values are ever stored.
 * No imports, so tests can use it.
 */
export const PREFERENCE_OPTIONS = {
  navigator: {
    label: 'Question navigator',
    choices: [['top', 'Above the question'], ['side', 'Beside the question'], ['hidden', 'Hidden']],
  },
  view: { label: 'Questions on screen', choices: [['one', 'One at a time'], ['list', 'All in a list']] },
  textSize: { label: 'Text size', choices: [['normal', 'Normal'], ['large', 'Large'], ['xlarge', 'Extra large']] },
  spacing: { label: 'Line spacing', choices: [['normal', 'Normal'], ['relaxed', 'Relaxed']] },
  contrast: { label: 'Contrast', choices: [['normal', 'Normal'], ['high', 'High']] },
  timer: { label: 'Timer', choices: [['full', 'Full'], ['compact', 'Compact']] },
} as const

export type PreferenceKey = keyof typeof PREFERENCE_OPTIONS
export type Preferences = { [K in PreferenceKey]: (typeof PREFERENCE_OPTIONS)[K]['choices'][number][0] }

export const DEFAULT_PREFERENCES: Preferences = {
  navigator: 'top',
  view: 'one',
  textSize: 'normal',
  spacing: 'normal',
  contrast: 'normal',
  timer: 'full',
}

/** Stored values merged over the defaults; anything not on the allowed list is ignored. */
export function readPreferences(stored: unknown): Preferences {
  const source = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>
  const result: Record<string, string> = { ...DEFAULT_PREFERENCES }
  for (const [key, { choices }] of Object.entries(PREFERENCE_OPTIONS)) {
    if (choices.some(([value]) => value === source[key])) result[key] = source[key] as string
  }
  return result as Preferences
}

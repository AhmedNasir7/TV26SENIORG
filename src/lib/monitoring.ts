/**
 * What can be recorded during an examination and how each examiner configures it. Everything here is
 * an indicator for a person to review, never proof of misconduct. No imports, so tests can use it.
 */
export type IndicatorType =
  | 'TAB_HIDDEN'
  | 'WINDOW_BLUR'
  | 'OFFLINE'
  | 'RECONNECTED'
  | 'PASTE'
  | 'COPY'
  | 'FULLSCREEN_EXIT'
  | 'SESSION_TAKEOVER'
  | 'LATE_SAVE_REJECTED'

export type ToggleKey =
  | 'tabHidden'
  | 'windowBlur'
  | 'offline'
  | 'connectionGap'
  | 'paste'
  | 'copy'
  | 'fullscreen'
  | 'sessionTakeover'
  | 'lateSave'

export type NumberKey = 'minAwaySeconds' | 'disconnectedAfterSeconds' | 'flagAfter'

export type MonitoringSettings = Record<ToggleKey, boolean> & Record<NumberKey, number>

type Indicator = {
  setting: ToggleKey
  /** "server" facts don't depend on the candidate's browser; "browser" reports can be blocked or faked */
  source: 'browser' | 'server'
  label: string
  option: string
  innocent: string
}

export const INDICATORS: Record<IndicatorType, Indicator> = {
  TAB_HIDDEN: {
    setting: 'tabHidden',
    source: 'browser',
    label: 'Exam page hidden',
    option: 'Switching tabs or minimising the browser',
    innocent: 'A phone call, a screen lock or an accidental shortcut also hides the page.',
  },
  WINDOW_BLUR: {
    setting: 'windowBlur',
    source: 'browser',
    label: 'Window lost focus',
    option: 'Moving to another window or application',
    innocent: 'Notifications, system pop-ups and password managers take focus too.',
  },
  OFFLINE: {
    setting: 'offline',
    source: 'browser',
    label: 'Browser went offline',
    option: 'Going offline and reconnecting',
    innocent: 'Weak Wi-Fi, a router restart or a power cut can cause this.',
  },
  RECONNECTED: {
    setting: 'connectionGap',
    source: 'server',
    label: 'Check-ins stopped, then resumed',
    option: 'Gaps in contact with the server',
    innocent: 'A slow network, a sleeping laptop or a throttled background tab can delay check-ins.',
  },
  PASTE: {
    setting: 'paste',
    source: 'browser',
    label: 'Text pasted into an answer',
    option: 'Pasting into written answers (length only, never the text)',
    innocent: 'Candidates often move their own sentences around.',
  },
  COPY: {
    setting: 'copy',
    source: 'browser',
    label: 'Text copied from the examination page',
    option: 'Copying text out of the page (length only, never the text)',
    innocent: 'Copying a number into the calculator or a note.',
  },
  FULLSCREEN_EXIT: {
    setting: 'fullscreen',
    source: 'browser',
    label: 'Left full screen',
    option: 'Asking for full screen and recording when it is left',
    innocent: 'The Escape key, a notification or a small device can end full screen.',
  },
  SESSION_TAKEOVER: {
    setting: 'sessionTakeover',
    source: 'server',
    label: 'Attempt opened elsewhere',
    option: 'The attempt being opened in another browser or window',
    innocent: 'Reopening after a crash, or switching to a working computer, looks the same.',
  },
  LATE_SAVE_REJECTED: {
    setting: 'lateSave',
    source: 'server',
    label: 'Answer arrived after the deadline',
    option: 'Answers sent after time ran out',
    innocent: 'A slow connection can deliver an answer typed in time too late.',
  },
}

export const TOGGLES = Object.values(INDICATORS).map(({ setting, option, source }) => ({ key: setting, option, source }))

export const NUMBERS: Record<NumberKey, { label: string; help: string; min: number; max: number }> = {
  minAwaySeconds: {
    label: 'Ignore time away shorter than (seconds)',
    help: 'Applies to hidden page and lost focus.',
    min: 0,
    max: 120,
  },
  disconnectedAfterSeconds: {
    label: 'Show as disconnected after (seconds)',
    help: 'Screens check in every 15 seconds. Background tabs can be slowed to once a minute.',
    min: 45,
    max: 600,
  },
  flagAfter: {
    label: 'Highlight a candidate after (unreviewed indicators)',
    help: 'Only affects the board. It never changes a score.',
    min: 1,
    max: 100,
  },
}

export const DEFAULT_SETTINGS: MonitoringSettings = {
  tabHidden: true,
  windowBlur: true,
  offline: true,
  connectionGap: true,
  paste: true,
  copy: true,
  fullscreen: false,
  sessionTakeover: true,
  lateSave: true,
  minAwaySeconds: 3,
  disconnectedAfterSeconds: 75,
  flagAfter: 3,
}

/** Candidates are told what is recorded, so these can't change once someone has started. */
export const LOCKED_AFTER_START: Array<keyof MonitoringSettings> = [...TOGGLES.map((t) => t.key), 'minAwaySeconds']

/** Stored settings merged over the defaults; anything missing or out of range falls back safely. */
export function readSettings(stored: unknown): MonitoringSettings {
  const source = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>
  const settings = { ...DEFAULT_SETTINGS }
  for (const { key } of TOGGLES) {
    if (typeof source[key] === 'boolean') settings[key] = source[key]
  }
  for (const key of Object.keys(NUMBERS) as NumberKey[]) {
    const value = source[key]
    if (Number.isInteger(value) && (value as number) >= NUMBERS[key].min && (value as number) <= NUMBERS[key].max) {
      settings[key] = value as number
    }
  }
  return settings
}

/** The plain-language list shown to candidates before and during the examination. */
export const recordedList = (settings: MonitoringSettings) => TOGGLES.filter((t) => settings[t.key]).map((t) => t.option)

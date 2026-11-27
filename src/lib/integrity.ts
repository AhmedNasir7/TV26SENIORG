/**
 * The integrity score: a plain, repeatable number from what was logged, so nobody has to trust a model
 * to rank candidates. Pure, so tests can use it. It points a person at attempts worth a look; it is never
 * proof and never changes a mark.
 *
 * Built to avoid false alarms. The one design rule: a single kind of evidence can make an attempt
 * "worth a look" (medium) but never "strong" (high). High needs two independent kinds of evidence that
 * each carry real weight, e.g. a large paste AND long absences. Honest accidents (a notification, a
 * dropped connection, reopening after a crash, pasting a short line of your own notes) are small,
 * capped, or worth nothing, and connection events score zero on their own.
 */
export type IncidentFacts = {
  type: string
  occurrences: number
  totalSeconds?: number
  longestSeconds?: number
  totalCharacters?: number
}

export type IntegrityInput = {
  incidents: IncidentFacts[]
  /** minutes between start and submit */
  minutesTaken: number
  /** characters the candidate wrote across written answers */
  writtenCharacters: number
  /** highest similarity (0 to 1) between one of their written answers and another candidate's */
  closestOtherAnswer: number
  /** length of that answer, so short answers that match by chance don't count */
  closestAnswerLength: number
  left: boolean
}

export type Signal = { kind: 'away' | 'paste' | 'copy' | 'similarity' | 'device' | 'screen' | 'left' | 'context'; label: string; points: number }
export type IntegrityScore = {
  score: number
  level: 'low' | 'medium' | 'high'
  /** how many independent kinds of evidence carry real weight */
  corroboration: number
  signals: Signal[]
  /** the same signals as short sentences, for lists and for the AI */
  reasons: string[]
}

const find = (incidents: IncidentFacts[], ...types: string[]) => incidents.filter((i) => types.includes(i.type))
const sum = (items: IncidentFacts[], pick: (i: IncidentFacts) => number | undefined) => items.reduce((total, i) => total + (pick(i) ?? 0), 0)
const minutes = (seconds: number) => (seconds >= 90 ? `${Math.round(seconds / 60)} min` : `${seconds} s`)

export function integrityScore(input: IntegrityInput): IntegrityScore {
  const { incidents, minutesTaken, writtenCharacters, closestOtherAnswer, closestAnswerLength, left } = input
  const signals: Signal[] = []
  const add = (kind: Signal['kind'], label: string, points: number) => signals.push({ kind, label, points })

  // Leaving the page (other tab or other window). Short slips are ignored; what counts is how long, and how often.
  const away = find(incidents, 'TAB_HIDDEN', 'WINDOW_BLUR')
  const awayCount = sum(away, (i) => i.occurrences)
  const awaySeconds = sum(away, (i) => i.totalSeconds)
  const longest = Math.max(0, ...away.map((i) => i.longestSeconds ?? 0))
  if (awayCount > 0) {
    const share = awaySeconds / Math.max(60, minutesTaken * 60)
    let points = 0
    if (longest >= 120) points += 20
    else if (longest >= 45) points += 12
    if (share >= 0.15) points += 15
    else if (share >= 0.07) points += 8
    if (awayCount >= 6) points += 8
    if (awaySeconds < 15 && awayCount <= 2) points = 0
    points = Math.min(35, points)
    add('away', `left the exam page ${awayCount} time${awayCount === 1 ? '' : 's'}, ${minutes(awaySeconds)} in total, longest ${minutes(longest)}`, points)
  }

  // Pasting into a written answer. Short pastes (a number, a word of their own notes) are ignored.
  const pastes = find(incidents, 'PASTE')
  const pasted = sum(pastes, (i) => i.totalCharacters)
  if (pasted > 0) {
    const share = pasted / Math.max(1, writtenCharacters)
    let points = 0
    if (pasted >= 200 && share >= 0.5) points = 40
    else if (pasted >= 200 || share >= 0.3) points = 22
    else if (pasted >= 60) points = 10
    add('paste', `pasted ${pasted} characters into answers (${Math.round(Math.min(1, share) * 100)}% of what they wrote)`, points)
  }

  // Copying text out of the page, e.g. the question to ask someone or a tool.
  const copies = find(incidents, 'COPY')
  const copyCount = sum(copies, (i) => i.occurrences)
  if (copyCount > 0) add('copy', `copied text out of the page ${copyCount} time${copyCount === 1 ? '' : 's'}`, copyCount >= 4 ? 14 : copyCount >= 2 ? 8 : 0)

  // Opening the attempt somewhere else: a second device can be reading answers, but a crash looks the same.
  const takeovers = sum(find(incidents, 'SESSION_TAKEOVER'), (i) => i.occurrences)
  if (takeovers > 0) add('device', `opened the attempt in another browser or device ${takeovers} time${takeovers === 1 ? '' : 's'}`, takeovers >= 2 ? 20 : 8)

  // Answers that match another candidate's, only when the answer is long enough for that to mean something.
  if (closestOtherAnswer >= 0.75 && closestAnswerLength >= 80) {
    const percent = Math.round(closestOtherAnswer * 100)
    const points = closestOtherAnswer >= 0.92 && closestAnswerLength >= 100 ? 40 : closestOtherAnswer >= 0.85 ? 25 : 10
    add('similarity', `a written answer is ${percent}% like another candidate's`, points)
  }

  const exits = sum(find(incidents, 'FULLSCREEN_EXIT'), (i) => i.occurrences)
  if (exits > 0) add('screen', `left full screen ${exits} time${exits === 1 ? '' : 's'}`, Math.min(12, exits * 3))

  if (left) add('left', 'left the examination, which cancelled it', 5)

  // Connection trouble is context for the examiner, never evidence on its own
  const trouble = sum(find(incidents, 'OFFLINE', 'RECONNECTED', 'LATE_SAVE_REJECTED'), (i) => i.occurrences)
  if (trouble > 0) add('context', `connection problems ${trouble} time${trouble === 1 ? '' : 's'} (not scored)`, 0)

  const score = Math.min(100, signals.reduce((total, s) => total + s.points, 0))
  const strong = signals.filter((s) => s.points >= 20).length
  const corroboration = new Set(signals.filter((s) => s.points >= 10).map((s) => s.kind)).size

  // Strong needs two independent kinds of evidence; one kind alone is at most "worth a look"
  const level = corroboration >= 2 && score >= 40 ? 'high' : score >= 25 || strong > 0 ? 'medium' : 'low'
  return { score, level, corroboration, signals, reasons: signals.map((s) => s.label) }
}

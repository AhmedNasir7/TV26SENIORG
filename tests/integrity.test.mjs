import assert from 'node:assert/strict'
import { test } from 'node:test'
import { integrityScore } from '../src/lib/integrity.ts'

const base = { incidents: [], minutesTaken: 40, writtenCharacters: 800, closestOtherAnswer: 0, closestAnswerLength: 0, left: false }
const score = (patch) => integrityScore({ ...base, ...patch })
const inc = (type, occurrences, extra = {}) => ({ type, occurrences, ...extra })

// ---- honest candidates must stay low: these are the false-positive guards
test('a quiet attempt is low', () => assert.equal(score({}).level, 'low'))

test('a few short slips (notification, alt-tab for 5 seconds) stay low', () => {
  const r = score({ incidents: [inc('TAB_HIDDEN', 2, { totalSeconds: 9, longestSeconds: 6 }), inc('WINDOW_BLUR', 1, { totalSeconds: 4, longestSeconds: 4 })] })
  assert.equal(r.level, 'low')
})

test('a dropped connection, a reconnect and a late save score nothing', () => {
  const r = score({ incidents: [inc('OFFLINE', 3, { totalSeconds: 200 }), inc('RECONNECTED', 2, { totalSeconds: 150 }), inc('LATE_SAVE_REJECTED', 1)] })
  assert.equal(r.score, 0)
  assert.equal(r.level, 'low')
})

test('pasting a short line of their own notes stays low', () => {
  assert.equal(score({ incidents: [inc('PASTE', 1, { totalCharacters: 45 })] }).level, 'low')
})

test('one reopening after a crash plus one short absence stays low', () => {
  const r = score({ incidents: [inc('SESSION_TAKEOVER', 1), inc('TAB_HIDDEN', 1, { totalSeconds: 20, longestSeconds: 20 })] })
  assert.equal(r.level, 'low')
})

test('two short answers that happen to match are ignored', () => {
  assert.equal(score({ closestOtherAnswer: 0.95, closestAnswerLength: 40 }).level, 'low')
})

// ---- cheating patterns must be caught
test('a big paste alone is worth a look, but not "strong" by itself', () => {
  const r = score({ incidents: [inc('PASTE', 1, { totalCharacters: 900 })], writtenCharacters: 1000 })
  assert.equal(r.level, 'medium')
  assert.equal(r.corroboration, 1)
})

test('a big paste plus long absences is strong', () => {
  const r = score({ incidents: [inc('PASTE', 2, { totalCharacters: 900 }), inc('TAB_HIDDEN', 4, { totalSeconds: 420, longestSeconds: 180 })], writtenCharacters: 1000 })
  assert.equal(r.level, 'high')
  assert.ok(r.corroboration >= 2)
})

test('near-identical long answers are flagged, and strong when combined with another signal', () => {
  assert.equal(score({ closestOtherAnswer: 0.96, closestAnswerLength: 300 }).level, 'medium')
  assert.equal(score({ closestOtherAnswer: 0.96, closestAnswerLength: 300, incidents: [inc('SESSION_TAKEOVER', 2)] }).level, 'high')
})

test('repeatedly switching away for a long time is flagged', () => {
  const r = score({ incidents: [inc('TAB_HIDDEN', 8, { totalSeconds: 900, longestSeconds: 240 })] })
  assert.notEqual(r.level, 'low')
})

test('the score never exceeds 100 and every signal is explained', () => {
  const r = score({
    incidents: [inc('PASTE', 5, { totalCharacters: 3000 }), inc('SESSION_TAKEOVER', 9), inc('TAB_HIDDEN', 20, { totalSeconds: 3000, longestSeconds: 600 }), inc('COPY', 6, { totalCharacters: 500 })],
    closestOtherAnswer: 0.99,
    closestAnswerLength: 500,
    left: true,
  })
  assert.ok(r.score <= 100)
  assert.equal(r.level, 'high')
  assert.equal(r.signals.length, r.reasons.length)
})

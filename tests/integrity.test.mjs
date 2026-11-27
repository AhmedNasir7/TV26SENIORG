import assert from 'node:assert/strict'
import { test } from 'node:test'
import { integrityScore } from '../src/lib/integrity.ts'

test('a quiet attempt scores zero and low', () => {
  const r = integrityScore({ incidents: [], closestOtherAnswer: 0, left: false })
  assert.equal(r.score, 0)
  assert.equal(r.level, 'low')
})

test('one kind of event is capped, so a noisy browser alone is not "high"', () => {
  const r = integrityScore({ incidents: [{ type: 'TAB_HIDDEN', occurrences: 500 }], closestOtherAnswer: 0, left: false })
  assert.equal(r.score, 30)
  assert.equal(r.level, 'medium')
})

test('near-identical answers plus pastes reach high, and the score never exceeds 100', () => {
  const r = integrityScore({ incidents: [{ type: 'PASTE', occurrences: 5 }, { type: 'SESSION_TAKEOVER', occurrences: 9 }], closestOtherAnswer: 0.95, left: true })
  assert.equal(r.level, 'high')
  assert.ok(r.score <= 100)
  assert.ok(r.reasons.length >= 3)
})

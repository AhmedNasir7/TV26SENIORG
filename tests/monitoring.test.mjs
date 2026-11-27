// Run with: node --test "tests/*.test.mjs"
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DEFAULT_SETTINGS, INDICATORS, LOCKED_AFTER_START, readSettings, recordedList, TOGGLES } from '../src/lib/monitoring.ts'

test('stored settings fall back safely', () => {
  assert.deepEqual(readSettings(null), DEFAULT_SETTINGS)
  assert.deepEqual(readSettings({ paste: 'no', minAwaySeconds: -1, disconnectedAfterSeconds: 10, flagAfter: 2.5, extra: true }), DEFAULT_SETTINGS)
  const chosen = readSettings({ paste: false, minAwaySeconds: 0, flagAfter: 10 })
  assert.equal(chosen.paste, false)
  assert.equal(chosen.minAwaySeconds, 0)
  assert.equal(chosen.flagAfter, 10)
})

test('every indicator has a switch, and candidates are told exactly what is on', () => {
  const switches = TOGGLES.map((toggle) => toggle.key)
  assert.deepEqual([...new Set(Object.values(INDICATORS).map((i) => i.setting))].sort(), [...switches].sort())
  const nothing = Object.fromEntries(switches.map((key) => [key, false]))
  assert.deepEqual(recordedList(readSettings(nothing)), [])
  assert.equal(recordedList(readSettings({ ...nothing, paste: true })).length, 1)
})

test('recording choices lock after the start; board limits do not', () => {
  assert.ok(LOCKED_AFTER_START.includes('paste') && LOCKED_AFTER_START.includes('minAwaySeconds'))
  assert.ok(!LOCKED_AFTER_START.includes('flagAfter') && !LOCKED_AFTER_START.includes('disconnectedAfterSeconds'))
})

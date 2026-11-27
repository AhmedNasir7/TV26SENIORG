// Run with: node --test "tests/*.test.mjs"
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { connectionState } from '../src/lib/connection.ts'
import { DEFAULT_PREFERENCES, readPreferences } from '../src/lib/preferences.ts'

test('connection state follows the worst signal', () => {
  const good = { browserOnline: true, failures: 0, latencyMs: 120, recovering: false, saveRetrying: false }
  assert.equal(connectionState(good), 'online')
  assert.equal(connectionState({ ...good, latencyMs: 5000 }), 'unstable')
  assert.equal(connectionState({ ...good, saveRetrying: true }), 'unstable')
  assert.equal(connectionState({ ...good, failures: 1 }), 'unstable')
  assert.equal(connectionState({ ...good, failures: 2 }), 'offline')
  assert.equal(connectionState({ ...good, recovering: true, failures: 3 }), 'reconnecting')
  assert.equal(connectionState({ ...good, browserOnline: false, recovering: true }), 'offline')
})

test('only listed preference values are accepted', () => {
  assert.deepEqual(readPreferences(null), DEFAULT_PREFERENCES)
  assert.deepEqual(readPreferences({ textSize: 'huge', view: 7, theme: 'x' }), DEFAULT_PREFERENCES)
  assert.deepEqual(readPreferences({ textSize: 'large', navigator: 'side' }), { ...DEFAULT_PREFERENCES, textSize: 'large', navigator: 'side' })
})

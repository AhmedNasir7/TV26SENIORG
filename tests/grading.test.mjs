// Run with: node --test tests/   (Node reads the TypeScript sources directly)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { gradeChoice, totalOf } from '../src/lib/grading.ts'
import { distribution, passRate, summarize } from '../src/lib/stats.ts'

const options = [
  { id: 'a', text: 'A', correct: true },
  { id: 'b', text: 'B', correct: true },
  { id: 'c', text: 'C', correct: false },
  { id: 'd', text: 'D', correct: false },
]
const multi = (selected, scoringRule = 'PARTIAL') =>
  gradeChoice({ type: 'MULTIPLE_CHOICE', scoringRule, options, selected, marks: 3 })

test('multiple select: all correct, partial, over-selection, none, invalid option', () => {
  assert.equal(multi(['a', 'b']), 3)
  assert.equal(multi(['a']), 1.5)
  assert.equal(multi(['a', 'b', 'c']), 1.5)
  assert.equal(multi(['a', 'b', 'c', 'd']), 0)
  assert.equal(multi(['c']), 0)
  assert.equal(multi([]), 0)
  assert.equal(multi(['a', 'zz']), 0)
  assert.equal(multi(['a'], 'ALL_OR_NOTHING'), 0)
  assert.equal(multi(['a', 'b', 'a'], 'ALL_OR_NOTHING'), 3)
})

test('single choice needs exactly the right option', () => {
  const one = (selected) =>
    gradeChoice({ type: 'SINGLE_CHOICE', scoringRule: 'ALL_OR_NOTHING', options: [options[0], options[2]], selected, marks: 2 })
  assert.equal(one(['a']), 2)
  assert.equal(one(['c']), 0)
  assert.equal(one(['a', 'c']), 0)
})

test('total waits for every mark, prefers the manual one and rounds once', () => {
  assert.deepEqual(totalOf([{ autoMarks: 2, manualMarks: null }, { autoMarks: null, manualMarks: null }]), { pending: 1, score: null })
  assert.deepEqual(totalOf([{ autoMarks: 0.1, manualMarks: null }, { autoMarks: 0, manualMarks: 0.2 }]), { pending: 0, score: 0.3 })
})

test('summary, pass rate and distribution', () => {
  assert.deepEqual(summarize([]), { count: 0, average: null, median: null, highest: null, lowest: null })
  assert.deepEqual(summarize([10, 2, 6, 4]), { count: 4, average: 5.5, median: 5, highest: 10, lowest: 2 })
  assert.equal(passRate([10, 2, 6, 4], 5), 50)
  assert.equal(passRate([1], null), null)
  assert.deepEqual(distribution([0, 10, 5, 8], 10).map((band) => band.count), [1, 0, 1, 0, 2])
})

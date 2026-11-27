// Run with: node --test "tests/*.test.mjs"
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { examSteps, nextAction } from '../src/lib/exam-flow.ts'

const draft = { id: 7, phase: 'DRAFT', questions: 0, enrolled: 0, blockers: 3, attempts: 0, awaitingMarking: 0, resultsPublished: false }
const closed = { ...draft, phase: 'COMPLETED', questions: 4, enrolled: 2, blockers: 0, attempts: 2 }

test('the next step follows the examination from empty draft to published results', () => {
  const label = (patch, base = draft) => nextAction({ ...base, ...patch }).label
  assert.equal(label({}), 'Add questions')
  assert.equal(label({ questions: 4 }), 'Enrol candidates')
  assert.equal(label({ questions: 4, enrolled: 2, blockers: 1 }), 'See the checklist')
  assert.equal(label({ questions: 4, enrolled: 2, blockers: 0 }), 'Review and publish')
  assert.equal(label({ phase: 'ONGOING' }, closed), 'Open the live board')
  assert.equal(label({ awaitingMarking: 1 }, closed), 'Mark answers')
  assert.equal(label({}, closed), 'Publish results')
  assert.equal(label({ resultsPublished: true }, closed), 'View results')
})

test('every step stays visible; later ones are locked until the examination opens', () => {
  const steps = examSteps(draft)
  assert.equal(steps.length, 7)
  assert.deepEqual(steps.filter((s) => s.locked).map((s) => s.key), ['sandbox', 'grading', 'results'])
  assert.deepEqual(examSteps(closed).filter((s) => s.locked), [])
})

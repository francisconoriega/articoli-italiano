/**
 * scripts/srs-harness.ts — self-checking test harness for engine/srs.ts.
 * Run with: npx tsx scripts/srs-harness.ts
 */
import type { ItemProgress } from '../src/types'
import {
  STABILITY_LADDER_MS,
  RELAPSE_MS,
  nextStabilityStep,
  dueFromStep,
  isDue,
  overdueMs,
} from '../src/engine/srs'

/* ── Tiny helper ─────────────────────────────────────────────────────────── */

function makeProgress(seen: number, due: number | null): ItemProgress {
  return {
    seen,
    correct: 0,
    wrong: 0,
    mastery: 0.2,
    difficulty: 0.8,
    stability: 0,
    streak: 0,
    recentLapses: 0,
    level: 0,
    consecutiveMisses: 0,
    lastResult: null,
    lastSeen: null,
    due,
    averageResponseMs: null,
    skillIds: [],
  }
}

/* ── Assertion runner ─────────────────────────────────────────────────────── */

let passed = 0
let failed = 0

function assert(label: string, condition: boolean): void {
  if (condition) {
    console.log(`PASS  ${label}`)
    passed++
  } else {
    console.log(`FAIL  ${label}`)
    failed++
    process.exitCode = 1
  }
}

/* ── Tests ────────────────────────────────────────────────────────────────── */

const NOW = 1_700_000_000_000 // arbitrary fixed "now"

// 1. STABILITY_LADDER_MS is strictly increasing
console.log('\n── 1. STABILITY_LADDER_MS is strictly increasing')
let strictlyIncreasing = true
for (let i = 1; i < STABILITY_LADDER_MS.length; i++) {
  if (STABILITY_LADDER_MS[i] <= STABILITY_LADDER_MS[i - 1]) {
    strictlyIncreasing = false
    break
  }
}
assert('STABILITY_LADDER_MS is strictly increasing', strictlyIncreasing)
assert('STABILITY_LADDER_MS has at least 2 elements', STABILITY_LADDER_MS.length >= 2)

// 2. isDue edge cases
console.log('\n── 2. isDue edge cases')
assert('isDue(undefined, now) is false', isDue(undefined, NOW) === false)

const seenPastDue = makeProgress(1, NOW - 1000) // seen, due in the past
assert('seen item with due in the past is due', isDue(seenPastDue, NOW) === true)

const seenFutureDue = makeProgress(1, NOW + 60_000) // seen, due in the future
assert('seen item with due in the future is not due', isDue(seenFutureDue, NOW) === false)

const seenNullDue = makeProgress(1, null)
assert('seen item with due: null is not due', isDue(seenNullDue, NOW) === false)

const unseenItem = makeProgress(0, NOW - 1000) // never seen, even with past due
assert('unseen item (seen===0) is not due even with past due', isDue(unseenItem, NOW) === false)

// 3. nextStabilityStep
console.log('\n── 3. nextStabilityStep')
const maxStep = STABILITY_LADDER_MS.length - 1

assert('success from step 0 → step 1', nextStabilityStep(0, true) === 1)
assert('success from step 1 → step 2', nextStabilityStep(1, true) === 2)
assert(`success from max step stays capped at ${maxStep}`, nextStabilityStep(maxStep, true) === maxStep)
assert(`success from max-1 → max (${maxStep})`, nextStabilityStep(maxStep - 1, true) === maxStep)

assert('lapse from step 0 → 0 (floored)', nextStabilityStep(0, false) === 0)
assert('lapse from step 1 → 0 (floored)', nextStabilityStep(1, false) === 0)
assert('lapse from step 2 → 0', nextStabilityStep(2, false) === 0)
assert('lapse from step 3 → 1', nextStabilityStep(3, false) === 1)
assert('lapse from step 4 → 2', nextStabilityStep(4, false) === 2)

// Legacy float stability is clamped/rounded: 2.7 rounds to 3
assert('legacy float 2.7 rounds to step 3 before success → 4', nextStabilityStep(2.7, true) === 4)
assert('legacy float 0.4 rounds to step 0 before lapse → 0', nextStabilityStep(0.4, false) === 0)

// 4. dueFromStep
console.log('\n── 4. dueFromStep')

// Non-decreasing in step
let nonDecreasing = true
for (let i = 1; i < STABILITY_LADDER_MS.length; i++) {
  if (dueFromStep(i, NOW) < dueFromStep(i - 1, NOW)) {
    nonDecreasing = false
    break
  }
}
assert('dueFromStep is non-decreasing in step', nonDecreasing)

// Equals now + ladder[step] for each valid step
let allMatch = true
for (let i = 0; i < STABILITY_LADDER_MS.length; i++) {
  const expected = NOW + STABILITY_LADDER_MS[i]
  if (dueFromStep(i, NOW) !== expected) {
    allMatch = false
    console.log(`  step ${i}: expected ${expected}, got ${dueFromStep(i, NOW)}`)
    break
  }
}
assert('dueFromStep(step, now) === now + STABILITY_LADDER_MS[step] for all steps', allMatch)

// Clamping: negative step clamps to 0
assert('dueFromStep(-1, now) === dueFromStep(0, now)', dueFromStep(-1, NOW) === dueFromStep(0, NOW))
// Over-range step clamps to max
assert(
  `dueFromStep(999, now) === dueFromStep(${maxStep}, now)`,
  dueFromStep(999, NOW) === dueFromStep(maxStep, NOW),
)

// 5. overdueMs sanity
console.log('\n── 5. overdueMs sanity')
assert('overdueMs(undefined, now) === -Infinity', overdueMs(undefined, NOW) === -Infinity)
assert('overdueMs(unseen, now) === -Infinity', overdueMs(makeProgress(0, NOW - 1), NOW) === -Infinity)
assert('overdueMs(null due, now) === -Infinity', overdueMs(makeProgress(1, null), NOW) === -Infinity)
const overdueItem = makeProgress(1, NOW - 5000)
assert('overdueMs returns positive for overdue item', overdueMs(overdueItem, NOW) === 5000)
const notYetItem = makeProgress(1, NOW + 3000)
assert('overdueMs returns negative for not-yet-due item', overdueMs(notYetItem, NOW) === -3000)

// 6. RELAPSE_MS exists and is a positive number
console.log('\n── 6. RELAPSE_MS')
assert('RELAPSE_MS is a positive number', typeof RELAPSE_MS === 'number' && RELAPSE_MS > 0)
assert('RELAPSE_MS < first ladder step (resurfaces sooner than step 0)', RELAPSE_MS < STABILITY_LADDER_MS[0])

/* ── Summary ──────────────────────────────────────────────────────────────── */

console.log(`\n${'─'.repeat(50)}`)
console.log(`${passed + failed} assertions: ${passed} PASS, ${failed} FAIL`)
if (failed === 0) {
  console.log('All assertions passed.')
} else {
  console.log(`${failed} assertion(s) FAILED.`)
}

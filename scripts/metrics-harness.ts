/**
 * scripts/metrics-harness.ts — self-checking harness for engine/metrics.ts.
 * Run with: npx tsx scripts/metrics-harness.ts
 */
import type { Item, ItemProgress } from '../src/types'
import { createStore } from '../src/engine/storage'
import { studyMetrics } from '../src/engine/metrics'

/* ── Tiny helpers ─────────────────────────────────────────────────────────── */

// studyMetrics only reads item.id, so a minimal stub is enough.
function item(id: string): Item {
  return { id } as unknown as Item
}

function prog(seen: number, mastery: number, due: number | null): ItemProgress {
  return {
    seen,
    correct: 0,
    wrong: 0,
    mastery,
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

let passed = 0
let failed = 0
function assert(label: string, cond: boolean): void {
  if (cond) {
    console.log(`PASS  ${label}`)
    passed++
  } else {
    console.log(`FAIL  ${label}`)
    failed++
    process.exitCode = 1
  }
}

/* ── Tests ────────────────────────────────────────────────────────────────── */

const NOW = Date.parse('2026-06-01T00:00:00Z')
const items: Item[] = ['a', 'b', 'c', 'd', 'e'].map(item)
const store = createStore()
store.items = {
  a: prog(5, 0.9, NOW - 1000), // due, mastered
  b: prog(3, 0.5, NOW - 1000), // due, learning
  c: prog(2, 0.95, NOW + 10_000), // not due, mastered
  d: prog(1, 0.3, null), // not due, learning
  // e: absent → counts as new
}
store.settings.examDate = '2026-06-11'

console.log('\n── 1. studyMetrics on a mixed synthetic pool')
const m = studyMetrics(items, store, NOW)
assert('poolSize === 5', m.poolSize === 5)
assert('dueCount === 2 (a, b past due)', m.dueCount === 2)
assert('masteredItems === 2 (a, c ≥ 0.85)', m.masteredItems === 2)
assert('learningItems === 2 (b, d < 0.85)', m.learningItems === 2)
assert('newItems === 1 (e absent)', m.newItems === 1)
assert('seenItems === 4', m.seenItems === 4)
assert('seen + new === poolSize', m.seenItems + m.newItems === m.poolSize)
assert('mastered + learning === seenItems', m.masteredItems + m.learningItems === m.seenItems)
assert('daysLeft === 10', m.daysLeft === 10)

console.log('\n── 2. no exam date → daysLeft null')
store.settings.examDate = null
assert('daysLeft null when no exam date', studyMetrics(items, store, NOW).daysLeft === null)

console.log('\n── 3. empty pool')
const empty = studyMetrics([], createStore(), NOW)
assert(
  'empty pool → all zero',
  empty.poolSize === 0 && empty.dueCount === 0 && empty.newItems === 0 && empty.seenItems === 0,
)

/* ── Summary ──────────────────────────────────────────────────────────────── */

console.log(`\n${'─'.repeat(50)}`)
console.log(`${passed + failed} assertions: ${passed} PASS, ${failed} FAIL`)
console.log(failed === 0 ? 'All assertions passed.' : `${failed} assertion(s) FAILED.`)

/**
 * Verifies mergeProgress (dev cross-port sync). Synthetic data only — never reads
 * or writes the real shared file. Run with: `node scripts/dev-progress-merge-harness.mjs`.
 */
import { mergeProgress } from './dev-progress-merge.mjs'

let pass = 0
let fail = 0
function assert(cond, msg) {
  if (cond) {
    pass += 1
    console.log('PASS', msg)
  } else {
    fail += 1
    console.log('FAIL', msg)
  }
}

const item = (lastSeen, extra = {}) => ({ seen: 1, mastery: 0.5, lastSeen, ...extra })

// 1. Recency: the side with the newer lastSeen wins, per item.
{
  const a = { items: { x: item(100, { mastery: 0.9 }) }, skills: {}, history: [] }
  const b = { items: { x: item(200, { mastery: 0.2 }) }, skills: {}, history: [] }
  const m = mergeProgress(a, b)
  assert(m.items.x.lastSeen === 200 && m.items.x.mastery === 0.2, 'newer lastSeen wins (b over a)')
  const m2 = mergeProgress(b, a) // order shouldn't matter for the winner
  assert(m2.items.x.lastSeen === 200, 'newer lastSeen wins regardless of arg order')
}

// 2. No data loss: items present on only one side are kept.
{
  const a = { items: { only_a: item(50) }, skills: {}, history: [] }
  const b = { items: { only_b: item(60) }, skills: {}, history: [] }
  const m = mergeProgress(a, b)
  assert('only_a' in m.items && 'only_b' in m.items, 'items unique to each side are both kept')
}

// 3. The clobber scenario the middleware must prevent: two instances, disjoint recent
//    answers; merge must contain BOTH (not just the last writer's).
{
  const fileNow = { items: { p: item(10), q: item(10) }, skills: {}, history: [] }
  const instanceA = { items: { p: item(10), q: item(10), newA: item(900) }, skills: {}, history: [] }
  const afterA = mergeProgress(fileNow, instanceA) // A saves
  const instanceB = { items: { p: item(10), q: item(10), newB: item(950) }, skills: {}, history: [] }
  const afterB = mergeProgress(afterA, instanceB) // B saves on top
  assert('newA' in afterB.items && 'newB' in afterB.items, "both instances' new items survive sequential saves")
}

// 4. Skills merge by exposure count.
{
  const a = { items: {}, skills: { s: { seen: 3, mastery: 0.4 } }, history: [] }
  const b = { items: {}, skills: { s: { seen: 7, mastery: 0.6 } }, history: [] }
  const m = mergeProgress(a, b)
  assert(m.skills.s.seen === 7, 'skill with more exposures wins')
}

// 5. History: concat, de-dupe, cap at 50, sorted ascending by endedAt.
{
  const h = (t) => ({ endedAt: t, answered: 15, correct: 10 })
  const a = { items: {}, skills: {}, history: [h(1), h(2), h(3)] }
  const b = { items: {}, skills: {}, history: [h(2), h(3), h(4)] } // 2,3 duplicate a
  const m = mergeProgress(a, b)
  assert(m.history.length === 4, 'duplicate rounds are de-duped (4 unique)')
  assert(m.history[0].endedAt === 1 && m.history[3].endedAt === 4, 'history sorted ascending')
  const big = { items: {}, skills: {}, history: Array.from({ length: 80 }, (_, i) => h(1000 + i)) }
  assert(mergeProgress({ items: {}, skills: {}, history: [] }, big).history.length === 50, 'history capped at 50')
}

// 6. Null / malformed inputs don't throw and fall back sensibly.
{
  assert(mergeProgress(null, { items: { x: item(1) } }).items.x.lastSeen === 1, 'null current → incoming')
  assert(mergeProgress({ items: { x: item(1) } }, null).items.x.lastSeen === 1, 'null incoming → current')
  assert(mergeProgress(null, null) === null, 'both null → null (no throw)')
}

console.log(`\n${pass} pass, ${fail} fail`)
if (fail) process.exitCode = 1

/**
 * scripts/scheduler-harness.ts — self-checking test harness for engine/scheduler.ts.
 * Run with: npx tsx scripts/scheduler-harness.ts
 *
 * Uses REAL items (the assembled catalog → buildItems) and a real ProgressStore, with a
 * fixed `now` and a seeded RNG so every run is deterministic. Each assertion prints
 * PASS / FAIL and sets process.exitCode = 1 on any failure.
 */
import type { Item, ItemProgress, ProgressStore, AnswerResult } from '../src/types'
import { PERSONS } from '../src/types'
import { catalog } from '../src/content'
import { buildItems } from '../src/engine/items'
import { createStore } from '../src/engine/storage'
import { createItemProgress, applyAnswer } from '../src/engine/mastery'
import { poolForMode } from '../src/engine/select'
import {
  composeRound,
  topicInfos,
  MIN_BLOCK,
  MAX_BLOCK,
} from '../src/engine/scheduler'

/* ── Determinism: fixed clock + seeded RNG (mulberry32) ─────────────────────── */

const NOW = 1_700_000_000_000

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ── Assertion runner ───────────────────────────────────────────────────────── */

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

/* ── Store helpers ──────────────────────────────────────────────────────────── */

const ALL: Item[] = buildItems(catalog)
const MIXED: Item[] = poolForMode(ALL, 'mixed')
const byId = new Map(ALL.map((i) => [i.id, i]))

function freshStore(): ProgressStore {
  return createStore()
}

/** Seed a fully-mastered, typed (level 2) progress for an item id. */
function seedMastered(store: ProgressStore, id: string): void {
  const item = byId.get(id)
  if (!item) throw new Error(`seedMastered: unknown id ${id}`)
  const p = createItemProgress(item)
  store.items[id] = {
    ...p,
    seen: 5,
    correct: 5,
    mastery: 0.95,
    level: 2,
    lastResult: 'correct',
    lastSeen: NOW - 1000,
    due: NOW + 86_400_000,
    averageResponseMs: 2000,
    skillIds: item.skills.slice(),
  }
}

/** Seed a weak-but-seen progress (mastery below the WIP threshold). */
function seedWeak(store: ProgressStore, id: string, mastery = 0.4): void {
  const item = byId.get(id)
  if (!item) throw new Error(`seedWeak: unknown id ${id}`)
  const p = createItemProgress(item)
  store.items[id] = {
    ...p,
    seen: 2,
    correct: 1,
    wrong: 1,
    mastery,
    level: 1,
    lastResult: 'correct',
    lastSeen: NOW - 1000,
    due: NOW + 60_000,
    skillIds: item.skills.slice(),
  }
}

/** Seed an overdue (due in the past) seen item. */
function seedOverdue(store: ProgressStore, id: string, overdueByMs: number): void {
  const item = byId.get(id)
  if (!item) throw new Error(`seedOverdue: unknown id ${id}`)
  const p = createItemProgress(item)
  store.items[id] = {
    ...p,
    seen: 3,
    correct: 2,
    wrong: 1,
    mastery: 0.5,
    level: 1,
    lastResult: 'correct',
    lastSeen: NOW - overdueByMs - 1000,
    due: NOW - overdueByMs,
    skillIds: item.skills.slice(),
  }
}

/** Apply a sequence of answers to an item (creating progress if missing). */
function answer(store: ProgressStore, id: string, result: AnswerResult, times = 1): void {
  const item = byId.get(id)
  if (!item) throw new Error(`answer: unknown id ${id}`)
  let p: ItemProgress = store.items[id] ?? createItemProgress(item)
  for (let i = 0; i < times; i++) p = applyAnswer(p, result, 4000, NOW)
  store.items[id] = p
}

function topicItems(pool: Item[], topic: string): Item[] {
  return pool.filter((i) => i.topic === topic)
}

/* ───────────────────────────────────────────────────────────────────────────
 * 1. Fresh store, full mixed pool, size 15: focus chosen (acquisition|new),
 *    block within [MIN_BLOCK, MAX_BLOCK], and the block is contiguous at the front.
 * ─────────────────────────────────────────────────────────────────────────── */
console.log('\n── 1. Fresh store: focus chosen, block sized & contiguous')
{
  const store = freshStore()
  const plan = composeRound(MIXED, store, NOW, 15, mulberry32(1))
  assert('1a focusTopic chosen', plan.focusTopic !== null)
  assert(
    `1b reason is acquisition|new (got ${plan.reason})`,
    plan.reason === 'acquisition' || plan.reason === 'new',
  )
  assert(
    `1c miniLessonIds.length in [${MIN_BLOCK}, ${MAX_BLOCK}] (got ${plan.miniLessonIds.length})`,
    plan.miniLessonIds.length >= MIN_BLOCK && plan.miniLessonIds.length <= MAX_BLOCK,
  )
  const front = plan.items.slice(0, plan.miniLessonIds.length).map((i) => i.id)
  assert(
    '1d block is contiguous at the front',
    JSON.stringify(front) === JSON.stringify(plan.miniLessonIds),
  )
  assert(`1e round length ≤ 15 (got ${plan.items.length})`, plan.items.length <= 15)
}

/* ───────────────────────────────────────────────────────────────────────────
 * 2. Force a verb topic (verb:fare) to be the focus while fresh: block = the 6
 *    persons in io→loro order.
 * ─────────────────────────────────────────────────────────────────────────── */
console.log('\n── 2. Verb focus: block is the 6 persons in io→loro order')
{
  const store = freshStore()
  // Restrict the pool to one verb's 6 conjugation persons so the acquisition block is
  // the canonical "drill all 6 persons" set. (verb:fare also carries exam-sentence items
  // — same topic & kind, but ids start with "sentence:" — excluded so the io→loro
  // assertion is unambiguous.)
  const verbPool = topicItems(MIXED, 'verb:fare').filter((i) => i.id.startsWith('verb:'))
  const plan = composeRound(verbPool, store, NOW, 12, mulberry32(2))
  assert('2a focusTopic === verb:fare', plan.focusTopic === 'verb:fare')
  assert(`2b block has 6 items (got ${plan.miniLessonIds.length})`, plan.miniLessonIds.length === 6)
  const persons = plan.miniLessonIds.map((id) => {
    const item = byId.get(id)!
    const skill = item.skills.find((s) => s.startsWith('person:'))
    return skill ? skill.slice('person:'.length) : '?'
  })
  assert(
    `2c persons in io→loro order (got ${persons.join(',')})`,
    JSON.stringify(persons) === JSON.stringify([...PERSONS]),
  )
}

/* ───────────────────────────────────────────────────────────────────────────
 * 3. Number focus (num:tens): block figures ascending.
 * ─────────────────────────────────────────────────────────────────────────── */
console.log('\n── 3. Number focus: block figures ascending')
{
  const store = freshStore()
  const tensPool = topicItems(MIXED, 'num:tens')
  const plan = composeRound(tensPool, store, NOW, 12, mulberry32(3))
  assert('3a focusTopic === num:tens', plan.focusTopic === 'num:tens')
  const figures = plan.miniLessonIds.map((id) => byId.get(id)!.prompt.figure ?? -1)
  let ascending = true
  for (let i = 1; i < figures.length; i++) if (figures[i] < figures[i - 1]) ascending = false
  assert(`3b figures ascending (got ${figures.join(',')})`, ascending && figures.length > 0)
}

/* ───────────────────────────────────────────────────────────────────────────
 * 4. Several DIFFERENT-topic overdue items + a fresh pool: overdue items appear,
 *    and (restricted to the due items present) they are most-overdue-first.
 * ─────────────────────────────────────────────────────────────────────────── */
console.log('\n── 4. Overdue review items appear, ordered most-overdue-first')
{
  const store = freshStore()
  // Pick items from distinct topics, overdue by varying amounts.
  const overdueSeeds: Array<{ id: string; over: number }> = [
    { id: 'verb:presente:essere:io', over: 5 * 60_000 },
    { id: 'verb:presente:avere:tu', over: 30 * 60_000 },
    { id: 'number:card:5', over: 120 * 60_000 },
    { id: 'pronoun:io', over: 10 * 60_000 },
  ].filter((s) => byId.has(s.id))
  for (const s of overdueSeeds) seedOverdue(store, s.id, s.over)

  const plan = composeRound(MIXED, store, NOW, 20, mulberry32(4))
  const present = overdueSeeds.filter((s) => plan.items.some((i) => i.id === s.id))
  assert(`4a overdue items present in round (${present.length}/${overdueSeeds.length})`, present.length === overdueSeeds.length)

  // Restricted to the seeded due items present in the round, check most-overdue-first ordering.
  const seededIds = new Set(overdueSeeds.map((s) => s.id))
  const dueOrderInRound = plan.items.filter((i) => seededIds.has(i.id))
  const overFor = (id: string): number => overdueSeeds.find((s) => s.id === id)!.over
  let ordered = true
  for (let i = 1; i < dueOrderInRound.length; i++) {
    if (overFor(dueOrderInRound[i].id) > overFor(dueOrderInRound[i - 1].id)) ordered = false
  }
  assert('4b due items ordered most-overdue-first', ordered && dueOrderInRound.length === overdueSeeds.length)
}

/* ───────────────────────────────────────────────────────────────────────────
 * 5. Remediation: a topic's items with consecutiveMisses >= 1 → that topic is
 *    the focus with reason 'remediation'.
 * ─────────────────────────────────────────────────────────────────────────── */
console.log('\n── 5. Remediation: missed topic becomes focus')
{
  const store = freshStore()
  // First make the topic "started" with at least one success (so it is learning, not new),
  // then induce a struggle signal with wrong answers (consecutiveMisses >= 1).
  const target = 'verb:fare'
  const targetIds = topicItems(MIXED, target).map((i) => i.id)
  // Seed the whole topic as started/weak so it reads as 'learning'.
  for (const id of targetIds) seedWeak(store, id, 0.45)
  // Now hammer a couple of its items wrong to create a struggle signal.
  answer(store, targetIds[0], 'wrong', 1)
  answer(store, targetIds[1], 'wrong', 1)

  const plan = composeRound(MIXED, store, NOW, 15, mulberry32(5))
  assert(`5a focusTopic === ${target} (got ${plan.focusTopic})`, plan.focusTopic === target)
  assert(`5b reason === 'remediation' (got ${plan.reason})`, plan.reason === 'remediation')
}

/* ───────────────────────────────────────────────────────────────────────────
 * 6. WIP gate: ≥ 12 seen-but-weak items across started topics → no brand-new topic.
 * ─────────────────────────────────────────────────────────────────────────── */
console.log('\n── 6. WIP gate: no new topic when ≥ 12 items are weak')
{
  const store = freshStore()
  // Seed 14 weak items spread across a few started topics.
  const seedTargets = [
    ...topicItems(MIXED, 'verb:fare'),
    ...topicItems(MIXED, 'verb:essere'),
    ...topicItems(MIXED, 'verb:avere'),
  ]
    .slice(0, 14)
    .map((i) => i.id)
  for (const id of seedTargets) seedWeak(store, id, 0.5)

  const plan = composeRound(MIXED, store, NOW, 15, mulberry32(6))
  assert(`6a reason !== 'new' (got ${plan.reason})`, plan.reason !== 'new')
}

/* ───────────────────────────────────────────────────────────────────────────
 * 7. Lock: fresh store reports num:compound 'locked', but an exam-weight compound
 *    (figure 27 or 38, examWeight ≥ 2) is still eligible to appear (not filtered out).
 * ─────────────────────────────────────────────────────────────────────────── */
console.log('\n── 7. Lock gate + exam-survival carve-out')
{
  const store = freshStore()
  const infos = topicInfos(MIXED, store, NOW)
  const compound = infos.get('num:compound')
  assert('7a num:compound reported in topicInfos', compound !== undefined)
  assert(`7b num:compound state === 'locked' (got ${compound?.state})`, compound?.state === 'locked')

  // Find an exam-weight compound item (e.g. 27 or 38) and confirm it can appear despite the lock.
  const examCompound = MIXED.find(
    (i) => i.topic === 'num:compound' && i.examWeight >= 2 && (i.prompt.figure === 27 || i.prompt.figure === 38),
  )
  assert('7c an exam-weight compound (27/38) exists', examCompound !== undefined)
  if (examCompound) {
    // Restrict the pool so the carve-out item is the obvious draw; large round to force inclusion.
    const carvePool = [
      examCompound,
      ...topicItems(MIXED, 'num:compound'), // includes locked, non-exam compounds
    ]
    // De-dup
    const seen = new Set<string>()
    const dedup = carvePool.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
    const plan = composeRound(dedup, store, NOW, dedup.length, mulberry32(7))
    assert(
      '7d exam-weight compound is eligible (appears in round)',
      plan.items.some((i) => i.id === examCompound.id),
    )
    // And a non-exam locked compound should NOT appear (it is filtered out).
    const lockedNonExam = dedup.find((i) => i.examWeight < 2)
    if (lockedNonExam) {
      assert(
        '7e non-exam locked compound is filtered out',
        !plan.items.some((i) => i.id === lockedNonExam.id),
      )
    }
  }
}

/* ───────────────────────────────────────────────────────────────────────────
 * 8. examDate ramp: with examDate ~1 day out, block is no larger than with examDate
 *    unset (non-increasing), and reason !== 'new' (consolidate near the exam).
 * ─────────────────────────────────────────────────────────────────────────── */
console.log('\n── 8. examDate ramp: smaller block & no new topic near the exam')
{
  // Build a fresh store and a clone with an exam date ~1 day from NOW.
  const baseStore = freshStore()
  const planUnset = composeRound(MIXED, baseStore, NOW, 15, mulberry32(8))

  const soonStore = freshStore()
  const oneDay = new Date(NOW + 1 * 86_400_000 + 3_600_000).toISOString().slice(0, 10)
  soonStore.settings.examDate = oneDay
  const planSoon = composeRound(MIXED, soonStore, NOW, 15, mulberry32(8))

  assert(
    `8a block non-increasing near exam (unset ${planUnset.miniLessonIds.length} ≥ soon ${planSoon.miniLessonIds.length})`,
    planSoon.miniLessonIds.length <= planUnset.miniLessonIds.length,
  )
  assert(`8b reason !== 'new' near exam (got ${planSoon.reason})`, planSoon.reason !== 'new')
}

/* ── Summary ────────────────────────────────────────────────────────────────── */

console.log(`\n${'─'.repeat(56)}`)
console.log(`${passed + failed} assertions: ${passed} PASS, ${failed} FAIL`)
if (failed === 0) console.log('All assertions passed.')
else console.log(`${failed} assertion(s) FAILED.`)

/**
 * scripts/session-harness.ts — integration smoke test for the scheduler-driven
 * PracticeSession. Runs under `npx tsx` (outside src/, not part of npm run check).
 *
 * Proves the wiring the browser would otherwise have to demonstrate by eye:
 *   1. a fresh round serves the mini-lesson block consecutively, same focus topic;
 *   2. a missed item resurfaces within the round (the focused-burst requeue);
 *   3. a round completes at roundSize and topic progress is reported.
 */
import { catalog } from '../src/content'
import { buildItems } from '../src/engine/items'
import { createStore } from '../src/engine/storage'
import { PracticeSession } from '../src/engine/session'

const items = buildItems(catalog)
const NOW = 1_800_000_000_000

let pass = 0
let fail = 0
function assert(cond: boolean, msg: string): void {
  if (cond) {
    pass += 1
    console.log('PASS', msg)
  } else {
    fail += 1
    console.log('FAIL', msg)
  }
}

// ── Test 1: mini-lesson block is contiguous at the front, all one focus topic. ──
{
  const store = createStore()
  const s = new PracticeSession(items, store)
  s.startRound(NOW)
  const plan = s.plan
  assert(plan !== null, 'a plan is composed for the round')
  console.log(`  focus=${plan?.focusTopic} reason=${plan?.reason} block=${plan?.miniLessonIds.length}`)

  const served: Array<{ id: string; topic: string; mini: boolean }> = []
  for (let i = 0; i < s.roundSize; i += 1) {
    const cur = s.current
    if (!cur) break
    served.push({ id: cur.id, topic: cur.topic, mini: s.isMiniLesson })
    const res = s.submit(cur.answer, NOW) // answer correctly
    if (res.roundComplete) break
    s.next(NOW)
  }

  const miniCount = served.filter((x) => x.mini).length
  const contiguous = served.slice(0, miniCount).every((x) => x.mini)
  const oneTopic = served.slice(0, miniCount).every((x) => x.topic === plan?.focusTopic)
  assert(miniCount >= 1, 'the mini-lesson block has at least one item')
  assert(contiguous, 'mini-lesson items are served consecutively at the front')
  assert(oneTopic, 'every mini-lesson item shares the focus topic')
  console.log('  served:', served.map((x) => x.topic + (x.mini ? '*' : '')).join('  '))
}

// ── Test 2: a missed item comes back within the round (focused burst). ──
{
  const store = createStore()
  const s = new PracticeSession(items, store)
  s.startRound(NOW)
  const missedId = s.current?.id ?? ''
  s.submit('zzz-wrong-zzz', NOW) // a clean miss → requeued
  s.next(NOW)
  let resurfaced = false
  for (let i = 0; i < 40; i += 1) {
    const cur = s.current
    if (!cur) break
    if (cur.id === missedId) {
      resurfaced = true
      break
    }
    s.submit(cur.answer, NOW)
    s.next(NOW)
  }
  assert(missedId !== '', 'there was a first item to miss')
  assert(resurfaced, 'a missed item resurfaces within the round')
}

// ── Test 3: a full round completes at roundSize; topic progress is reported. ──
{
  const store = createStore()
  const s = new PracticeSession(items, store)
  s.startRound(NOW)
  let answered = 0
  let completed = false
  for (let i = 0; i < s.roundSize + 5; i += 1) {
    const cur = s.current
    if (!cur) break
    const res = s.submit(cur.answer, NOW)
    answered += 1
    if (res.roundComplete) {
      completed = true
      break
    }
    s.next(NOW)
  }
  assert(completed && answered === s.roundSize, `round completes at roundSize (${answered})`)
  const progress = s.topicProgress(NOW)
  assert(progress.length > 0, 'topicProgress reports topics')
  const started = progress.filter((t) => t.seen > 0)
  assert(started.length > 0, 'at least one topic shows progress after a round')
  console.log(`  topics=${progress.length} started=${started.length}`)
}

console.log(`\n${pass} pass, ${fail} fail`)
if (fail) process.exitCode = 1

/**
 * scripts/priming-harness.ts — unit harness for skill-primed graduation.
 * Runs under `npx tsx` (outside src/, not part of npm run check).
 *
 * Proves the contract from claude-PRIMING brief:
 *   1. regular article item + governing skill mastered → starts at TYPING (level 2),
 *      with 0.2 < mastery ≤ cap;
 *   2. exception item + same mastered skill → still MC (choice), level 0;
 *   3. regular item + weak / under-exposed governing skill → MC, level 0;
 *   4. fresh learner (empty skills) → everything starts MC (no regression);
 *   5. one correct typed answer on a primed item → reaches level 2 with higher mastery
 *      than a non-primed item after one correct, and is no longer unseen-priority;
 *   6. a MISSED primed item self-corrects straight back to the MC ladder;
 *   7. dataset audit: the ambiguous-gender -e nouns are tagged → never primable.
 */
import type { Item, SkillProgress } from '../src/types'
import { catalog } from '../src/content'
import { buildItems } from '../src/engine/items'
import { createStore } from '../src/engine/storage'
import { PracticeSession } from '../src/engine/session'
import { applyAnswer, createItemProgress, selectionWeight } from '../src/engine/mastery'
import { presentationForItem } from '../src/engine/choices'
import {
  governingSkill,
  isPrimable,
  primedStartLevel,
  primedStartMastery,
  createPrimedItemProgress,
  PRIME_MASTERY_CAP,
} from '../src/engine/priming'

const items = buildItems(catalog)
const byId = new Map(items.map((i) => [i.id, i]))
const NOW = 1_800_000_000_000
const FAST_MS = 1500 // < 3000 → top learning rate, identical for both compared items

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
function get(id: string): Item {
  const it = byId.get(id)
  if (!it) throw new Error(`harness: missing item ${id}`)
  return it
}
function mastered(mastery: number, seen = 12): SkillProgress {
  return { seen, correct: seen, wrong: 0, mastery }
}

// Items: casa = regular `la`; mano = exception `la`; libro = regular `il`.
const casa = get('article:def:casa:sing')
const mano = get('article:def:mano:sing')
const libro = get('article:def:libro:sing')

// Sanity: governing skills are the article VALUE, not the def/indef marker.
assert(governingSkill(casa) === 'article:la', 'governingSkill(casa) is article:la')
assert(governingSkill(mano) === 'article:la', 'governingSkill(mano) is article:la (same rule-skill)')
assert(governingSkill(get('verb:presente:fare:io')) === null, 'governingSkill(verb) is null (scoped to articles)')

// ── Test 1: regular item + mastered rule → typing, level 2, 0.2 < mastery ≤ cap. ──
{
  const skills = { 'article:la': mastered(0.85) }
  const stage = presentationForItem(undefined, casa, skills)
  const level = primedStartLevel(casa, skills)
  const m = primedStartMastery(casa, skills)
  assert(isPrimable(casa), 'regular casa is primable')
  assert(stage.input === 'type' && stage.gloss === false, '1) mastered-rule regular → TYPING, no gloss')
  assert(level === 2, '1) primed start level is 2')
  assert(m > 0.2 && m <= PRIME_MASTERY_CAP, `1) primed mastery in (0.2, ${PRIME_MASTERY_CAP}] (got ${m.toFixed(3)})`)
}

// ── Test 2: exception item + same mastered skill → MC, level 0. ──
{
  const skills = { 'article:la': mastered(0.95) }
  assert(!isPrimable(mano), 'exception mano is NOT primable')
  assert(presentationForItem(undefined, mano, skills).input === 'choice', '2) exception → still multiple-choice')
  assert(primedStartLevel(mano, skills) === 0, '2) exception primed start level is 0')
}

// ── Test 3: regular item + weak / under-exposed governing skill → MC, level 0. ──
{
  const underExposed = { 'article:il': mastered(0.9, 4) } // seen 4 < PRIME_MIN_SKILL_SEEN
  assert(primedStartLevel(libro, underExposed) === 0, '3a) under-exposed rule (seen<8) → level 0')
  assert(presentationForItem(undefined, libro, underExposed).input === 'choice', '3a) under-exposed → MC')

  const weak = { 'article:il': { seen: 14, correct: 6, wrong: 8, mastery: 0.45 } }
  assert(primedStartLevel(libro, weak) === 0, '3b) weak rule (mastery<0.6) → level 0')
  assert(presentationForItem(undefined, libro, weak).input === 'choice', '3b) weak → MC')
}

// ── Test 4: fresh learner (empty skills) → everything starts MC (no regression). ──
{
  const empty: Record<string, SkillProgress> = {}
  const articleItems = items.filter((i) => i.kind === 'article')
  const allMC = articleItems.every((i) => presentationForItem(undefined, i, empty).input === 'choice')
  assert(allMC, '4) with no skill history, every unseen article item starts as MC')
  // And a non-article unseen item is unaffected too.
  assert(
    presentationForItem(undefined, get('number:card:5'), empty).input === 'choice',
    '4) unseen non-article item also starts MC (priming scoped out)',
  )
}

// ── Test 5: one correct typed answer — primed beats non-primed; no longer unseen. ──
{
  const skills = { 'article:la': mastered(0.85) }
  const primed0 = createPrimedItemProgress(casa, skills)
  assert(primed0.level === 2 && primed0.primed === true, '5) primed seed is level 2 + primed flag')

  const primed1 = applyAnswer(primed0, 'correct', FAST_MS, NOW)
  const plain1 = applyAnswer(createItemProgress(casa), 'correct', FAST_MS, NOW)

  assert(primed1.level === 2, '5) primed reaches level 2 (typing) after ONE correct')
  assert(plain1.level === 1, '5) a non-primed item is only level 1 after one correct')
  assert(primed1.mastery > plain1.mastery, `5) primed mastery > non-primed (${primed1.mastery.toFixed(3)} > ${plain1.mastery.toFixed(3)})`)
  assert(primed1.primed === false, '5) the prime flag clears once confirmed')
  assert(primed1.seen === 1, '5) the item is now seen → no longer unseen-priority')
  // Concretely: its selection weight loses the unseen newBoost.
  const wSeen = selectionWeight(primed1, casa, NOW)
  const wUnseen = selectionWeight(undefined, casa, NOW)
  assert(wSeen < wUnseen, '5) selection weight drops below the unseen weight (newBoost gone)')
}

// ── Test 6: a missed primed item self-corrects back to the MC ladder. ──
{
  const skills = { 'article:la': mastered(0.9) }
  const primed0 = createPrimedItemProgress(casa, skills)
  const missed = applyAnswer(primed0, 'wrong', FAST_MS, NOW)
  assert(missed.level === 0, '6) a missed primed item drops straight to level 0 (MC)')
  assert(missed.primed === false, '6) the prime flag clears after the disproving miss')
}

// ── Test 7: dataset audit — ambiguous-gender -e nouns are tagged → never primable. ──
{
  const skills = { 'article:il': mastered(0.95), 'article:la': mastered(0.95) }
  const eNouns = ['cane', 'fiore', 'ristorante', 'notte', 'chiave']
  for (const id of eNouns) {
    const sing = get(`article:def:${id}:sing`)
    assert(sing.tags?.includes('exception') === true, `7) -e noun "${id}" is tagged exception`)
    assert(!isPrimable(sing), `7) -e noun "${id}" is NOT primable`)
    assert(primedStartLevel(sing, skills) === 0, `7) -e noun "${id}" never primes to typing`)
  }
}

// ── Test 8: session integration — the wired path actually primes & self-corrects. ──
{
  // A learner who has mastered the `la` rule meets a brand-new regular `la` noun.
  const store = createStore()
  store.skills['article:la'] = mastered(0.85)
  const s = new PracticeSession(items, store)

  // computePresentation (via setAssist) shows the unseen regular `la` noun as TYPING…
  s.current = casa
  s.setAssist(true)
  assert(s.currentMode === 'type', '8) session: unseen mastered-rule regular shows as TYPING')

  // …but an unseen exception with the same rule stays multiple-choice.
  s.current = mano
  s.setAssist(true)
  assert(s.currentMode === 'choice', '8) session: unseen exception stays multiple-choice')

  // record() seeds the primed head start: one correct answer lands the regular noun
  // at level 2 (a non-primed item would only be level 1).
  s.current = casa
  s.submit(casa.answer, NOW)
  assert(store.items[casa.id]?.level === 2, '8) session: one correct answer reaches level 2 (primed)')
  assert(store.items[casa.id]?.seen === 1, '8) session: the primed item is recorded as seen')

  // With the kill-switch off, the same new noun falls back to the MC ladder.
  const store2 = createStore()
  store2.skills['article:la'] = mastered(0.85)
  store2.settings.skillPrimedGraduation = false
  const s2 = new PracticeSession(items, store2)
  s2.current = casa
  s2.setAssist(true)
  assert(s2.currentMode === 'choice', '8) session: kill-switch off → no priming, back to MC')
}

console.log(`\n${pass} pass, ${fail} fail`)
if (fail) process.exitCode = 1

/**
 * engine/scheduler.ts — the session "composer" (the two-level adaptive tutor).
 *
 * PURE and framework-agnostic. Every function returns NEW objects and is
 * deterministic: nothing here calls Date.now() — `now` (epoch ms) is always a
 * parameter, and randomness is injected as the last optional `random` param so a
 * harness can seed it. Lives in `src/` so `npm run check` type-checks it.
 *
 * ── Pedagogical model ──────────────────────────────────────────────────────────
 *   ACQUIRE BLOCKED → RETAIN INTERLEAVED + SPACED.
 *
 * The caller lane-filters a `pool` and asks `composeRound` for an ordered queue.
 * The composer:
 *   1. groups the pool into TOPICS and measures each topic's state (new/learning/
 *      reviewing/mastered, plus a "struggle" signal and a curriculum lock gate);
 *   2. picks ONE focus topic by priority — remediation > acquisition > new > review;
 *   3. builds a short *consecutive* mini-lesson block for that topic at the FRONT
 *      of the round (the acquisition burst — e.g. all six persons of a verb, or a
 *      number family in ascending order);
 *   4. fills the REST of the round with interleaved spaced review (due items first),
 *      a little brand-new material, and a weak-weighted fallback draw — so a round
 *      is NEVER all-blocked. Interleaving is forced even while a mini-lesson runs.
 *
 * Remediation is FOCUS, not weight: a repeatedly-missed topic earns a focused burst
 * rather than merely a higher lottery weight. A cognitive-load (WIP) gate stops the
 * composer from flooding the learner with new items while too many are still weak.
 */

import type { Item, ItemProgress, ProgressStore } from '../types'
import { PERSONS } from '../types'
import { selectionWeight } from './mastery'
import { isDue, overdueMs } from './srs'

/* ── Exported types ─────────────────────────────────────────────────────────── */

export type TopicState = 'locked' | 'new' | 'learning' | 'reviewing' | 'mastered'

export interface TopicInfo {
  topic: string
  state: TopicState
  /** Items in this topic within the pool. */
  total: number
  /** Items with progress.seen > 0. */
  seen: number
  /** Items at level >= 2 (production / typing reached). */
  typed: number
  /** Mean mastery (an unseen item counts as 0.2). */
  avgMastery: number
  /** Active-unmastered: seen>0 && mastery < WIP_MASTERY (0.7). */
  weak: number
  /** Items where isDue() is true. */
  due: number
  /** Strongest current-struggle signal across the topic's items (see below). */
  struggle: number
}

export interface RoundPlan {
  /** The ordered round queue (length up to `size`). */
  items: Item[]
  focusTopic: string | null
  focusState: TopicState | null
  reason: 'remediation' | 'acquisition' | 'new' | 'review'
  /** The consecutive mini-lesson block at the FRONT of `items`. */
  miniLessonIds: string[]
  /**
   * When the focus topic is being acquired across SEVERAL consecutive mini-lessons
   * (more cases than one block holds), the 1-based index of this lesson and the total
   * count — for a "parte N de M" readout. Both 0 when the topic fits in one lesson or
   * the round isn't an acquisition/new burst. The divisor is a fixed nominal (MAX_BLOCK)
   * so M stays stable across the topic's lessons even as the last block runs short.
   */
  miniLessonPart: number
  miniLessonParts: number
}

/* ── Exported constants (tunable, documented) ───────────────────────────────── */

/** Max active-unmastered items before new intros pause (cognitive-load cap). */
export const WIP_LIMIT = 12
/** "Unmastered" threshold for the WIP gate / weak count. */
export const WIP_MASTERY = 0.7
/** Mastery needed (with production) to call a topic mastered. */
export const MASTERED_MASTERY = 0.85
/**
 * Hard ceiling on the mini-lesson block. Sized to hold the largest coherent
 * acquisition unit we want to teach in one consecutive burst — a verb's six persons
 * (plus a couple of its variant items) or a single number band — without dumping a
 * whole drill pool (e.g. all 30 ordinals) at once. Big "bag" topics exceed this and
 * are acquired across several consecutive focused rounds.
 */
export const MAX_BLOCK = 8
/** Floor on the mini-lesson block. */
export const MIN_BLOCK = 3

/** Mastery an unseen item is credited with in topic averages (mirrors mastery.ts). */
const UNSEEN_MASTERY = 0.2
/** A topic is "learned" (gating signal) at this seen-fraction … */
const LEARNED_SEEN_FRACTION = 0.5
/** … and this avgMastery. */
const LEARNED_AVG_MASTERY = 0.4
/** Fraction of items that must be in production for a topic to be "reviewing". */
const REVIEWING_TYPED_FRACTION = 0.6
/** Fraction of items in production required (with mastery) to be "mastered". */
const MASTERED_TYPED_FRACTION = 0.8
/** Exam-survival carve-out: locked-topic items at/above this examWeight stay reachable. */
const EXAM_SURVIVAL_WEIGHT = 2

/* ── Helpers ────────────────────────────────────────────────────────────────── */

const MS_PER_DAY = 86_400_000

/** Clamp `v` to [lo, hi]. */
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/**
 * Whole days from `now` to `examDate` (ISO yyyy-mm-dd), clamped at 0 if the date is
 * past, or null when `examDate` is null. The UI reuses this for the exam-ramp readout.
 */
export function daysUntil(examDate: string | null, now: number): number | null {
  if (examDate === null) return null
  const target = Date.parse(`${examDate}T00:00:00Z`)
  if (Number.isNaN(target)) return null
  const diff = target - now
  if (diff <= 0) return 0
  return Math.floor(diff / MS_PER_DAY)
}

/** Pull the `person:<p>` skill off a verb item, or null if absent. */
function personOf(item: Item): (typeof PERSONS)[number] | null {
  for (const skill of item.skills) {
    if (skill.startsWith('person:')) {
      const p = skill.slice('person:'.length)
      const idx = (PERSONS as readonly string[]).indexOf(p)
      if (idx >= 0) return PERSONS[idx]
    }
  }
  return null
}

/** The per-item current-struggle signal (0 if unseen). See topicInfos doc. */
function struggleOf(p: ItemProgress | undefined): number {
  if (!p) return 0
  const lapseSignal = p.lastResult !== null && p.lastResult !== 'correct' && p.lastResult !== 'near'
  const lapseBonus = lapseSignal && p.mastery < 0.4 ? 2 : 0
  return p.consecutiveMisses * 2 + Math.min(p.recentLapses, 4) + lapseBonus
}

/* ── Topic aggregation ──────────────────────────────────────────────────────── */

/**
 * Group `pool` items by `item.topic` and compute the per-topic aggregates and
 * state. State is resolved in two passes: first the numeric aggregates for every
 * topic, then the curriculum lock gate (which depends on whether the prerequisite
 * number bands are "learned"), then the remaining states.
 *
 * `struggle` for a topic is the MAX over its items of:
 *   consecutiveMisses·2 + min(recentLapses, 4) + (lastResult is a lapse && mastery<0.4 ? 2 : 0).
 *
 * State, checked in THIS order:
 *   1. locked     — only the number bands `num:compound:*` / `num:hundreds`, locked until
 *                   BOTH `num:ones` AND `num:tens` are "learned" (seen-fraction ≥ 0.5
 *                   AND avgMastery ≥ 0.4). No other topic ever locks.
 *   2. new        — not locked AND seen === 0.
 *   3. mastered   — typed/total ≥ 0.8 AND avgMastery ≥ MASTERED_MASTERY.
 *   4. reviewing  — not mastered AND typed/total ≥ 0.6.
 *   5. learning   — otherwise (started, not yet mostly in production).
 */
export function topicInfos(
  pool: Item[],
  store: ProgressStore,
  now: number,
): Map<string, TopicInfo> {
  // Group items by topic.
  const groups = new Map<string, Item[]>()
  for (const item of pool) {
    const arr = groups.get(item.topic)
    if (arr) arr.push(item)
    else groups.set(item.topic, [item])
  }

  // ── Pass 1: numeric aggregates (state filled in pass 2). ──
  const infos = new Map<string, TopicInfo>()
  for (const [topic, items] of groups) {
    let seen = 0
    let typed = 0
    let weak = 0
    let due = 0
    let masterySum = 0
    let struggle = 0
    for (const item of items) {
      const p = store.items[item.id]
      const mastery = p && p.seen > 0 ? p.mastery : UNSEEN_MASTERY
      masterySum += mastery
      if (p && p.seen > 0) {
        seen += 1
        if (p.level >= 2) typed += 1
        if (p.mastery < WIP_MASTERY) weak += 1
      }
      if (isDue(p, now)) due += 1
      const s = struggleOf(p)
      if (s > struggle) struggle = s
    }
    infos.set(topic, {
      topic,
      state: 'learning', // provisional; finalized in pass 2
      total: items.length,
      seen,
      typed,
      avgMastery: items.length ? masterySum / items.length : 0,
      weak,
      due,
      struggle,
    })
  }

  // ── Lock gate: num:compound:* / num:hundreds depend on num:ones AND num:tens. ──
  const isLearned = (topic: string): boolean => {
    const info = infos.get(topic)
    if (!info || info.total === 0) return false
    return info.seen / info.total >= LEARNED_SEEN_FRACTION && info.avgMastery >= LEARNED_AVG_MASTERY
  }
  const prereqsMet = isLearned('num:ones') && isLearned('num:tens')
  // Compounds (any elision/plain band) and round hundreds depend on ones + tens.
  const isLockable = (topic: string): boolean =>
    topic === 'num:hundreds' || topic.startsWith('num:compound')

  // ── Pass 2: resolve state per topic. ──
  for (const info of infos.values()) {
    if (isLockable(info.topic) && !prereqsMet) {
      info.state = 'locked'
      continue
    }
    if (info.seen === 0) {
      info.state = 'new'
      continue
    }
    const typedFraction = info.total ? info.typed / info.total : 0
    if (typedFraction >= MASTERED_TYPED_FRACTION && info.avgMastery >= MASTERED_MASTERY) {
      info.state = 'mastered'
    } else if (typedFraction >= REVIEWING_TYPED_FRACTION) {
      info.state = 'reviewing'
    } else {
      info.state = 'learning'
    }
  }

  return infos
}

/** The set of currently-locked topics, derived from a topicInfos map. */
function lockedTopics(infos: Map<string, TopicInfo>): Set<string> {
  const locked = new Set<string>()
  for (const info of infos.values()) {
    if (info.state === 'locked') locked.add(info.topic)
  }
  return locked
}

/* ── Block ordering ─────────────────────────────────────────────────────────── */

/**
 * Pedagogical sort of a focus topic's candidate items, in place on a copy:
 *   - verb:*    → by PERSON in PERSONS order (io,tu,lui,noi,voi,loro) — drill all
 *                 six persons consecutively (the acquisition pattern).
 *   - num:*     → by prompt.figure ascending — learn number families in sequence
 *                 so elisions/accents are acquired as a progression.
 *   - article:* → keep stable generation order — groups a noun's sing/plur/indef.
 *   - else      → unseen first, then by mastery ascending (weakest first).
 *
 * Order is STABLE: ties preserve the candidates' incoming order.
 */
function orderBlock(topic: string, candidates: Item[], store: ProgressStore): Item[] {
  const withIndex = candidates.map((item, i) => ({ item, i }))

  if (topic.startsWith('verb:')) {
    withIndex.sort((a, b) => {
      const pa = personOf(a.item)
      const pb = personOf(b.item)
      const ra = pa ? PERSONS.indexOf(pa) : PERSONS.length
      const rb = pb ? PERSONS.indexOf(pb) : PERSONS.length
      return ra - rb || a.i - b.i
    })
  } else if (topic.startsWith('num:')) {
    withIndex.sort((a, b) => {
      const fa = a.item.prompt.figure ?? Number.POSITIVE_INFINITY
      const fb = b.item.prompt.figure ?? Number.POSITIVE_INFINITY
      return fa - fb || a.i - b.i
    })
  } else if (topic.startsWith('article:')) {
    // Stable generation order — no reorder.
  } else {
    withIndex.sort((a, b) => {
      const pa = store.items[a.item.id]
      const pb = store.items[b.item.id]
      const seenA = pa && pa.seen > 0 ? 1 : 0
      const seenB = pb && pb.seen > 0 ? 1 : 0
      if (seenA !== seenB) return seenA - seenB // unseen (0) first
      const ma = pa && pa.seen > 0 ? pa.mastery : UNSEEN_MASTERY
      const mb = pb && pb.seen > 0 ? pb.mastery : UNSEEN_MASTERY
      return ma - mb || a.i - b.i // weakest first
    })
  }

  return withIndex.map((x) => x.item)
}

/** Ordered list of items for a topic that are unseen OR weak (seen>0 && mastery<WIP_MASTERY). */
function unseenOrWeak(topic: string, pool: Item[], store: ProgressStore): Item[] {
  const out: Item[] = []
  for (const item of pool) {
    if (item.topic !== topic) continue
    const p = store.items[item.id]
    if (!p || p.seen === 0 || p.mastery < WIP_MASTERY) out.push(item)
  }
  return out
}

/* ── Focus selection ────────────────────────────────────────────────────────── */

/**
 * Order "new" topics for introduction: max examWeight in topic DESC, then min unit
 * ASC, then topic string ASC. Returns topic strings.
 */
function newTopicOrder(infos: Map<string, TopicInfo>, byTopic: Map<string, Item[]>): string[] {
  const news: string[] = []
  for (const info of infos.values()) {
    if (info.state === 'new') news.push(info.topic)
  }
  const maxExam = (topic: string): number => {
    let m = 0
    for (const item of byTopic.get(topic) ?? []) if (item.examWeight > m) m = item.examWeight
    return m
  }
  const minUnit = (topic: string): number => {
    let m = Number.POSITIVE_INFINITY
    for (const item of byTopic.get(topic) ?? []) if (item.unit < m) m = item.unit
    return m
  }
  news.sort((a, b) => maxExam(b) - maxExam(a) || minUnit(a) - minUnit(b) || (a < b ? -1 : a > b ? 1 : 0))
  return news
}

/* ── The composer ───────────────────────────────────────────────────────────── */

/**
 * Compose one ordered round from an already-lane-filtered `pool`. See the file
 * header and the per-step comments for the full algorithm. Returns a RoundPlan.
 */
export function composeRound(
  pool: Item[],
  store: ProgressStore,
  now: number,
  size: number,
  random: () => number = Math.random,
): RoundPlan {
  // Edge case: empty pool.
  if (pool.length === 0 || size <= 0) {
    return {
      items: [],
      focusTopic: null,
      focusState: null,
      reason: 'review',
      miniLessonIds: [],
      miniLessonPart: 0,
      miniLessonParts: 0,
    }
  }

  // 1. Topic aggregates + lock set.
  const infos = topicInfos(pool, store, now)
  const locked = lockedTopics(infos)

  // 2. Available pool = pool minus locked-topic items, EXCEPT keep locked-topic
  //    items with examWeight >= 2 (exam-survival carve-out).
  const available = pool.filter(
    (item) => !locked.has(item.topic) || item.examWeight >= EXAM_SURVIVAL_WEIGHT,
  )

  // By-topic index over the (full) pool — used for new-topic ordering / block sizing.
  const byTopic = new Map<string, Item[]>()
  for (const item of pool) {
    const arr = byTopic.get(item.topic)
    if (arr) arr.push(item)
    else byTopic.set(item.topic, [item])
  }

  // 3. examDate ramp.
  const daysLeft = daysUntil(store.settings.examDate, now)
  let focusFraction: number
  if (daysLeft === null || daysLeft >= 7) {
    focusFraction = 0.5
  } else {
    focusFraction = 0.25 + 0.25 * clamp(daysLeft / 7, 0, 1)
  }
  let allowNew = daysLeft === null || daysLeft > 2

  // 4. WIP / cognitive-load gate.
  let activeUnmastered = 0
  for (const item of pool) {
    const p = store.items[item.id]
    if (p && p.seen > 0 && p.mastery < WIP_MASTERY) activeUnmastered += 1
  }
  if (activeUnmastered >= WIP_LIMIT) allowNew = false

  // 5. Choose focus topic (first match wins). Focus topics are drawn from AVAILABLE
  //    topics (a locked topic is never a focus, even with the carve-out).
  const availableTopics = new Set(available.map((i) => i.topic))
  const focusable = (topic: string): boolean => availableTopics.has(topic) && !locked.has(topic)

  let focusTopic: string | null = null
  let reason: RoundPlan['reason'] = 'review'

  // 5a. remediation — started topics (learning/reviewing) with struggle > 0.
  {
    let best: TopicInfo | null = null
    for (const info of infos.values()) {
      if (!focusable(info.topic)) continue
      if (info.state !== 'learning' && info.state !== 'reviewing') continue
      if (info.struggle <= 0) continue
      if (
        best === null ||
        info.struggle > best.struggle ||
        (info.struggle === best.struggle && info.avgMastery < best.avgMastery)
      ) {
        best = info
      }
    }
    if (best) {
      focusTopic = best.topic
      reason = 'remediation'
    }
  }

  // 5b. acquisition — a learning topic with the most unseen-or-weak items.
  if (focusTopic === null) {
    let best: TopicInfo | null = null
    let bestCount = -1
    for (const info of infos.values()) {
      if (!focusable(info.topic)) continue
      if (info.state !== 'learning') continue
      const count = unseenOrWeak(info.topic, available, store).length
      if (count <= 0) continue
      if (
        best === null ||
        count > bestCount ||
        (count === bestCount && info.avgMastery < best.avgMastery)
      ) {
        best = info
        bestCount = count
      }
    }
    if (best) {
      focusTopic = best.topic
      reason = 'acquisition'
    }
  }

  // 5c. new — the next unlocked "new" topic (if allowed).
  if (focusTopic === null && allowNew) {
    const order = newTopicOrder(infos, byTopic).filter(focusable)
    if (order.length > 0) {
      focusTopic = order[0]
      reason = 'new'
    }
  }

  // 5d. review — all interleaved review + weak fallback.
  if (focusTopic === null) {
    reason = 'review'
  }

  // 6. Mini-lesson block (consecutive; empty when reason === 'review').
  let block: Item[] = []
  if (focusTopic !== null) {
    let candidates = unseenOrWeak(focusTopic, available, store)
    // For remediation, put the struggling items FIRST (then the rest of the topic order).
    if (reason === 'remediation') {
      const struggling: Item[] = []
      const rest: Item[] = []
      for (const item of candidates) {
        const p = store.items[item.id]
        if (p && (p.consecutiveMisses > 0 || p.recentLapses >= 2)) struggling.push(item)
        else rest.push(item)
      }
      candidates = [...orderBlock(focusTopic, struggling, store), ...orderBlock(focusTopic, rest, store)]
    } else {
      candidates = orderBlock(focusTopic, candidates, store)
    }
    // Coverage-aware block sizing. Far from the exam the ceiling is MAX_BLOCK, so the
    // block can cover a whole coherent paradigm (a verb's persons, a number band) instead
    // of a flat 6; as the exam nears, focusFraction (∈ [0.25, 0.5]) shrinks the ceiling
    // toward MIN_BLOCK so rounds tilt to spaced review. The block then covers as many
    // distinct cases as the topic actually offers — so a small topic finishes in one
    // lesson and a paradigm larger than 6 isn't truncated, while an oversized "bag" topic
    // (ordinals, regular articles) is capped here and continues next focused round.
    const examCeiling = clamp(Math.round(MAX_BLOCK * (focusFraction / 0.5)), MIN_BLOCK, MAX_BLOCK)
    const blockSize = clamp(candidates.length, MIN_BLOCK, examCeiling)
    block = candidates.slice(0, blockSize)
  }
  const blockIds = new Set(block.map((i) => i.id))

  // 7. Due-review bucket: available items NOT in the block where isDue, most-overdue-first.
  const dueReview = available
    .filter((item) => !blockIds.has(item.id) && isDue(store.items[item.id], now))
    .sort((a, b) => overdueMs(store.items[b.id], now) - overdueMs(store.items[a.id], now))

  // 8. A little new: 1–2 items from the next new topic when allowed and not already a 'new' round.
  let littleNew: Item[] = []
  if (allowNew && reason !== 'new') {
    const order = newTopicOrder(infos, byTopic).filter(
      (t) => focusable(t) && t !== focusTopic,
    )
    if (order.length > 0) {
      const nextNew = order[0]
      const items = orderBlock(nextNew, unseenOrWeak(nextNew, available, store), store)
      littleNew = items.slice(0, 2).filter((i) => !blockIds.has(i.id))
    }
  }

  // 9. Compose, ordered: block (front, contiguous), then de-duplicated fill —
  //    due-review, then little-new, then a weak-weighted fallback draw.
  const chosen: Item[] = [...block]
  const used = new Set(blockIds)
  const remaining = size - chosen.length

  const appendUnique = (items: Item[], limit: number): number => {
    let added = 0
    for (const item of items) {
      if (added >= limit) break
      if (used.has(item.id)) continue
      chosen.push(item)
      used.add(item.id)
      added += 1
    }
    return added
  }

  if (remaining > 0) {
    let slots = remaining
    slots -= appendUnique(dueReview, slots)
    if (slots > 0) slots -= appendUnique(littleNew, slots)

    // Weak-weighted fallback: weighted draw WITHOUT replacement over the rest of `available`.
    if (slots > 0) {
      const candidates = available.filter((item) => !used.has(item.id))
      const weighted = candidates.map((item) => ({
        item,
        w: Math.max(1e-6, selectionWeight(store.items[item.id], item, now)),
      }))
      while (slots > 0 && weighted.length > 0) {
        let total = 0
        for (const x of weighted) total += x.w
        let cursor = random() * total
        let idx = weighted.length - 1
        for (let i = 0; i < weighted.length; i += 1) {
          cursor -= weighted[i].w
          if (cursor <= 0) {
            idx = i
            break
          }
        }
        const picked = weighted.splice(idx, 1)[0]
        chosen.push(picked.item)
        used.add(picked.item.id)
        slots -= 1
      }
    }
  }

  const items = chosen.slice(0, size)

  // Multi-lesson progress: when an acquisition/new focus topic has more cases than one
  // block (nominal MAX_BLOCK) holds, report "parte N de M" so marching through a big topic
  // (ordinals -esimo, the regular-article genders) feels like progress, not truncation.
  let miniLessonPart = 0
  let miniLessonParts = 0
  if (focusTopic !== null && (reason === 'acquisition' || reason === 'new')) {
    const info = infos.get(focusTopic)!
    const parts = Math.ceil(info.total / MAX_BLOCK)
    if (parts > 1) {
      miniLessonParts = parts
      miniLessonPart = clamp(Math.floor(info.seen / MAX_BLOCK) + 1, 1, parts)
    }
  }

  return {
    items,
    focusTopic,
    focusState: focusTopic ? infos.get(focusTopic)!.state : null,
    reason,
    miniLessonIds: block.map((i) => i.id),
    miniLessonPart,
    miniLessonParts,
  }
}

/**
 * engine/select.ts — item selection policy.
 *
 * Generalizes the legacy weighted-random + recent-miss requeue (app.js) onto the
 * generic Item/ItemProgress model. Pure & deterministic given an injected `random`.
 * Mastery-driven weighting lives in engine/mastery.ts (selectionWeight); this module
 * adds lane filtering, the "missed items come back soon" queue, and the draw.
 */
import type { Item, ItemProgress, PracticeMode } from '../types'
import { selectionWeight } from './mastery'

/** A miss scheduled to resurface; `due` is measured in session-answered count (like legacy). */
export interface RecentMiss {
  id: string
  due: number
}

const RECENT_MISS_LIMIT = 12
const RECENT_MISS_CHANCE = 0.45

/** Filter the full item list down to the active lane for a practice mode. */
export function poolForMode(items: Item[], mode: PracticeMode): Item[] {
  switch (mode) {
    case 'verbs':
      return items.filter(
        (i) => i.kind === 'verb-conjugation' || i.kind === 'essere-avere' || i.kind === 'verb-choice',
      )
    case 'articles':
      return items.filter((i) => i.kind === 'article')
    case 'numbers':
      return items.filter((i) => i.kind === 'number')
    case 'vocab':
      return items.filter((i) => i.kind === 'vocab' || i.kind === 'pronoun')
    case 'time':
      return items.filter((i) => i.kind === 'tell-time')
    case 'functional':
      return items.filter((i) => i.kind === 'functional-choice')
    case 'exam-drill':
      // Phase 1A: a simple exam-weighted lane (the proportional composer lands in 1B).
      return items.filter((i) => i.examWeight >= 2 && i.kind !== 'agreement')
    case 'mixed':
    default:
      // Agreement (Ex2 multi-blank) has no renderer until Phase 1B — keep it out of practice.
      return items.filter((i) => i.kind !== 'agreement')
  }
}

/** Push `id` onto the recent-miss queue, due a couple of items from now. Returns a new array. */
export function scheduleRecentMiss(
  queue: RecentMiss[],
  id: string,
  answered: number,
  random: () => number = Math.random,
): RecentMiss[] {
  const filtered = queue.filter((m) => m.id !== id)
  filtered.unshift({ id, due: answered + 2 + Math.floor(random() * 3) })
  return filtered.slice(0, RECENT_MISS_LIMIT)
}

/**
 * With ~RECENT_MISS_CHANCE probability, pick a due recent-miss whose id is in
 * `poolIds`, isn't the item just shown (`lastId`), and is due (`due <= answered`).
 * Returns the picked id plus the queue with it removed, or null (no override this draw).
 *
 * Extracted so both chooseNext (the weighted fallback) and the session composer can
 * apply the SAME within-round "missed items come back soon" rule before serving.
 */
export function pickRecentMiss(
  recentMisses: RecentMiss[],
  poolIds: Set<string>,
  answered: number,
  lastId: string | null,
  random: () => number = Math.random,
): { id: string; recentMisses: RecentMiss[] } | null {
  if (recentMisses.length === 0) return null
  if (random() > RECENT_MISS_CHANCE) return null
  const idx = recentMisses.findIndex((m) => m.due <= answered && m.id !== lastId && poolIds.has(m.id))
  if (idx < 0) return null
  const picked = recentMisses[idx]
  return { id: picked.id, recentMisses: recentMisses.filter((_, i) => i !== idx) }
}

export interface ChooseOptions {
  pool: Item[]
  progress: Record<string, ItemProgress>
  recentMisses: RecentMiss[]
  answered: number
  lastId: string | null
  now: number
  random?: () => number
}

/**
 * Pick the next item. With ~45% chance, resurface a due recent-miss (not the item
 * just shown); otherwise draw weighted-random by mastery/exam/recency. Returns the
 * chosen item plus the (possibly mutated) recent-miss queue.
 */
export function chooseNext(opts: ChooseOptions): { item: Item | null; recentMisses: RecentMiss[] } {
  const { pool, progress, answered, lastId, now } = opts
  const random = opts.random ?? Math.random
  let recentMisses = opts.recentMisses

  if (pool.length === 0) return { item: null, recentMisses }

  // 1) Recent-miss requeue (shared rule — see pickRecentMiss).
  const miss = pickRecentMiss(recentMisses, new Set(pool.map((i) => i.id)), answered, lastId, random)
  if (miss) {
    recentMisses = miss.recentMisses
    const item = pool.find((i) => i.id === miss.id) ?? null
    if (item) return { item, recentMisses }
  }

  // 2) Weighted-random draw
  const weighted = pool.map((item) => ({ item, w: selectionWeight(progress[item.id], item, now) }))
  const total = weighted.reduce((s, x) => s + x.w, 0)
  const draw = (): Item => {
    let cursor = random() * total
    for (const x of weighted) {
      cursor -= x.w
      if (cursor <= 0) return x.item
    }
    return weighted[weighted.length - 1].item
  }
  let chosen = draw()
  // One resample to avoid an immediate back-to-back repeat when the pool allows it.
  if (chosen.id === lastId && pool.length > 1) chosen = draw()
  return { item: chosen, recentMisses }
}

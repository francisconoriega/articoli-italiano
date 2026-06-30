/**
 * engine/metrics.ts — persistent, truthful study metrics for the header.
 *
 * The session-scoped counters (precisión/racha/aciertos) reset to 0 on every page
 * load, so they greet a seasoned learner with "0%". These derive the durable truth
 * from the store + pool at a given `now`: what's due, what's mastered, days to exam.
 * Pure and framework-agnostic — recompute it whenever the store changes.
 */
import type { Item, ProgressStore } from '../types'
import { isDue } from './srs'
import { daysUntil, MASTERED_MASTERY } from './scheduler'

export interface StudyMetrics {
  /** Items whose spaced-repetition due time has passed (ready to review now). */
  dueCount: number
  /** Items at or above the mastery threshold (MASTERED_MASTERY). */
  masteredItems: number
  /** Seen items still below the mastery threshold. */
  learningItems: number
  /** Never-seen items in the pool. */
  newItems: number
  /** Items seen at least once. */
  seenItems: number
  /** Total items in the active pool. */
  poolSize: number
  /** Whole days until the exam, or null if no exam date is set. */
  daysLeft: number | null
}

export function studyMetrics(items: Item[], store: ProgressStore, now: number): StudyMetrics {
  let dueCount = 0
  let masteredItems = 0
  let learningItems = 0
  let newItems = 0
  let seenItems = 0

  for (const item of items) {
    const p = store.items[item.id]
    if (!p || p.seen === 0) {
      newItems++
      continue
    }
    seenItems++
    if (isDue(p, now)) dueCount++
    if (p.mastery >= MASTERED_MASTERY) masteredItems++
    else learningItems++
  }

  return {
    dueCount,
    masteredItems,
    learningItems,
    newItems,
    seenItems,
    poolSize: items.length,
    daysLeft: daysUntil(store.settings.examDate, now),
  }
}

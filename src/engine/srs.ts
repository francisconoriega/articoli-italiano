/**
 * engine/srs.ts — compressed spaced-repetition ladder for exam-week study.
 *
 * `ItemProgress.stability` is treated as a STEP INDEX into STABILITY_LADDER_MS:
 * each success advances one step (longer interval); a lapse drops back two steps
 * and resurfaces the item almost immediately (RELAPSE_MS). `due` is the epoch-ms
 * timestamp at which the item should next be reviewed. Pure: callers pass `now`.
 */
import type { ItemProgress } from '../types'

const MIN = 60_000
const HOUR = 3_600_000

/** Expanding review intervals (ms), indexed by the stability step. Compressed for cram week. */
export const STABILITY_LADDER_MS: readonly number[] = [
  3 * MIN,    // step 0 → 3m
  8 * MIN,    // step 1 → 8m
  25 * MIN,   // step 2 → 25m
  90 * MIN,   // step 3 → 90m
  6 * HOUR,   // step 4 → 6h
  24 * HOUR,  // step 5 → 24h
  72 * HOUR,  // step 6 → 72h
]

/** After a lapse, resurface very soon. */
export const RELAPSE_MS = 90_000 // ~1.5m

/** Clamp any (possibly legacy float) stability to a valid integer step index. */
function clampStep(step: number): number {
  const s = Math.round(step)
  if (s < 0) return 0
  if (s > STABILITY_LADDER_MS.length - 1) return STABILITY_LADDER_MS.length - 1
  return s
}

/** Next stability step: +1 (capped) on success, −2 (floored at 0) on a lapse. */
export function nextStabilityStep(prevStability: number, success: boolean): number {
  const step = clampStep(prevStability)
  return success ? clampStep(step + 1) : Math.max(0, step - 2)
}

/** The epoch-ms time an item at `step` becomes due, measured from `now`. */
export function dueFromStep(step: number, now: number): number {
  return now + STABILITY_LADDER_MS[clampStep(step)]
}

/**
 * True when an item has been seen and its review time has arrived (now >= due).
 * Unseen items (no progress, seen === 0, or due === null) are NOT "due" — they are
 * handled by the scheduler's "new" bucket, not the review bucket.
 */
export function isDue(progress: ItemProgress | undefined, now: number): boolean {
  if (!progress || progress.seen === 0 || progress.due === null) return false
  return now >= progress.due
}

/**
 * How overdue an item is, in ms (now − due). Returns -Infinity for items that are
 * not eligible for review (unseen / no due). Use to sort most-overdue-first.
 */
export function overdueMs(progress: ItemProgress | undefined, now: number): number {
  if (!progress || progress.seen === 0 || progress.due === null) return -Infinity
  return now - progress.due
}

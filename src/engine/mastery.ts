/**
 * mastery.ts — per-item mastery updates, skill rollups, and selection weighting.
 *
 * PURE and framework-agnostic. Every update function returns a NEW object and is
 * deterministic: nothing here calls Date.now(). When a timestamp is needed it is
 * passed in as `now` (epoch ms) so callers stay in control of the clock and the
 * functions remain trivially testable.
 *
 * The learning model (Phase 1A) is a lightweight blend of three ideas:
 *
 *   1. MASTERY is a 0–1 confidence that grows multiplicatively toward 1 on every
 *      success (`mastery += rate·(1 − mastery)`) and is knocked down on every
 *      lapse. Diminishing returns are built in: the closer mastery is to 1, the
 *      smaller each correct answer moves it.
 *
 *   2. SPEED feeds confidence. A fast clean answer is stronger evidence of recall
 *      than a slow one, so the learning `rate` scales with the (post-update)
 *      response-time EMA. A 'near' miss (right word, missing accent) counts as a
 *      success but learns a little less than a clean 'correct'.
 *
 *   3. A lapse hurts MORE, in absolute terms, the more confident we were — a wrong
 *      answer on a "known" item drops mastery sharply (you clearly didn't know it
 *      as well as the number claimed), while a wrong answer on a barely-seen item
 *      barely moves an already-low number. Mastery never falls below a small floor
 *      so nothing is ever marked "hopeless".
 *
 * `difficulty`, `streak`, `recentLapses`, `lastResult`, `lastSeen`,
 * `averageResponseMs`, and the seen/correct/wrong counters are all fully driven
 * here. `stability` is a step index into the SRS ladder (see engine/srs.ts) and
 * `due` is the real epoch-ms next-review timestamp, computed from that step.
 */

import type { Item, ItemProgress, SkillProgress, AnswerResult } from '../types';
import { nextStabilityStep, dueFromStep, RELAPSE_MS } from './srs';

/* ── Tunable constants ────────────────────────────────────────────────────────
 * Grouped so the model is easy to read and to re-tune in one place. Rationale for
 * each value lives in the doc comment of the function that consumes it.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Confidence a fresh, never-seen item starts at. Exported so engine/priming.ts
 *  (skill-primed graduation) can anchor a primed item's starting mastery to it. */
export const INITIAL_MASTERY = 0.2;
/** Default difficulty; bumped for items flagged hard at creation time. */
const DEFAULT_DIFFICULTY = 0.8;
const HARD_DIFFICULTY = 1.3;
const MIN_DIFFICULTY = 0.5;
const MAX_DIFFICULTY = 2.0;

/** Item skills / tags that mark an item as intrinsically harder up front.
 *  Exported so engine/priming.ts can refuse to prime intrinsically-hard items. */
export const HARD_SKILLS: readonly string[] = ['class:irregular', 'class:modal', 'class:isc'];
export const HARD_TAG = 'exception';

/** Mastery is capped just below 1 (perfection is never asserted) … */
const MASTERY_CEILING = 0.99;
/** … and floored just above 0 (nothing is ever "hopeless"). */
const MASTERY_FLOOR = 0.05;

/** EMA weights for the response-time average (new sample gets 30%). */
const RESPONSE_EMA_PRIOR = 0.7;
const RESPONSE_EMA_NEW = 0.3;

/** A 'near' miss earns 85% of a clean correct's learning rate / skill gain. */
const NEAR_FACTOR = 0.85;

/* ── Result classification ─────────────────────────────────────────────────── */

/**
 * 'correct' and 'near' both count as SUCCESS (a 'near' is the right word missing
 * only an accent). 'wrong', 'timeout', and 'dontKnow' are all LAPSES.
 */
function isSuccess(result: AnswerResult): boolean {
  return result === 'correct' || result === 'near';
}

/* ── Item progress lifecycle ───────────────────────────────────────────────── */

/**
 * Build the initial progress record for an item the learner has never answered.
 * Counters start at zero, mastery at {@link INITIAL_MASTERY}. Difficulty starts
 * at {@link DEFAULT_DIFFICULTY}, raised to {@link HARD_DIFFICULTY} when the item
 * is flagged as intrinsically hard — irregular / modal / -isc verbs (by skill) or
 * anything tagged "exception". `skillIds` is a snapshot of the item's skills so
 * the skill rollup can run later without the catalog.
 */
export function createItemProgress(item: Item): ItemProgress {
  const isHard =
    item.skills.some((skill) => HARD_SKILLS.includes(skill)) ||
    (item.tags?.includes(HARD_TAG) ?? false);

  return {
    seen: 0,
    correct: 0,
    wrong: 0,
    mastery: INITIAL_MASTERY,
    difficulty: isHard ? HARD_DIFFICULTY : DEFAULT_DIFFICULTY,
    stability: 0,
    streak: 0,
    recentLapses: 0,
    level: 0,
    consecutiveMisses: 0,
    lastResult: null,
    lastSeen: null,
    due: null,
    averageResponseMs: null,
    skillIds: item.skills.slice(),
  };
}

/** Promote one level (capped at 2). */
const MAX_LEVEL = 2;
/** Consecutive misses on one item that trigger a single-level demotion. */
const DEMOTE_AFTER = 2;

/**
 * Pick the base learning rate from the (post-update) response-time average: the
 * faster the recall, the more a correct answer teaches. Thresholds:
 *   < 3000 ms → 0.42  (fast, confident recall)
 *   < 6000 ms → 0.34
 *   otherwise → 0.26  (slow / hesitant, or no timing yet)
 * A null average (shouldn't happen post-update, but guarded) is treated as slow.
 */
function successRate(averageResponseMs: number | null): number {
  if (averageResponseMs !== null && averageResponseMs < 3000) return 0.42;
  if (averageResponseMs !== null && averageResponseMs < 6000) return 0.34;
  return 0.26;
}

/**
 * Apply one answer to an item's progress and return a NEW {@link ItemProgress}
 * (the input is never mutated). `responseMs` is how long the learner took to
 * answer; `now` is the epoch-ms timestamp of the answer.
 *
 * Common to every result: bump `seen`, stamp `lastSeen`/`lastResult`, and fold
 * the new response time into the EMA (`averageResponseMs`). Then SUCCESS and
 * LAPSE branch — see the model overview at the top of the file.
 */
export function applyAnswer(
  progress: ItemProgress,
  result: AnswerResult,
  responseMs: number,
  now: number,
): ItemProgress {
  // Response-time EMA — first sample seeds the average outright.
  const averageResponseMs =
    progress.averageResponseMs === null
      ? responseMs
      : Math.round(progress.averageResponseMs * RESPONSE_EMA_PRIOR + responseMs * RESPONSE_EMA_NEW);

  const next: ItemProgress = {
    ...progress,
    seen: progress.seen + 1,
    lastSeen: now,
    lastResult: result,
    averageResponseMs,
    // skillIds is carried over unchanged (denormalized item snapshot).
    skillIds: progress.skillIds,
  };

  if (isSuccess(result)) {
    // ── SUCCESS ───────────────────────────────────────────────────────────────
    const baseRate = successRate(averageResponseMs);
    // A 'near' (accent miss) learns slightly less than a clean correct.
    const rate = result === 'near' ? baseRate * NEAR_FACTOR : baseRate;

    next.correct = progress.correct + 1;
    next.streak = progress.streak + 1;
    next.recentLapses = Math.max(0, progress.recentLapses - 1);

    // Per-item presentation level: one correct answer promotes one level (a new word
    // walks L0→L1→L2 in two correct answers). A success forgives prior slips.
    next.consecutiveMisses = 0;
    next.level = Math.min(MAX_LEVEL, (progress.level ?? 0) + 1);

    // A confirmed prime becomes an ordinary item: clear the flag so future misses
    // use the normal forgive-one-slip hysteresis, not the immediate primed reset.
    if (progress.primed) next.primed = false;

    // Multiplicative approach toward 1 with diminishing returns, capped < 1.
    next.mastery = Math.min(MASTERY_CEILING, progress.mastery + rate * (1 - progress.mastery));

    // Each success makes the item a touch easier.
    next.difficulty = Math.max(MIN_DIFFICULTY, progress.difficulty - 0.05);

    // SRS: advance one step up the spacing ladder; schedule the next review.
    next.stability = nextStabilityStep(progress.stability, true)
    next.due = dueFromStep(next.stability, now)
  } else {
    // ── LAPSE (wrong / timeout / dontKnow) ─────────────────────────────────────
    next.wrong = progress.wrong + 1;
    next.streak = 0;
    next.recentLapses = progress.recentLapses + 1;

    if (progress.primed) {
      // Skill-primed self-correction: this item skipped (or short-cut) the MC ladder
      // on the bet that its already-mastered rule made it easy. A miss disproves the
      // bet — drop it straight back to full scaffolding (MC, level 0) instead of
      // waiting for a 2nd consecutive miss, and clear the flag.
      next.level = 0;
      next.consecutiveMisses = 0;
      next.primed = false;
    } else {
      // Per-item demotion with hysteresis: a single slip is forgiven; only the 2nd
      // CONSECUTIVE miss on this item walks it down one presentation level.
      const consecutive = (progress.consecutiveMisses ?? 0) + 1;
      if (consecutive >= DEMOTE_AFTER) {
        next.level = Math.max(0, (progress.level ?? 0) - 1);
        next.consecutiveMisses = 0;
      } else {
        next.level = progress.level ?? 0;
        next.consecutiveMisses = consecutive;
      }
    }

    // Penalty scaled by PRIOR mastery: high confidence is punished hard
    // (×~0.35–0.40), a low-confidence item shrinks less. Floored so it never dies.
    next.mastery = Math.max(
      MASTERY_FLOOR,
      progress.mastery * (0.35 + 0.15 * (1 - progress.mastery)),
    );

    // Each lapse makes the item a touch harder.
    next.difficulty = Math.min(MAX_DIFFICULTY, progress.difficulty + 0.15);

    // SRS: drop back down the ladder and resurface almost immediately.
    next.stability = nextStabilityStep(progress.stability, false)
    next.due = now + RELAPSE_MS
  }

  return next;
}

/* ── Skill rollup ──────────────────────────────────────────────────────────── */

/** A fresh, empty aggregate for one skill bucket. */
export function createSkillProgress(): SkillProgress {
  return { seen: 0, correct: 0, wrong: 0, mastery: 0 };
}

/**
 * Fold one answer into a skill bucket's aggregate and return a NEW
 * {@link SkillProgress}. This is a coarser, faster-moving cousin of the per-item
 * model: a fixed +12% step toward 1 on success (×0.85 for a 'near'), and a flat
 * ×0.6 on a lapse. Mastery is clamped to [0, 0.99]. `prev` may be undefined the
 * first time a skill is touched.
 */
export function rollUpSkill(prev: SkillProgress | undefined, result: AnswerResult): SkillProgress {
  const base = prev ?? createSkillProgress();
  const next: SkillProgress = {
    seen: base.seen + 1,
    correct: base.correct,
    wrong: base.wrong,
    mastery: base.mastery,
  };

  if (isSuccess(result)) {
    next.correct = base.correct + 1;
    const gain = result === 'near' ? 0.12 * NEAR_FACTOR : 0.12;
    next.mastery = base.mastery + gain * (1 - base.mastery);
  } else {
    next.wrong = base.wrong + 1;
    next.mastery = Math.max(MASTERY_FLOOR, base.mastery * 0.6);
  }

  // Clamp to [0, 0.99].
  next.mastery = Math.min(MASTERY_CEILING, Math.max(0, next.mastery));
  return next;
}

/**
 * Reconstruct the ENTIRE skills map deterministically from a map of per-item
 * progress — the single source of truth for skill aggregates after a merge.
 *
 * Why a rebuild (and not a replay)?  During normal play a skill aggregate is
 * grown one answer at a time by {@link rollUpSkill}, whose mastery curve is
 * order- and history-dependent (a multiplicative approach toward 1). That exact
 * per-answer sequence is NOT recoverable from final item states — only the items
 * survive a merge, not the interleaved answer log. So instead of replaying, we
 * derive each skill's aggregate directly from the items it summarizes, which is
 * fully deterministic and, by construction, CONSISTENT with those items:
 *
 *   - seen / correct / wrong : exact sums across the item progresses tagged with
 *     the skill. These are recoverable byte-for-byte, because every answer bumps
 *     the item's seen and exactly one of correct/wrong in lockstep with the skill
 *     bump that rollUpSkill would have applied. So Σ items.seen == the seen the
 *     live rollups would have reached, and likewise for correct/wrong.
 *   - mastery : the mean of the per-item mastery over the items in the skill —
 *     a stable proxy for "how well is this bucket known", clamped to the same
 *     [floor, ceiling] band individual masteries live in. (It does not try to
 *     reproduce rollUpSkill's exact running value, which is unrecoverable; it
 *     reports a value that always agrees with the items shown beneath it.)
 *
 * Each item's own denormalized `skillIds` snapshot drives the rollup, so this is
 * catalog-free: it needs only the item states, never the Item[] catalog. A skill
 * that no surviving item references simply does not appear in the result (the old
 * aggregate is intentionally dropped). An item with `seen === 0` still counts
 * toward its skills' membership (so a freshly-seeded skill reads as low-mastery),
 * matching how an unanswered item contributes mastery via createItemProgress.
 *
 * Pure: never mutates its input and never reads the clock.
 */
export function rebuildSkillProgress(
  items: Record<string, ItemProgress>,
): Record<string, SkillProgress> {
  // Accumulate exact counters plus a running mastery sum + member count per skill.
  const acc: Record<string, { seen: number; correct: number; wrong: number; masterySum: number; count: number }> = {};

  for (const progress of Object.values(items)) {
    const skillIds = progress.skillIds ?? [];
    for (const skillId of skillIds) {
      const bucket = acc[skillId] ?? { seen: 0, correct: 0, wrong: 0, masterySum: 0, count: 0 };
      bucket.seen += progress.seen;
      bucket.correct += progress.correct;
      bucket.wrong += progress.wrong;
      bucket.masterySum += progress.mastery;
      bucket.count += 1;
      acc[skillId] = bucket;
    }
  }

  const skills: Record<string, SkillProgress> = {};
  for (const [skillId, bucket] of Object.entries(acc)) {
    const meanMastery = bucket.count === 0 ? 0 : bucket.masterySum / bucket.count;
    skills[skillId] = {
      seen: bucket.seen,
      correct: bucket.correct,
      wrong: bucket.wrong,
      // Clamp to the same band the live aggregate is held in (see rollUpSkill).
      mastery: Math.min(MASTERY_CEILING, Math.max(0, meanMastery)),
    };
  }

  return skills;
}

/* ── Selection weighting ───────────────────────────────────────────────────── */

/**
 * Seed selection score for weighted-random item picking — higher means more
 * likely to be served next. This generalizes the legacy article-app weighting
 * into the unified Item model; engine/select.ts (Wave 2) layers a recent-miss
 * queue on top of these weights.
 *
 * The score is a sum of independent, always-positive boosts so each lever can be
 * reasoned about and tuned in isolation:
 *   - base       1     — every item is at least a little eligible.
 *   - newBoost  +2.2   — unseen items (no progress, or seen === 0) get surfaced.
 *   - weakBoost +3.5·(1 − mastery) — the dominant term: weak items dominate.
 *   - examBoost +0.5·examWeight    — exam-relevant items get extra airtime.
 *   - unitBoost +0.15·unit         — a mild nudge toward more recent units.
 *   - lapseBoost+0.8·min(recentLapses, 4) — recently-missed items come back.
 *   - floor     +0.15  — even a mastered item resurfaces once in a while.
 *
 * `progress` is undefined for an item the learner has never answered; in that
 * case mastery defaults to {@link INITIAL_MASTERY} (0.2) so an unseen item reads
 * as fairly weak (and also gets the explicit newBoost).
 */
export function selectionWeight(
  progress: ItemProgress | undefined,
  item: Item,
  _now: number,
): number {
  const mastery = progress?.mastery ?? INITIAL_MASTERY;
  const recentLapses = progress?.recentLapses ?? 0;
  const isNew = progress === undefined || progress.seen === 0;

  let weight = 1;
  if (isNew) weight += 2.2; // newBoost
  weight += 3.5 * (1 - mastery); // weakBoost
  weight += 0.5 * item.examWeight; // examBoost
  weight += 0.15 * item.unit; // unitBoost (recency nudge)
  weight += 0.8 * Math.min(recentLapses, 4); // lapseBoost
  weight += 0.15; // floor — mastered items still resurface

  return weight;
}

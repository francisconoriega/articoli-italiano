/**
 * engine/priming.ts — skill-primed graduation.
 *
 * The unit of mastery is the RULE (a shared knowledge component), not the
 * (word, slot) pair. An article is (the rule you know) × (this noun's gender /
 * initial sound). Once the rule is mastered, a *regular* word carries ~no new
 * information — so a NEW such item should start at free-typing and reach "learned"
 * in 1–2 reps, instead of every word restarting the MC→typing ladder from zero.
 * Only EXCEPTIONS still carry new information once the rule is known.
 *
 * PURE and framework-agnostic — like engine/mastery.ts, nothing here calls
 * Date.now(); `skills` is passed in by the caller.
 *
 * Scope (v0): ARTICLES only. {@link governingSkill} returns null for every other
 * item kind, so nothing else is ever primed — but the seam (governingSkill /
 * isPrimable) is the single source of "what rule does this item exercise", kept
 * general so later item kinds can opt in without touching the call sites.
 */

import type { Item, ItemProgress, SkillProgress } from '../types'
import { INITIAL_MASTERY, HARD_SKILLS, HARD_TAG, createItemProgress } from './mastery'

/* ── Tunables (one documented place) ──────────────────────────────────────────
 * How much rule-mastery is required before a new regular item is primed, and how
 * high its starting confidence is allowed to be. The mastery cap is deliberately
 * LOW so a primed item still takes 1–2 reps to truly "learn" — never 0.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Minimum times the governing skill must have been seen before priming kicks in. */
export const PRIME_MIN_SKILL_SEEN = 8
/** Governing-skill mastery at/above which a new regular item starts at typing (L2). */
export const PRIME_TYPING_MASTERY = 0.8
/** Middle tier: at/above this (but below typing) a new item starts at L1 (still MC). */
export const PRIME_SOFT_MASTERY = 0.6
/** A primed item's starting mastery is this fraction of the governing skill's mastery… */
export const PRIME_MASTERY_FRACTION = 0.6
/** …clamped to this ceiling so it still takes 1–2 reps to reach "learned", not 0. */
export const PRIME_MASTERY_CAP = 0.55

/** Local clamp (engine/scheduler.ts owns the private one; priming keeps its own). */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * The specific rule-skill this item exercises, or null if the item kind isn't
 * primable in this pass. For an article item it's the `article:<value>` skill
 * (e.g. `article:la`, `article:lo`) — NOT the `article:def` / `article:indef`
 * family marker, which says nothing about the actual form.
 */
export function governingSkill(item: Item): string | null {
  if (item.kind !== 'article') return null
  return (
    item.skills.find(
      (s) => s.startsWith('article:') && s !== 'article:def' && s !== 'article:indef',
    ) ?? null
  )
}

/**
 * Whether this item is eligible for priming at all: it must have a governing skill
 * AND not be intrinsically hard — exceptions (gender/initial-sound surprises, tagged
 * in content) and HARD_SKILLS items are never primed, because for them the rule is
 * NOT enough to know the answer.
 */
export function isPrimable(item: Item): boolean {
  if (governingSkill(item) === null) return false
  if (item.tags?.includes(HARD_TAG)) return false
  if (item.skills.some((s) => HARD_SKILLS.includes(s))) return false
  return true
}

/**
 * The presentation level an UNSEEN item should start at, given current skill mastery:
 *   - not primable, under-exposed, or weak rule → 0 (full MC ladder, the default);
 *   - rule mastered (seen ≥ MIN, mastery ≥ TYPING) → 2 (free typing, skips MC);
 *   - rule strong-ish (mastery ≥ SOFT)            → 1 (still MC, one rung up).
 * Mirrors engine/choices.ts: level ≥ 2 ⇒ typing, else multiple-choice.
 */
export function primedStartLevel(item: Item, skills: Record<string, SkillProgress>): number {
  if (!isPrimable(item)) return 0
  const gov = governingSkill(item)
  if (gov === null) return 0
  const skill = skills[gov]
  if (!skill || skill.seen < PRIME_MIN_SKILL_SEEN) return 0
  if (skill.mastery >= PRIME_TYPING_MASTERY) return 2
  if (skill.mastery >= PRIME_SOFT_MASTERY) return 1
  return 0
}

/**
 * The starting mastery for a primed UNSEEN item: a fraction of the governing skill's
 * mastery, clamped to [INITIAL_MASTERY, PRIME_MASTERY_CAP]. The low cap is the safety
 * valve — even a fully-mastered rule only buys a head start, never an instant "learned".
 * Non-primable / un-primed items keep the plain {@link INITIAL_MASTERY}.
 */
export function primedStartMastery(item: Item, skills: Record<string, SkillProgress>): number {
  const gov = governingSkill(item)
  const skill = gov !== null ? skills[gov] : undefined
  if (!isPrimable(item) || !skill) return INITIAL_MASTERY
  return clamp(PRIME_MASTERY_FRACTION * skill.mastery, INITIAL_MASTERY, PRIME_MASTERY_CAP)
}

/**
 * Build the initial progress for an item the learner has never answered, applying
 * skill-primed graduation: a regular item whose governing rule is already mastered
 * starts above the MC floor (level + mastery), and is flagged `primed` so the first
 * answer self-corrects (a miss drops it back to the MC ladder — see applyAnswer).
 * When nothing is primable this is exactly {@link createItemProgress}.
 */
export function createPrimedItemProgress(
  item: Item,
  skills: Record<string, SkillProgress>,
): ItemProgress {
  const base = createItemProgress(item)
  const level = primedStartLevel(item, skills)
  if (level <= 0) return base
  return {
    ...base,
    level,
    mastery: primedStartMastery(item, skills),
    primed: true,
  }
}

/**
 * engine/choices.ts — per-item presentation stage + multiple-choice distractors.
 *
 * presentationFor() reads ONLY the item's own per-item level (engine/mastery.ts owns
 * the promote/demote rules) — there is no cross-item or per-skill influence:
 *   level 0–1 → multiple-choice + Spanish gloss  (learning / recognition)
 *   level 2   → free typing, Italian-only         (mastered / production)
 * The Spanish meaning stays through the whole multiple-choice phase and drops only at
 * the jump to typing — a single (possibly lucky) MC answer shouldn't remove the anchor.
 *
 * buildChoices() builds distractors that are pedagogically tight: for verbs, OTHER
 * conjugations of the SAME verb (and, only if needed, a same-class similar verb) —
 * never random unrelated verbs.
 */
import type { Item, ItemProgress, PresentationStage } from '../types'

export function presentationFor(progress: ItemProgress | undefined): PresentationStage {
  const level = progress?.level ?? 0
  // Free typing (Italian-only) once mastered; otherwise multiple-choice WITH the
  // Spanish meaning — the gloss stays through the entire recognition phase.
  if (level >= 2) return { input: 'type', gloss: false }
  return { input: 'choice', gloss: true }
}

const DEF_ARTICLES = ['il', 'lo', 'la', "l'", 'i', 'gli', 'le']
const INDEF_ARTICLES = ['un', 'uno', 'una', "un'"]

/** The verb-family skill key for a verb item, or null. */
function verbKey(item: Item): string | null {
  const v = item.skills.find((s) => s.startsWith('verb:'))
  if (v) return v
  if (item.skills.includes('essere')) return 'essere'
  if (item.skills.includes('avere')) return 'avere'
  return null
}

function personKey(item: Item): string | undefined {
  return item.skills.find((s) => s.startsWith('person:'))
}

/**
 * Build `count` shuffled options (including the correct answer) with kind-aware
 * distractors:
 *   - verb-conjugation → other persons of the SAME verb; if too few, a same-class
 *     similar verb (same person) — never an unrelated verb.
 *   - essere/avere      → forms of BOTH auxiliaries (tests essere-vs-avere).
 *   - article           → the relevant article family (def or indef).
 *   - number            → other words of the same cardinal/ordinal kind.
 *   - vocab/pronoun     → other terms of the same kind.
 */
export function buildChoices(
  item: Item,
  allItems: Item[],
  count = 4,
  random: () => number = Math.random,
): string[] {
  const correct = item.answer
  let candidates: string[] = []

  if (item.kind === 'essere-avere') {
    candidates = allItems
      .filter((i) => i !== item && (i.skills.includes('essere') || i.skills.includes('avere')))
      .map((i) => i.answer)
  } else if (item.kind === 'verb-conjugation') {
    const vk = verbKey(item)
    if (vk) {
      candidates = allItems
        .filter((i) => i !== item && i.kind === 'verb-conjugation' && i.skills.includes(vk))
        .map((i) => i.answer)
    }
    if (candidates.length < count - 1) {
      // Fallback: same conjugation CLASS, same person — a "very similar verb".
      const cls = item.skills.find((s) => s.startsWith('class:'))
      const person = personKey(item)
      if (cls) {
        candidates = candidates.concat(
          allItems
            .filter(
              (i) =>
                i.kind === 'verb-conjugation' &&
                i.skills.includes(cls) &&
                (!vk || !i.skills.includes(vk)) &&
                (!person || i.skills.includes(person)),
            )
            .map((i) => i.answer),
        )
      }
    }
  } else if (item.kind === 'article') {
    candidates = (INDEF_ARTICLES.includes(correct) ? INDEF_ARTICLES : DEF_ARTICLES).slice()
  } else if (item.kind === 'number') {
    // Distractors are the NUMERICALLY CLOSEST numbers of the same kind — far more
    // testing than random numbers (27 vs 26/28/37, not 27 vs cento).
    const isOrdinal = item.skills.includes('number:ordinal')
    const figure = item.prompt.figure ?? 0
    candidates = allItems
      .filter(
        (i) =>
          i !== item &&
          i.kind === 'number' &&
          i.skills.includes('number:ordinal') === isOrdinal &&
          typeof i.prompt.figure === 'number',
      )
      .sort((a, b) => Math.abs((a.prompt.figure as number) - figure) - Math.abs((b.prompt.figure as number) - figure))
      .slice(0, (count - 1) * 2) // keep only the closest as the distractor pool
      .map((i) => i.answer)
  } else {
    candidates = allItems.filter((i) => i.kind === item.kind).map((i) => i.answer)
  }

  const distractors = shuffle(
    [...new Set(candidates.filter((c) => c && c !== correct))],
    random,
  ).slice(0, Math.max(0, count - 1))

  return shuffle([correct, ...distractors], random)
}

function shuffle<T>(arr: T[], random: () => number): T[] {
  const copy = arr.slice()
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

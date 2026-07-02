/**
 * engine/choices.ts — per-item presentation stage + multiple-choice distractors.
 *
 * presentationFor() reads ONLY the item's own per-item level (engine/mastery.ts owns
 * the promote/demote rules) — there is no cross-item or per-skill influence:
 *   level 0 → multiple-choice + Spanish gloss + per-option helper notes (max support)
 *   level 1 → multiple-choice + Spanish gloss, NO per-option notes  (less support)
 *   level 2 → free typing, Italian-only                              (production)
 * The Spanish meaning stays through the whole multiple-choice phase and drops only at
 * the jump to typing — a single (possibly lucky) MC answer shouldn't remove the anchor.
 *
 * buildChoices() builds distractors that are pedagogically tight: for verbs, OTHER
 * conjugations of the SAME verb (and, only if needed, a same-class similar verb) —
 * never random unrelated verbs.
 *
 * buildChoicesWithNotes() returns the same set of options but annotated with an optional
 * `note` string per option (populated only at level 0 for scaffolding purposes).
 */
import type { Item, ItemProgress, PresentationStage, SkillProgress } from '../types'
import { primedStartLevel } from './priming'

/** Map a per-item presentation level to its stage (single source of the rule):
 *  - level 0: MC + gloss + per-option notes (maximum scaffolding).
 *  - level 1: MC + gloss, no per-option notes ("solo italiano-ish").
 *  - level 2+: free typing, no gloss (production).
 *
 *  NOTE: L0 vs L1 are both MC+gloss in the PresentationStage sense; the distinction
 *  (whether per-option notes appear) is exposed via {@link optionNotesForLevel}. */
function stageForLevel(level: number): PresentationStage {
  if (level >= 2) return { input: 'type', gloss: false }
  return { input: 'choice', gloss: true }
}

/**
 * Whether per-option helper notes should be shown at a given level.
 * True only at L0 (maximum support); L1 is MC+gloss but WITHOUT notes ("solo italiano").
 */
export function optionNotesForLevel(level: number): boolean {
  return level === 0
}

export function presentationFor(progress: ItemProgress | undefined): PresentationStage {
  return stageForLevel(progress?.level ?? 0)
}

/**
 * Presentation for an item that may be UNSEEN: when there's no progress yet, derive a
 * skill-primed start level (engine/priming.ts) so a new item whose governing rule is
 * already mastered begins at free-typing instead of the MC ladder. Once the item has
 * progress, this is exactly {@link presentationFor}. Callers gate on Settings.assist
 * (with assist off everything is typing anyway) and Settings.skillPrimedGraduation.
 */
export function presentationForItem(
  progress: ItemProgress | undefined,
  item: Item,
  skills: Record<string, SkillProgress>,
): PresentationStage {
  if (progress === undefined) return stageForLevel(primedStartLevel(item, skills))
  return presentationFor(progress)
}

/**
 * A single multiple-choice option, optionally annotated with a helper note.
 * The `note` is a small muted hint shown only at level 0 (max scaffolding):
 *   - verb items: the infinitive form of that option's verb
 *   - other items: absent (undefined)
 */
export interface ChoiceOption {
  value: string
  /** Optional helper note shown under the option at L0 only. */
  note?: string
  /**
   * Optional short display label shown INSTEAD of `value` on the button. Agreement
   * options use it to show only the filled blank-words ("sorelle · felici") rather than
   * repeating the whole sentence; `value` stays the full string for grading + the
   * `value === item.answer` correct-answer highlight.
   */
  label?: string
}

const DEF_ARTICLES = ['il', 'lo', 'la', "l'", 'i', 'gli', 'le']
const INDEF_ARTICLES = ['un', 'uno', 'una', "un'"]

/**
 * Kinds that are ALWAYS presented as multiple-choice (never free typing): a
 * pragmatics task ('functional-choice') is a recognition exercise — typing a full
 * reply makes no sense. engine/session.ts forces 'choice' for these.
 */
export const CHOICE_ONLY_KINDS: ReadonlySet<string> = new Set(['functional-choice'])

/** The motion verbs whose forms distract each other in the deixis lane. */
const MOTION_VERBS = ['verb:andare', 'verb:venire', 'verb:uscire']

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
 * Plausible WRONG endings for an agreement ending — the other gender/number forms a
 * learner confuses it with (so the distractor phrases are tight, not random). Mirrors
 * the four cells: -o ↔ -a (gender flip), -o/-a ↔ -i/-e (number flip), -e ↔ -i (number).
 */
function endingAlternatives(ending: string): string[] {
  switch (ending) {
    case 'o':
      return ['a', 'i', 'e']
    case 'a':
      return ['o', 'e', 'i']
    case 'i':
      return ['e', 'o', 'a']
    case 'e':
      return ['i', 'a', 'o']
    case 'he': // amiche/simpatiche spelling-change plural
      return ['e', 'i', 'a']
    default:
      return ['i', 'a', 'o', 'e']
  }
}

/** Interleave phrase segments with an ending-set into a full corrected phrase. */
function fillPhrase(parts: string[], endings: string[]): string {
  let out = ''
  parts.forEach((part, i) => {
    out += part
    if (i < endings.length) out += endings[i]
  })
  return out
}

/**
 * Build up to `n` full-phrase distractors for an agreement item by flipping ONE ending
 * at a time (then, if needed, flipping all blanks to a single wrong ending). Each
 * distractor is the phrase rendered with that wrong ending-set, so the options read as
 * context ("…le pizze semplice" vs the correct "…le pizze semplici"), never bare letters.
 */
function agreementDistractorPhrases(item: Item, n: number, random: () => number): string[] {
  const parts = item.prompt.parts
  const blanks = item.prompt.blanks
  if (!parts || !blanks || blanks.length === 0) return []
  const correctKey = blanks.join('|')
  const seen = new Set<string>([correctKey])
  const phrases: string[] = []

  // 1) Flip each blank in turn to each of its alternatives.
  for (let i = 0; i < blanks.length; i += 1) {
    for (const alt of endingAlternatives(blanks[i])) {
      const next = blanks.slice()
      next[i] = alt
      const key = next.join('|')
      if (seen.has(key)) continue
      seen.add(key)
      phrases.push(fillPhrase(parts, next))
    }
  }

  // 2) Fallback for very short phrases: make every blank the same wrong ending.
  for (const alt of ['o', 'a', 'i', 'e']) {
    const next = blanks.map(() => alt)
    const key = next.join('|')
    if (seen.has(key)) continue
    seen.add(key)
    phrases.push(fillPhrase(parts, next))
  }

  return shuffle(phrases, random).slice(0, Math.max(0, n))
}

/**
 * The blank-words alone, filled with an ending-set — the minimal contrast shown on an
 * agreement option (e.g. "sorelle · felici"), since the full sentence already lives in
 * the hero. For each blank: the trailing word of the left segment + the ending + the
 * leading word of the right segment (trailing punctuation stripped).
 */
function agreementBlankWords(parts: string[], endings: string[]): string {
  const words: string[] = []
  for (let i = 0; i < endings.length; i += 1) {
    const before = (parts[i] ?? '').split(/\s+/).pop() ?? ''
    const afterRaw = (parts[i + 1] ?? '').match(/^\S*/)?.[0] ?? ''
    const after = afterRaw.replace(/[.,;:!?¿¡"»«)]+$/, '')
    words.push(`${before}${endings[i]}${after}`)
  }
  return words.join(' · ')
}

/**
 * Agreement options as {@link ChoiceOption}s whose `value` is the full corrected phrase
 * (for grading + the correct-answer highlight) but whose `label` is only the filled
 * blank-words — so the buttons show "sorelle · felici" instead of repeating the whole
 * sentence four times. Distractors flip plausible gender/number endings.
 */
export function buildAgreementOptions(
  item: Item,
  count = 4,
  random: () => number = Math.random,
): ChoiceOption[] {
  const parts = item.prompt.parts
  const blanks = item.prompt.blanks
  if (!parts || !blanks || blanks.length === 0) return [{ value: item.answer }]

  const sets: string[][] = []
  const seen = new Set<string>([blanks.join('|')])
  // Flip each blank in turn to each plausible wrong ending.
  for (let i = 0; i < blanks.length; i += 1) {
    for (const alt of endingAlternatives(blanks[i])) {
      const next = blanks.slice()
      next[i] = alt
      const key = next.join('|')
      if (seen.has(key)) continue
      seen.add(key)
      sets.push(next)
    }
  }
  // Fallback for very short phrases: every blank the same wrong ending.
  for (const alt of ['o', 'a', 'i', 'e']) {
    const next = blanks.map(() => alt)
    const key = next.join('|')
    if (seen.has(key)) continue
    seen.add(key)
    sets.push(next)
  }

  const distractors = shuffle(sets, random).slice(0, Math.max(0, count - 1))
  const chosen = shuffle([blanks.slice(), ...distractors], random)
  return chosen.map((endings) => ({
    value: fillPhrase(parts, endings),
    label: agreementBlankWords(parts, endings),
  }))
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

  if (item.distractors && item.distractors.length) {
    // Authored distractors win: grammar-cloze items whose answer isn't a vocab term
    // (a preposition/article/agreement form) supply their own tight, plausible set.
    candidates = item.distractors.slice()
  } else if (item.kind === 'essere-avere') {
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
  } else if (item.kind === 'verb-choice') {
    // Deixis: distractors are the SAME-person forms of the other motion verbs
    // (vado/vieni/esco…) so the choice — not the person — is what's tested.
    const person = personKey(item)
    candidates = allItems
      .filter(
        (i) =>
          i.kind === 'verb-conjugation' &&
          MOTION_VERBS.some((v) => i.skills.includes(v)) &&
          (!person || i.skills.includes(person)),
      )
      .map((i) => i.answer)
  } else if (item.kind === 'agreement') {
    // Full-phrase options: the correct phrase plus phrases built from plausibly-WRONG
    // ending-sets (gender/number flips). The correct option string equals item.answer,
    // so Choice.svelte's `value === item.answer` highlight works unchanged.
    candidates = agreementDistractorPhrases(item, count - 1, random)
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
  } else if (item.kind === 'vocab') {
    // Tight distractors: other terms of the SAME category (topic "vocab:<cat>") — other
    // months for a month, other days for a day — so the contrast is thematic, not a
    // random noun from an unrelated field. Fall back to any vocab if the category is small.
    // Exclude grammar-cloze items (those carry their OWN authored distractors): their
    // answers are prepositions/articles/agreement forms, not vocabulary terms, so they
    // must never leak into a recall item's option set (e.g. "il" among the weekdays).
    const isVocabWord = (i: Item): boolean => i.kind === 'vocab' && !i.distractors
    const sameTopic = allItems
      .filter((i) => i !== item && isVocabWord(i) && i.topic === item.topic)
      .map((i) => i.answer)
    candidates = sameTopic
    if (candidates.length < count - 1) {
      candidates = candidates.concat(
        allItems.filter((i) => isVocabWord(i) && i.topic !== item.topic).map((i) => i.answer),
      )
    }
  } else {
    candidates = allItems.filter((i) => i.kind === item.kind).map((i) => i.answer)
  }

  const distractors = shuffle(
    [...new Set(candidates.filter((c) => c && c !== correct))],
    random,
  ).slice(0, Math.max(0, count - 1))

  return shuffle([correct, ...distractors], random)
}

/**
 * Like {@link buildChoices} but returns {@link ChoiceOption} objects.
 * When `withNotes` is true (level 0), verb-conjugation options carry the
 * infinitive of their source verb as a helper note. Other kinds have no note.
 * At level 1+ pass `withNotes: false` and all notes will be absent.
 */
export function buildChoicesWithNotes(
  item: Item,
  allItems: Item[],
  count = 4,
  withNotes = false,
  random: () => number = Math.random,
): ChoiceOption[] {
  // Agreement: show only the filled blank-words on each button (the full sentence is
  // already in the hero), with `value` kept as the full phrase for grading.
  if (item.kind === 'agreement') return buildAgreementOptions(item, count, random)

  const values = buildChoices(item, allItems, count, random)

  if (!withNotes || item.kind !== 'verb-conjugation') {
    return values.map((v) => ({ value: v }))
  }

  // For verb-conjugation at L0: annotate each option with the infinitive of
  // the verb that produced that form, to help the learner disambiguate.
  const verbInfByForm = new Map<string, string>()
  for (const candidate of allItems) {
    if (candidate.kind === 'verb-conjugation') {
      const vSkill = candidate.skills.find((s) => s.startsWith('verb:')) ??
        (candidate.skills.includes('essere') ? 'essere' :
         candidate.skills.includes('avere') ? 'avere' : undefined)
      if (vSkill) {
        const inf = vSkill.startsWith('verb:') ? vSkill.slice('verb:'.length) : vSkill
        verbInfByForm.set(candidate.answer, inf)
      }
    }
  }

  // The infinitive note only helps when the options span DIFFERENT verbs (the rare
  // mixed-verb fallback set). In the usual conjugation drill every option is the SAME
  // verb (other persons of it), so the note would just repeat that infinitive on every
  // button — pure noise. Keep notes only when ≥2 distinct infinitives are present.
  const infos = values.map((v) => verbInfByForm.get(v))
  const distinct = new Set(infos.filter((i): i is string => i !== undefined))
  if (distinct.size <= 1) {
    return values.map((v) => ({ value: v }))
  }
  return values.map((v, idx) => {
    const inf = infos[idx]
    return inf ? { value: v, note: inf } : { value: v }
  })
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

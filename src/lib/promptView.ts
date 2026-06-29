/**
 * promptView — derives the unified card anatomy for any Item, so TypeAnswer and
 * Choice render the SAME hierarchy: badges → HERO → meaning → task → answer.
 *
 *  - Verb:     hero = lemma (PULIRE), task = "voi ___" (carries the blank)
 *  - Article:  hero = "___ medici" (carries the blank), no task
 *  - Number:   hero = the figure ("9" / "9°"), no blank → answer goes below
 *  - Sentence: hero = the full sentence (carries the blank), no task
 *  - Vocab:    hero = the Spanish cue ("la boca"), no blank → answer goes below
 */
import type { Item } from '../types'
import { BLANK } from '../types'
import { tonicSplit } from '../engine/syllables'

export interface PromptView {
  badges: string[]
  /** `tonic` = underline the stressed syllable of 3+ syllable Italian words in
   *  the hero (single-word prompts: verb lemmas and article nouns). */
  hero: { text: string; hasBlank: boolean; isFigure: boolean; tonic: boolean }
  task: { text: string; hasBlank: boolean } | null
  /** Spanish meaning under the hero (shown in stage 1). */
  meaning: string | null
  /** Where the answer affordance lives: inline in the hero/task blank, or below. */
  answerSlot: 'hero' | 'task' | 'below'
}

export function promptView(item: Item): PromptView {
  const badges = item.prompt.badges ?? []
  const figure = item.prompt.figure

  // Number lane — the figure is the hero (ordinals get a degree mark for clarity).
  if (typeof figure === 'number') {
    const ordinal = item.skills.includes('number:ordinal')
    return {
      badges,
      hero: { text: ordinal ? `${figure}°` : `${figure}`, hasBlank: false, isFigure: true, tonic: false },
      task: null,
      meaning: null,
      answerSlot: 'below',
    }
  }

  // Verb lane — the lemma is the hero, the conjugation frame is the task.
  if (item.prompt.lemma) {
    const taskText = item.prompt.text
    const taskHasBlank = taskText.includes(BLANK)
    return {
      badges,
      // The lemma is a single Italian word → underline its tonic syllable.
      hero: { text: item.prompt.lemma.toUpperCase(), hasBlank: false, isFigure: false, tonic: true },
      task: { text: taskText, hasBlank: taskHasBlank },
      meaning: item.gloss ?? null,
      answerSlot: taskHasBlank ? 'task' : 'below',
    }
  }

  // Article / sentence / vocab / pronoun — the (possibly blanked) text is the hero.
  const text = item.prompt.text
  const hasBlank = text.includes(BLANK)
  // Tonic underline only when the article hero is a SINGLE Italian word
  // ("___ alberi") — never a full article sentence ("___ fratelli di Giorgio…"),
  // and never the Spanish vocab/pronoun cues.
  const oneWord = text.replace(BLANK, ' ').trim().split(/\s+/).length === 1
  return {
    badges,
    hero: { text, hasBlank, isFigure: false, tonic: item.kind === 'article' && oneWord },
    task: null,
    meaning: item.gloss ?? null,
    answerSlot: hasBlank ? 'hero' : 'below',
  }
}

/** Tooltip text explaining a stage badge (shown on hover / long-press). */
export function badgeTitle(badge: string): string {
  switch (badge) {
    case 'Irregular':
      return 'Verbo irregular: no sigue el patrón regular; hay que memorizarlo.'
    case 'Modal':
      return 'Verbo modal (potere/volere/dovere): va seguido de un infinitivo — devo studiare.'
    case '-isc':
      return 'Verbo en -ire que inserta -isc-: finisco, finisci, finisce, finiscono.'
    case 'Determinado':
      return 'Artículo determinado: el / la / los / las (il, lo, la, l’, i, gli, le).'
    case 'Indeterminado':
      return 'Artículo indeterminado: un / una (un, uno, una, un’).'
    case 'Singular':
      return 'Forma singular.'
    case 'Plural':
      return 'Forma plural.'
    case 'Cardinal':
      return 'Número cardinal: uno, due, tre… (cantidad).'
    case 'Ordinal':
      return 'Número ordinal: primo, secondo, terzo… (orden).'
    case 'Excepción':
      return 'Excepción de escritura (elisión): ventuno, ventotto, sessantotto…'
    default:
      return badge
  }
}

/** A piece of a rendered prompt line: literal text, a tonic syllable to
 *  underline, or the answer slot (the blank). */
export type LineSegment =
  | { t: 'text'; v: string }
  | { t: 'tonic'; v: string }
  | { t: 'blank' }

/** Match runs of letters (incl. accented) so we can tonic-split whole words. */
const WORD_RE = /([A-Za-zÀ-ÿ]+)/

/**
 * Break a prompt line into render segments: the blank becomes a `blank` slot,
 * and — when `tonic` is set — each 3+ syllable Italian word contributes a
 * `tonic` segment for its stressed syllable (the rest stays literal `text`).
 */
export function lineSegments(text: string, tonic: boolean): LineSegment[] {
  const out: LineSegment[] = []
  const parts = text.split(BLANK)
  parts.forEach((part, i) => {
    if (i > 0) out.push({ t: 'blank' })
    if (!part) return
    if (!tonic) {
      out.push({ t: 'text', v: part })
      return
    }
    for (const tok of part.split(WORD_RE)) {
      if (!tok) continue
      const split = WORD_RE.test(tok) ? tonicSplit(tok) : null
      if (split) {
        if (split.pre) out.push({ t: 'text', v: split.pre })
        out.push({ t: 'tonic', v: split.tonic })
        if (split.post) out.push({ t: 'text', v: split.post })
      } else {
        out.push({ t: 'text', v: tok })
      }
    }
  })
  return out
}

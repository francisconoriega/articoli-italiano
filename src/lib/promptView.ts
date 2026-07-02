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
import { vocabCategoryLabel } from '../engine/items'

export interface PromptView {
  badges: string[]
  /** `tonic` = underline the stressed syllable of 3+ syllable Italian words in
   *  the hero (single-word prompts: verb lemmas and article nouns). */
  hero: { text: string; hasBlank: boolean; isFigure: boolean; tonic: boolean }
  /** `tonic` = underline the stressed syllable of 3+ syllable Italian words in
   *  the task line (the conjugation frame is always an Italian sentence). */
  task: { text: string; hasBlank: boolean; tonic: boolean } | null
  /** Spanish meaning under the hero (shown in stage 1). */
  meaning: string | null
  /** Full Spanish translation of the whole sentence, shown under `meaning` when the
   *  meaning is only a partial cue (e.g. an idiom). */
  translation: string | null
  /** Where the answer affordance lives: inline in the hero/task blank, or below. */
  answerSlot: 'hero' | 'task' | 'below'
}

/**
 * A leading "exercise type" badge derived from the item's kind, so every card announces
 * what it is (e.g. "Pronombres", "La hora") — the same badge chip the article/verb cards
 * already use. Returns null for article/number/agreement, whose existing badges
 * (Determinado/Cardinal/Concordancia…) already name the family; a vocab RECALL card is
 * self-labelled by its "… — escribe en italiano" hint, so only the grammar-cloze variant
 * (a blank inside the sentence) gets a "Gramática" badge here.
 */
function exerciseTypeBadge(item: Item): string | null {
  switch (item.kind) {
    case 'pronoun':
      return 'Pronombres'
    case 'tell-time':
      return 'La hora'
    case 'functional-choice':
      return 'Expresión'
    case 'verb-choice':
      return 'Movimiento'
    case 'verb-conjugation':
      return 'Verbo'
    case 'essere-avere':
      return 'Essere / Avere'
    case 'vocab':
      if (item.prompt.text.includes(BLANK)) return 'Gramática'
      // Recall cards already carry authored category/number/gender badges (set in
      // vocabToItems) — don't duplicate. Relational clue drills (kind 'vocab' from
      // lessons.ts, no authored badges) get just the category badge from their topic.
      if (item.prompt.badges && item.prompt.badges.length) return null
      return item.topic.startsWith('vocab:') ? vocabCategoryLabel(item.topic.slice(6)) : null
    default:
      return null
  }
}

export function promptView(item: Item): PromptView {
  const typeBadge = exerciseTypeBadge(item)
  const authored = item.prompt.badges ?? []
  // Prepend the type badge (skip if the authored badges already lead with it).
  const badges =
    typeBadge && !authored.includes(typeBadge) ? [typeBadge, ...authored] : authored
  const figure = item.prompt.figure

  // Number lane — the figure is the hero (ordinals get a degree mark for clarity).
  if (typeof figure === 'number') {
    const ordinal = item.skills.includes('number:ordinal')
    return {
      badges,
      hero: { text: ordinal ? `${figure}°` : `${figure}`, hasBlank: false, isFigure: true, tonic: false },
      task: null,
      meaning: null,
      translation: null,
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
      // The frame is an Italian sentence ("Marco ___ la spesa il sabato") →
      // underline tonic syllables (sàbato) like we do single Italian words.
      task: { text: taskText, hasBlank: taskHasBlank, tonic: true },
      meaning: item.gloss ?? null,
      translation: item.translation ?? null,
      answerSlot: taskHasBlank ? 'task' : 'below',
    }
  }

  // Article / sentence / vocab / pronoun — the (possibly blanked) text is the hero.
  const text = item.prompt.text
  const hasBlank = text.includes(BLANK)
  // Underline tonic syllables when the hero is ITALIAN — single words ("___ alberi"),
  // article phrases ("___ fratelli di Giorgio…"), and full sentences alike
  // (lineSegments splits per word and only marks 3+ syllable words, so "sàbato" gets
  // underlined while "il"/"la" don't). Excludes vocab/pronoun, whose cues are Spanish.
  const italianHero = item.kind !== 'vocab' && item.kind !== 'pronoun'
  return {
    badges,
    hero: { text, hasBlank, isFigure: false, tonic: italianHero },
    task: null,
    meaning: item.gloss ?? null,
    translation: item.translation ?? null,
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
    case 'Masculino':
      return 'Sustantivo masculino (género gramatical).'
    case 'Femenino':
      return 'Sustantivo femenino (género gramatical).'
    case 'Cardinal':
      return 'Número cardinal: uno, due, tre… (cantidad).'
    case 'Ordinal':
      return 'Número ordinal: primo, secondo, terzo… (orden).'
    case 'Excepción':
      return 'Excepción de escritura (elisión): ventuno, ventotto, sessantotto…'
    case 'Concordancia':
      return 'Concordancia: el adjetivo copia el género y número del nombre.'
    case 'Pronombres':
      return 'Pronombres personales: io, tu, lui/lei, noi, voi, loro.'
    case 'La hora':
      return 'Decir la hora: «che ore sono?» → è l’una / sono le tre…'
    case 'Expresión':
      return 'Expresión útil: elige la respuesta que encaja en la conversación.'
    case 'Movimiento':
      return 'Verbos de movimiento: andare / venire / uscire — elige y conjuga.'
    case 'Verbo':
      return 'Conjugación verbal: escribe el verbo en la persona indicada.'
    case 'Essere / Avere':
      return 'essere o avere: elige el auxiliar correcto según el contexto.'
    case 'Gramática':
      return 'Regla gramatical: completa el hueco con la forma correcta.'
    default:
      return badge
  }
}

/** A piece of a rendered prompt line: literal text, a tonic syllable to
 *  underline, or the answer slot (the blank). */
export type LineSegment =
  | { t: 'text'; v: string }
  | { t: 'tonic'; v: string }
  | { t: 'blank'; i: number }

/**
 * Length-aware display size for a hero/answer string: short answers (single words,
 * numbers) keep the big punchy size; long ones (full sentences — e.g. agreement
 * phrases) shrink so they don't overflow or dominate the card. Returns a CSS
 * font-size to apply inline.
 */
export function fluidTextSize(text: string): string {
  const n = (text ?? '').trim().length
  if (n <= 14) return 'clamp(2rem, 6vw, 3.2rem)' // words: unchanged, full impact
  if (n <= 24) return 'clamp(1.6rem, 4.8vw, 2.4rem)' // short phrases
  if (n <= 36) return 'clamp(1.3rem, 4vw, 1.9rem)' // longer phrases
  return 'clamp(1.05rem, 3.2vw, 1.5rem)' // full sentences
}

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
    if (i > 0) out.push({ t: 'blank', i: i - 1 })
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

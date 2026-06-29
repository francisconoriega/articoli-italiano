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

export interface PromptView {
  badges: string[]
  hero: { text: string; hasBlank: boolean; isFigure: boolean }
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
      hero: { text: ordinal ? `${figure}°` : `${figure}`, hasBlank: false, isFigure: true },
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
      hero: { text: item.prompt.lemma.toUpperCase(), hasBlank: false, isFigure: false },
      task: { text: taskText, hasBlank: taskHasBlank },
      meaning: item.gloss ?? null,
      answerSlot: taskHasBlank ? 'task' : 'below',
    }
  }

  // Article / sentence / vocab / pronoun — the (possibly blanked) text is the hero.
  const text = item.prompt.text
  const hasBlank = text.includes(BLANK)
  return {
    badges,
    hero: { text, hasBlank, isFigure: false },
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

/** Split a line on the blank token into the text before/after the answer slot. */
export function splitBlank(text: string): { before: string; after: string } {
  const idx = text.indexOf(BLANK)
  if (idx === -1) return { before: text, after: '' }
  return { before: text.slice(0, idx), after: text.slice(idx + BLANK.length) }
}

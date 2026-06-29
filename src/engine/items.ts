/**
 * engine/items.ts — expands the authored Catalog into atomic practice Items.
 *
 * This is the content↔engine bridge: every `Item` here is one unit of practice AND
 * one unit of mastery (keyed by `Item.id`). Renderers consume Items by `kind`; they
 * never see the source entries. Adding curriculum never touches this file's callers.
 */
import type {
  Catalog,
  Item,
  NounEntry,
  NumberRange,
  Person,
  PronounEntry,
  SentenceEntry,
  VerbEntry,
  VocabEntry,
} from '../types'
import { BLANK, PERSONS } from '../types'
import { numberToItalian, numberToOrdinal } from './numbers'

/** Subject-pronoun display used in generated verb frames (e.g. "lui/lei ____"). */
const PRONOUN_DISPLAY: Record<Person, string> = {
  io: 'io',
  tu: 'tu',
  lui: 'lui/lei',
  noi: 'noi',
  voi: 'voi',
  loro: 'loro',
}

/** Maps a verb's class to its skill-bucket tag(s). */
function verbClassSkills(verb: VerbEntry): string[] {
  switch (verb.class) {
    case 'irregular':
      return ['class:irregular']
    case 'modal':
      return ['class:modal']
    case 'ire-isc':
      return ['class:isc']
    case 'essere':
      return ['essere']
    case 'avere':
      return ['avere']
    case 'are':
    case 'ere':
    case 'ire':
      return ['class:regular']
    default:
      return []
  }
}

/** Display badge(s) flagging a verb's irregularity class (shown on the stage). */
function verbBadges(verb: VerbEntry): string[] | undefined {
  switch (verb.class) {
    case 'irregular':
    case 'essere':
    case 'avere':
      return ['Irregular']
    case 'modal':
      return ['Modal']
    case 'ire-isc':
      return ['-isc']
    default:
      return undefined
  }
}

/** Grammar-rule tag so feedback can explain the verb class (modal/irregular/-isc). */
function verbRuleTag(verb: VerbEntry): string | undefined {
  switch (verb.class) {
    case 'modal':
      return 'rule:verb_modal'
    case 'ire-isc':
      return 'rule:verb_isc'
    case 'irregular':
    case 'essere':
    case 'avere':
      return 'rule:verb_irregular'
    default:
      return undefined
  }
}

/**
 * Curriculum sub-skill: "base" proper names (0-19), round tens/hundreds, or
 * compounds. Learners master base names first, then families, then compounds.
 */
function numberSubskill(n: number): string {
  if (n <= 19) return 'number:base'
  if (n % 100 === 0 || n % 10 === 0) return 'number:tens'
  return 'number:compound'
}

/**
 * Elision exceptions: tens/compounds ending in 1 or 8 drop the tens' final vowel
 * (ventuno, ventotto, trentuno, sessantotto…). These get an "Excepción" badge.
 */
function isElision(n: number): boolean {
  return n >= 20 && (n % 10 === 1 || n % 10 === 8)
}

/* ── Per-source generators ──────────────────────────────────────────────────── */

function nounToItems(noun: NounEntry): Item[] {
  const items: Item[] = []
  const exceptionWeight = noun.tags?.includes('exception') ? 2 : 1
  const baseWeight = noun.examWeight ?? exceptionWeight
  // Carry the grammar rule key on the items so feedback can surface the explanation.
  const exTags = noun.rule ? ['exception', `rule:${noun.rule}`] : undefined

  // Definite — singular & plural
  const definites: Array<{ suffix: 'sing' | 'plur'; surface: string; article: string }> = [
    { suffix: 'sing', surface: noun.singular, article: noun.definite.singular },
    { suffix: 'plur', surface: noun.plural, article: noun.definite.plural },
  ]
  for (const d of definites) {
    items.push({
      id: `article:def:${noun.id}:${d.suffix}`,
      kind: 'article',
      prompt: {
        text: `${BLANK} ${d.surface}`,
        hint: 'artículo determinado (el/la/los/las)',
        badges: ['Determinado', d.suffix === 'sing' ? 'Singular' : 'Plural'],
        placeholder: d.suffix === 'sing' ? "il · lo · la · l'" : 'i · gli · le',
      },
      answer: d.article,
      gloss: noun.gloss,
      skills: ['article:def', `article:${d.article}`],
      unit: noun.unit,
      examWeight: baseWeight,
      source: ['data.js'],
      tags: exTags,
    })
  }

  // Indefinite — singular only (Italian)
  if (noun.indefinite) {
    items.push({
      id: `article:indef:${noun.id}:sing`,
      kind: 'article',
      prompt: {
        text: `${BLANK} ${noun.singular}`,
        hint: 'artículo indeterminado (un/una)',
        badges: ['Indeterminado', 'Singular'],
        placeholder: "un · uno · una · un'",
      },
      answer: noun.indefinite.singular,
      gloss: noun.gloss,
      skills: ['article:indef', `article:${noun.indefinite.singular}`],
      unit: noun.unit,
      examWeight: baseWeight,
      source: ['data.js'],
      tags: exTags,
    })
  }

  return items
}

function verbToItems(verb: VerbEntry): Item[] {
  const items: Item[] = []
  const classSkills = verbClassSkills(verb)
  const ruleTag = verbRuleTag(verb)
  const tags = [...(verb.tags ?? []), ...(ruleTag ? [ruleTag] : [])]

  for (const tense of Object.keys(verb.tenses) as Array<keyof typeof verb.tenses>) {
    const table = verb.tenses[tense]
    if (!table) continue
    for (const person of PERSONS) {
      const answer = table[person]
      items.push({
        id: `verb:${tense}:${verb.infinitive}:${person}`,
        kind: 'verb-conjugation',
        prompt: {
          text: `${PRONOUN_DISPLAY[person]} ${BLANK}`,
          lemma: verb.infinitive,
          badges: verbBadges(verb),
        },
        answer,
        gloss: verb.gloss,
        skills: [`verb:${verb.infinitive}`, `tense:${tense}`, `person:${person}`, ...classSkills],
        unit: verb.unit,
        examWeight: verb.examWeight ?? 1,
        source: ['LS pp.8-35'],
        tags: tags.length ? tags : undefined,
      })
    }
  }

  return items
}

function numbersToItems(ranges: NumberRange[]): Item[] {
  // Merge overlapping ranges so each value yields ONE item (max examWeight, min unit).
  const cardinals = new Map<number, { unit: number; examWeight: number }>()
  const ordinals = new Map<number, { unit: number; examWeight: number }>()

  for (const range of ranges) {
    const values = range.only ?? rangeInts(range.from, range.to)
    const target = range.kind === 'ordinal' ? ordinals : cardinals
    for (const v of values) {
      const prev = target.get(v)
      target.set(v, {
        unit: prev ? Math.min(prev.unit, range.unit) : range.unit,
        examWeight: Math.max(prev?.examWeight ?? 0, range.examWeight ?? 1),
      })
    }
  }

  const items: Item[] = []
  for (const [n, meta] of [...cardinals.entries()].sort((a, b) => a[0] - b[0])) {
    const sub = numberSubskill(n)
    const elision = isElision(n)
    const skills = ['number:cardinal', sub]
    if (elision) skills.push('number:elision')
    const badges = ['Cardinal']
    if (elision) badges.push('Excepción')
    items.push({
      id: `number:card:${n}`,
      kind: 'number',
      prompt: { text: '', figure: n, hint: 'escribe el número en italiano', badges },
      answer: numberToItalian(n),
      skills,
      unit: meta.unit,
      // Base names & round tens surface first; compounds keep their merged weight.
      examWeight: Math.max(meta.examWeight, sub === 'number:compound' ? 1 : 2),
      source: ['LS pp.11,13,37'],
      tags: elision ? ['rule:number_elision'] : undefined,
    })
  }
  for (const [n, meta] of [...ordinals.entries()].sort((a, b) => a[0] - b[0])) {
    items.push({
      id: `number:ord:${n}`,
      kind: 'number',
      prompt: { text: '', figure: n, hint: 'número ordinal en italiano (p. ej. 1° → primo)', badges: ['Ordinal'] },
      answer: numberToOrdinal(n),
      skills: ['number:ordinal'],
      unit: meta.unit,
      examWeight: meta.examWeight,
      source: ['LS p.37'],
    })
  }
  return items
}

function vocabToItems(entry: VocabEntry): Item[] {
  // For "piedi"/"occhi" we also accept the singular form.
  const accept = entry.id === 'piedi' ? ['piede'] : entry.id === 'occhi' ? ['occhio'] : undefined
  return [
    {
      id: `vocab:${entry.category}:${entry.id}`,
      kind: 'vocab',
      prompt: {
        text: entry.gloss,
        hint: `${entry.category === 'body' ? 'parte del cuerpo' : entry.category} — escribe en italiano`,
      },
      answer: entry.term,
      accept,
      skills: [`vocab:${entry.category}`],
      unit: entry.unit,
      examWeight: entry.examWeight ?? 1,
      source: ['LS pp.25-26'],
    },
  ]
}

function pronounToItems(entry: PronounEntry): Item[] {
  return [
    {
      id: `pronoun:${entry.id}`,
      kind: 'pronoun',
      prompt: { text: entry.gloss, hint: 'pronombre personal — escribe en italiano' },
      answer: entry.pronoun,
      accept: entry.accept,
      skills: ['pronoun', `person:${entry.person}`],
      unit: entry.unit,
      examWeight: entry.examWeight ?? 1,
      source: ['LS p.8'],
    },
  ]
}

function sentenceToItems(entry: SentenceEntry): Item[] {
  // Derive skills from kind/lemma/person when the author didn't supply them.
  const derived: string[] = []
  if (entry.kind === 'verb-conjugation' && entry.lemma) {
    derived.push(`verb:${entry.lemma}`, 'tense:presente')
  }
  if (entry.person) derived.push(`person:${entry.person}`)
  const skills = entry.skills && entry.skills.length ? entry.skills : derived

  return [
    {
      id: `sentence:${entry.id}`,
      kind: entry.kind,
      prompt: { text: entry.text, lemma: entry.lemma, person: entry.person },
      answer: entry.answer,
      accept: entry.accept,
      gloss: entry.gloss,
      skills: skills.length ? skills : ['sentence'],
      unit: entry.unit,
      examWeight: entry.examWeight ?? 2,
      source: entry.source,
    },
  ]
}

/* ── Public API ─────────────────────────────────────────────────────────────── */

/**
 * Expand the whole catalog into a flat, de-duplicated Item list.
 * Throws on a duplicate id or an empty answer (a content bug we want to catch early).
 * Agreement entries (Ex2 multi-blank) are intentionally NOT expanded in Phase 1A —
 * their renderer lands in Phase 1B.
 */
export function buildItems(catalog: Catalog): Item[] {
  const items: Item[] = [
    ...catalog.nouns.flatMap(nounToItems),
    ...catalog.verbs.flatMap(verbToItems),
    ...numbersToItems(catalog.numbers),
    ...catalog.vocab.flatMap(vocabToItems),
    ...catalog.pronouns.flatMap(pronounToItems),
    ...catalog.sentences.flatMap(sentenceToItems),
  ]

  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new Error(`buildItems: duplicate item id "${item.id}"`)
    }
    seen.add(item.id)
    if (!item.answer || !item.answer.trim()) {
      throw new Error(`buildItems: item "${item.id}" has an empty answer`)
    }
  }
  return items
}

/** Index items by id for O(1) lookup (mastery keys, recent-miss requeue, etc.). */
export function indexItems(items: Item[]): Map<string, Item> {
  return new Map(items.map((item) => [item.id, item]))
}

/** Inclusive integer range helper. */
function rangeInts(from: number, to: number): number[] {
  const out: number[] = []
  for (let n = from; n <= to; n += 1) out.push(n)
  return out
}

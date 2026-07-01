/**
 * engine/items.ts — expands the authored Catalog into atomic practice Items.
 *
 * This is the content↔engine bridge: every `Item` here is one unit of practice AND
 * one unit of mastery (keyed by `Item.id`). Renderers consume Items by `kind`; they
 * never see the source entries. Adding curriculum never touches this file's callers.
 */
import type {
  AgreementEntry,
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
 * Spelling-rule tag for -care/-gare (the -h- in tu/noi → verb_spelling_h) vs
 * -ciare/-giare (no doubled i → verb_spelling_i). Only fires when the verb is
 * flagged with the 'spelling' tag.
 */
function verbSpellingRuleTag(verb: VerbEntry): string | undefined {
  if (!verb.tags?.includes('spelling')) return undefined
  return /(?:ciare|giare)$/.test(verb.infinitive) ? 'rule:verb_spelling_i' : 'rule:verb_spelling_h'
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

/**
 * Finer number band used as the scheduler topic (distinct from the skill subskill):
 * ones (1–10), teens (11–19), tens (round 20–90), hundreds (round 100s), compound (rest).
 * Compounds split by the elision rule (…uno/…otto drop the tens' vowel) vs plain, so a
 * mini-lesson teaches the hard exception as its own coherent unit instead of one 27-item bag.
 */
function numberBand(n: number): string {
  if (n % 100 === 0) return 'num:hundreds' // 100, 200, … (check first so 100 ≠ ones)
  if (n <= 10) return 'num:ones'
  if (n <= 19) return 'num:teens'
  if (n % 10 === 0) return 'num:tens' // 20, 30, … 90
  return isElision(n) ? 'num:compound:elision' : 'num:compound:plain' // 21–99 non-round + larger
}

/**
 * Ordinal band used as the scheduler topic: 1°–10° are irregular base forms learned
 * individually (primo…decimo); 11°+ follow the regular -esimo pattern (drop the final
 * vowel + "esimo"). Two coherent lessons instead of one 30-item bag.
 */
function ordinalBand(n: number): string {
  return n <= 10 ? 'num:ordinal:base' : 'num:ordinal:esimo'
}

/* ── Per-source generators ──────────────────────────────────────────────────── */

function nounToItems(noun: NounEntry): Item[] {
  const items: Item[] = []
  const exceptionWeight = noun.tags?.includes('exception') ? 2 : 1
  const baseWeight = noun.examWeight ?? exceptionWeight
  // Carry the grammar rule key on the items so feedback can surface the explanation.
  const exTags = noun.rule ? ['exception', `rule:${noun.rule}`] : undefined
  // Standard nouns (no special initial rule) split by gender so the mini-lesson teaches
  // masculine (il/i/un) and feminine (la/le/una) forms as separate coherent units rather
  // than one 81-item bag; nouns with a rule keep their rule topic (already coherent).
  const topic = noun.rule ? `article:${noun.rule}` : `article:regular:${noun.gender}`

  // Gender chip — "Masculino" / "Femenino" from the noun entry's gender field.
  const genderBadge = noun.gender === 'm' ? 'Masculino' : 'Femenino'

  // Definite — singular & plural
  const definites: Array<{ suffix: 'sing' | 'plur'; surface: string; article: string }> = [
    { suffix: 'sing', surface: noun.singular, article: noun.definite.singular },
    { suffix: 'plur', surface: noun.plural, article: noun.definite.plural },
  ]
  for (const d of definites) {
    items.push({
      id: `article:def:${noun.id}:${d.suffix}`,
      kind: 'article',
      topic,
      prompt: {
        text: `${BLANK} ${d.surface}`,
        hint: 'artículo determinado (el/la/los/las)',
        badges: ['Determinado', d.suffix === 'sing' ? 'Singular' : 'Plural', genderBadge],
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
      topic,
      prompt: {
        text: `${BLANK} ${noun.singular}`,
        hint: 'artículo indeterminado (un/una)',
        badges: ['Indeterminado', 'Singular', genderBadge],
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
  const spellingTag = verbSpellingRuleTag(verb)
  const tags = [
    ...(verb.tags ?? []),
    ...(ruleTag ? [ruleTag] : []),
    ...(spellingTag ? [spellingTag] : []),
  ]

  for (const tense of Object.keys(verb.tenses) as Array<keyof typeof verb.tenses>) {
    const table = verb.tenses[tense]
    if (!table) continue
    for (const person of PERSONS) {
      const answer = table[person]
      items.push({
        id: `verb:${tense}:${verb.infinitive}:${person}`,
        kind: 'verb-conjugation',
        topic: `verb:${verb.infinitive}`,
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
      topic: numberBand(n),
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
      topic: ordinalBand(n),
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

/** Human hint per vocab category shown under the Spanish cue. */
function vocabCategoryHint(category: string): string {
  switch (category) {
    case 'body':
      return 'parte del cuerpo'
    case 'days':
      return 'día de la semana'
    default:
      return category
  }
}

function vocabToItems(entry: VocabEntry): Item[] {
  return [
    {
      id: `vocab:${entry.category}:${entry.id}`,
      kind: 'vocab',
      topic: `vocab:${entry.category}`,
      prompt: {
        text: entry.gloss,
        hint: `${vocabCategoryHint(entry.category)} — escribe en italiano`,
      },
      answer: entry.term,
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
      topic: 'pronoun',
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

/** Scheduler topic (mini-lesson grouping) for a sentence item, by kind. */
function sentenceTopic(entry: SentenceEntry, skills: string[]): string {
  switch (entry.kind) {
    case 'tell-time':
      return 'time'
    case 'functional-choice':
      return 'functional'
    case 'verb-choice':
      return 'motion'
    case 'pronoun':
      return 'pronoun'
    case 'vocab':
      return skills.find((s) => s.startsWith('vocab:')) ?? 'vocab'
    default:
      return entry.lemma ? `verb:${entry.lemma}` : 'exam'
  }
}

function sentenceToItems(entry: SentenceEntry): Item[] {
  // Derive skills from kind/lemma/person when the author didn't supply them.
  const derived: string[] = []
  if (entry.kind === 'verb-conjugation' && entry.lemma) {
    derived.push(`verb:${entry.lemma}`, 'tense:presente')
  }
  if (entry.person) derived.push(`person:${entry.person}`)
  const skills = entry.skills && entry.skills.length ? entry.skills : derived
  const topic = sentenceTopic(entry, skills)

  return [
    {
      id: `sentence:${entry.id}`,
      kind: entry.kind,
      topic,
      prompt: { text: entry.text, lemma: entry.lemma, person: entry.person },
      answer: entry.answer,
      accept: entry.accept,
      gloss: entry.gloss,
      translation: entry.translation,
      skills: skills.length ? skills : ['sentence'],
      unit: entry.unit,
      examWeight: entry.examWeight ?? 2,
      source: entry.source,
      tags: entry.tags,
    },
  ]
}

/**
 * Reconstruct the FULL corrected phrase from an agreement entry: interleave the phrase
 * segments (split on `_`) with the answer endings. `parts` has one more element than
 * `answers`, e.g. ["l'amic"," messican"," di Laura."] + ["a","a"] → "l'amica messicana
 * di Laura.". This corrected phrase is the Item.answer (so choice-mode option matching
 * and the feedback box both work off a single readable string).
 */
function fillAgreement(parts: string[], answers: string[]): string {
  let out = ''
  parts.forEach((part, i) => {
    out += part
    if (i < answers.length) out += answers[i]
  })
  return out
}

/**
 * Derive the agreement CELL → scheduler topic + display badges. Prefers the explicit
 * gender/number on the entry; otherwise infers from the `agreement:<cell>` skill (the
 * two-clause exam #4 carries both cells, so it falls back to a neutral topic + no
 * gender/number badge). Returns the topic and the Femenino/Masculino + Singular/Plural
 * badges (reusing the shared badge convention so badgeTitle tooltips apply).
 */
function agreementCell(entry: AgreementEntry): { topic: string; badges: string[] } {
  let gender = entry.gender
  let number = entry.number
  if (!gender || !number) {
    // Infer from a single unambiguous cell skill (skip when two cells are present).
    const cellSkills = entry.skills.filter((s) =>
      s === 'agreement:fem-sing' ||
      s === 'agreement:fem-plural' ||
      s === 'agreement:masc-sing' ||
      s === 'agreement:masc-plural',
    )
    if (cellSkills.length === 1) {
      const cell = cellSkills[0]
      if (!gender) gender = cell.includes('fem') ? 'f' : 'm'
      if (!number) number = cell.includes('plural') ? 'plural' : 'singular'
    }
  }
  const badges: string[] = []
  if (gender) badges.push(gender === 'f' ? 'Femenino' : 'Masculino')
  if (number) badges.push(number === 'singular' ? 'Singular' : 'Plural')
  // Mixed-cell entries (no single gender/number) get the generic Ex2 topic.
  const topic =
    gender && number
      ? `agreement:${gender === 'f' ? 'fem' : 'masc'}-${number === 'singular' ? 'sing' : 'plural'}`
      : 'agreement:mixed'
  return { topic, badges }
}

function agreementToItems(entry: AgreementEntry): Item[] {
  const parts = entry.phrase.split('_')
  const { topic, badges } = agreementCell(entry)
  // Render the phrase with the single-blank token `____` at each blank, so the unified
  // card anatomy (promptView/lineSegments) splits it into blank slots in CHOICE mode.
  // The TYPE-mode multi-blank renderer reads `prompt.parts`/`prompt.blanks` instead.
  const promptText = parts.join(BLANK)
  badges.push('Concordancia')
  return [
    {
      // Entry ids already carry the `agreement:` namespace (e.g. "agreement:exam-1").
      id: entry.id,
      kind: 'agreement',
      topic,
      prompt: { text: promptText, badges, parts, blanks: entry.answers },
      // The answer is the fully-corrected phrase (single readable string).
      answer: fillAgreement(parts, entry.answers),
      gloss: entry.gloss,
      skills: entry.skills.length ? entry.skills : ['agreement'],
      unit: entry.unit,
      examWeight: entry.examWeight ?? 2,
      source: entry.source,
      tags: ['rule:agreement'],
    },
  ]
}

/* ── Public API ─────────────────────────────────────────────────────────────── */

/**
 * Expand the whole catalog into a flat, de-duplicated Item list.
 * Throws on a duplicate id or an empty answer (a content bug we want to catch early).
 * Agreement entries (Ex2 multi-blank) emit one Item each (kind:'agreement'); their
 * TYPE-mode renderer reads prompt.parts/prompt.blanks, CHOICE mode uses full phrases.
 */
export function buildItems(catalog: Catalog): Item[] {
  const items: Item[] = [
    ...catalog.nouns.flatMap(nounToItems),
    ...catalog.verbs.flatMap(verbToItems),
    ...numbersToItems(catalog.numbers),
    ...catalog.vocab.flatMap(vocabToItems),
    ...catalog.pronouns.flatMap(pronounToItems),
    ...catalog.sentences.flatMap(sentenceToItems),
    ...catalog.agreement.flatMap(agreementToItems),
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

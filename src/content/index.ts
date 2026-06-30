/**
 * content/index.ts — assembles every authored content module into one Catalog and
 * runs a pure, framework-agnostic validation pass. This file is the ONLY content
 * module the rest of the app imports; it never imports engine/ or lib/.
 */
import type { Catalog, ExplanationRule, NumberRange } from '../types'
import { PERSONS } from '../types'
import { nouns, explanationRules as articleRules } from './articles'
import { verbs } from './verbs'
import { vocab } from './vocab'
import { pronouns } from './pronouns'
import { sentences } from './sentences'
import { lessons } from './lessons'
import { deixis } from './deixis'
import { times } from './time'
import { functional } from './functional'
import { agreement } from './agreement'

/**
 * Number coverage for Phase 1A (the generator in engine/numbers.ts produces the words):
 *  - cardinals 1–30 (intro/Unità 1) and the tens to 90,
 *  - the exact exam numbers (5, 16, 27, 38, 100) boosted to examWeight 3,
 *  - ordinals 1°–10° (Unità 2).
 * Overlaps are fine — engine/items.ts merges them (max examWeight, min unit).
 */
const numbers: NumberRange[] = [
  { id: 'card-1-30', kind: 'cardinal', from: 1, to: 30, unit: 0, examWeight: 1 },
  { id: 'card-tens', kind: 'cardinal', from: 0, to: 90, only: [40, 50, 60, 70, 80, 90], unit: 1, examWeight: 1 },
  { id: 'card-exam', kind: 'cardinal', from: 0, to: 100, only: [5, 16, 27, 38, 100], unit: 1, examWeight: 3 },
  // Compuestos que ejercitan elisión (…antuno/…antotto) y el acento de -tré (brief §7).
  { id: 'card-elision', kind: 'cardinal', from: 0, to: 99, only: [21, 28, 23, 38, 41, 48, 53, 68, 71, 73, 88, 91, 93], unit: 1, examWeight: 1 },
  // Centenas y compuestos de tres cifras (cento invariable, elisión de cento).
  { id: 'card-hundreds', kind: 'cardinal', from: 0, to: 999, only: [100, 101, 108, 180, 200, 259, 312, 467, 673], unit: 2, examWeight: 1 },
  // Miles, -mila y años emblemáticos (mille…/duemila).
  { id: 'card-thousands', kind: 'cardinal', from: 0, to: 2000, only: [1000, 1492, 1988, 2000], unit: 2, examWeight: 1 },
  { id: 'ord-1-10', kind: 'ordinal', from: 1, to: 10, unit: 2, examWeight: 1 },
  // Ordinales regulares en -esimo a partir de 11 (brief §8).
  { id: 'ord-11-30', kind: 'ordinal', from: 11, to: 30, unit: 2, examWeight: 1 },
]

export const catalog: Catalog = {
  nouns,
  verbs,
  numbers,
  vocab,
  agreement,
  // Frases del examen + lecciones temáticas nuevas (§1/§4/§5/§6/§9/§10/§11).
  sentences: [...sentences, ...lessons, ...deixis, ...times, ...functional],
  pronouns,
}

/** Grammar explanations shown in feedback — article rules (from data.js) + number rules. */
const numberRules: Record<string, ExplanationRule> = {
  number_elision: {
    title: 'Excepción (elisión)',
    text: 'Antes de **uno** y **otto** se elide la vocal final de la decena: 21 = **ventuno** (no ventiuno), 68 = **sessantotto** (no sessantaotto).',
  },
}

const verbRules: Record<string, ExplanationRule> = {
  verb_modal: {
    title: 'Verbo modal',
    text: 'Los modales **potere** (poder), **volere** (querer) y **dovere** (deber) van seguidos de un **infinitivo**: *devo studiare*, *non posso uscire*. Solo se conjuga el modal; el 2.º verbo queda en infinitivo (*vogliono suonare*, no «vogliono suonano»).',
  },
  verb_irregular: {
    title: 'Verbo irregular',
    text: 'No sigue el patrón regular: la raíz cambia y hay que **memorizar** las formas (p. ej. *fare → faccio, fai, fa…*). Familia **-go/-gono** en io/loro: *vengo/vengono, tengo/tengono, rimango/rimangono, salgo/salgono*.',
  },
  verb_isc: {
    title: 'Verbo en -isc-',
    text: 'Algunos verbos en **-ire** insertan **-isc-** en io/tu/lui/loro: *finire → finisco, finisci, finisce, finiscono* (noi/voi regulares: finiamo, finite).',
  },
  verb_spelling_h: {
    title: 'Ortografía: la -h- de -care/-gare',
    text: 'Los verbos en **-care/-gare** añaden una **-h-** en *tu* y *noi* para conservar el sonido duro: *giocare → giochi, giochiamo*; *pagare → paghi, paghiamo*. NO aparece en io/lui/loro (*gioco, gioca, giocano*).',
  },
  verb_spelling_i: {
    title: 'Ortografía: -ciare/-giare',
    text: 'Los verbos en **-ciare/-giare** **no** duplican la i: *cominciare → tu cominci* (no «comincii»); *mangiare → mangi, mangiamo*.',
  },
}

const lexRules: Record<string, ExplanationRule> = {
  lex_prendere: {
    title: 'prendere (tomar/agarrar)',
    text: '*prendere* = tomar/agarrar: un objeto, transporte (*prendo il treno*), comida/bebida (*prendo un caffè*) o una decisión (*prendere una decisione*). Participio irregular: **preso** (no «prenduto»).',
  },
}

const pronounRules: Record<string, ExplanationRule> = {
  pron_voi_loro: {
    title: 'voi vs loro (y noi)',
    text: '**voi** = les hablas a ELLOS; **loro** = hablas DE ellos. «X y yo» = **noi**; «tú y X» = **voi**. Ojo: en español de México «ustedes» se usa para ambos, pero el italiano los separa.',
  },
  pron_group: {
    title: 'Nombres colectivos',
    text: 'Un colectivo singular concuerda en 3.ª **singular**: *la classe comincia*. Pero **tutti** = *loro* (3.ª plural): *tutti vogliono*. Decide por el sustantivo, no por la idea de «varios».',
  },
  pron_courtesy: {
    title: 'Cortesía: Lei',
    text: '**Lei** = «usted», siempre en **3.ª persona singular**: *Lei di dov\'è?* Igual que «usted» en español (también 3.ª singular).',
  },
}

const motionRules: Record<string, ExplanationRule> = {
  deixis_motion: {
    title: 'andare / venire / uscire',
    text: '**andare** = ir (a un tercer lugar). **venire** = venir (hacia donde está el hablante/oyente: *vengo a casa tua*, *venite con noi*). **uscire** = salir (de un espacio cerrado o salir a divertirse). Pregunta clave: ¿el destino es donde estás tú/nosotros? Sí → venire.',
  },
}

const timeRules: Record<string, ExplanationRule> = {
  tell_time_copula: {
    title: 'è vs sono le',
    text: 'Se usa **è** con *l\'una*, *mezzogiorno* y *mezzanotte*; para las demás horas, **sono le**: *sono le tre*. (En español: «es la una» vs «son las dos».)',
  },
  tell_time_fractions: {
    title: 'Cuartos y media',
    text: '**un quarto** = 15, **mezzo/mezza** = 30, **meno un quarto** = 45. Cerca de la hora siguiente se usa *meno*: *le otto meno un quarto* = 7:45.',
  },
}

const functionalRules: Record<string, ExplanationRule> = {
  functional_reply: {
    title: 'Aceptar / rechazar / proponer',
    text: 'Aceptar: *Volentieri!*, *Buona idea!*, *D\'accordo*. Rechazar (cortés): *Mi dispiace*, *Non posso*, *Ho già un impegno*, *Magari la prossima volta*. Proponer: *Che ne dici di…?*, *Perché non…?* La cláusula que sigue decide cuál encaja.',
  },
}

const agreementRules: Record<string, ExplanationRule> = {
  agreement: {
    title: 'Concordancia (género y número)',
    text: 'El adjetivo copia el **género** y el **número** del nombre. Clase **-o/-a**: -o/-i (masc.), -a/-e (fem.); clase **-e**: -e → -i (ambos géneros). Ej.: *le sorelle felici*.',
  },
}

export const explanationRules: Record<string, ExplanationRule> = {
  ...articleRules,
  ...numberRules,
  ...verbRules,
  ...lexRules,
  ...pronounRules,
  ...motionRules,
  ...timeRules,
  ...functionalRules,
  ...agreementRules,
}

/* ── Pure validation (no engine dependency) ─────────────────────────────────── */

/**
 * Sanity-check the catalog at module load. Throws on a structural content bug:
 *  - a verb tense table missing one of the six persons,
 *  - a number range with from > to,
 *  - an empty noun/vocab surface form,
 *  - duplicate entry ids within any single entry array (cross-array reuse is allowed),
 *  - empty/whitespace-only strings in any accept[] array,
 *  - number range bounds or only[] values outside the engine's supported range
 *    (cardinals: [0, 2000]; ordinals: [1, 2000]),
 *  - agreement entries with phrase/answers length mismatch or empty answers,
 *  - sentence/exam entries missing a non-empty answer or having empty accept strings.
 */
export function validateCatalog(cat: Catalog): void {
  // ── 1. Existing checks ──────────────────────────────────────────────────────

  for (const verb of cat.verbs) {
    for (const [tense, table] of Object.entries(verb.tenses)) {
      if (!table) continue
      for (const person of PERSONS) {
        const form = table[person]
        if (!form || !form.trim()) {
          throw new Error(`validateCatalog: verb "${verb.infinitive}" ${tense} is missing person "${person}"`)
        }
      }
    }
  }
  for (const range of cat.numbers) {
    if (!range.only && range.from > range.to) {
      throw new Error(`validateCatalog: number range "${range.id}" has from > to`)
    }
  }
  for (const noun of cat.nouns) {
    if (!noun.singular.trim() || !noun.plural.trim()) {
      throw new Error(`validateCatalog: noun "${noun.id}" has an empty surface form`)
    }
  }

  // ── 2. Unique entry-level ids WITHIN each entry array ───────────────────────
  // Cross-array id reuse is LEGITIMATE: e.g. "mano" is both an article noun and a
  // body-part vocab term. The generators namespace item ids by kind (article:…,
  // vocab:body:…), and engine/items.ts already guarantees globally-unique ITEM ids.
  // What we catch here is a duplicate SOURCE entry inside the same array — the real
  // authoring mistake (e.g. two "mano" nouns, where one would silently overwrite).
  {
    const arrays: Array<[string, Array<{ id: string }>]> = [
      ['nouns', cat.nouns],
      ['verbs', cat.verbs],
      ['numbers', cat.numbers],
      ['vocab', cat.vocab],
      ['agreement', cat.agreement],
      ['sentences', cat.sentences],
      ['pronouns', cat.pronouns],
    ]
    for (const [arrayName, entries] of arrays) {
      const seen = new Set<string>()
      for (const entry of entries) {
        if (seen.has(entry.id)) {
          throw new Error(
            `validateCatalog: duplicate entry id "${entry.id}" within "${arrayName}"`,
          )
        }
        seen.add(entry.id)
      }
    }
  }

  // ── 3. No empty/whitespace-only strings in accept[] arrays ──────────────────
  // Pronouns
  for (const pronoun of cat.pronouns) {
    if (pronoun.accept) {
      for (const alt of pronoun.accept) {
        if (!alt || !alt.trim()) {
          throw new Error(
            `validateCatalog: pronoun "${pronoun.id}" has an empty/whitespace string in accept[]`,
          )
        }
      }
    }
  }
  // Sentences (includes all sentence arrays merged into cat.sentences)
  for (const sentence of cat.sentences) {
    if (sentence.accept) {
      for (const alt of sentence.accept) {
        if (!alt || !alt.trim()) {
          throw new Error(
            `validateCatalog: sentence "${sentence.id}" has an empty/whitespace string in accept[]`,
          )
        }
      }
    }
  }

  // ── 4. Number range scope sanity ────────────────────────────────────────────
  // engine/numbers.ts supports cardinals [0, 2000] and ordinals [1, 2000].
  const CARDINAL_MIN = 0
  const CARDINAL_MAX = 2000
  const ORDINAL_MIN = 1
  const ORDINAL_MAX = 2000
  for (const range of cat.numbers) {
    const min = range.kind === 'cardinal' ? CARDINAL_MIN : ORDINAL_MIN
    const max = range.kind === 'cardinal' ? CARDINAL_MAX : ORDINAL_MAX
    if (range.from < min || range.from > max) {
      throw new Error(
        `validateCatalog: number range "${range.id}" (${range.kind}) has from=${range.from} outside [${min}, ${max}]`,
      )
    }
    if (range.to < min || range.to > max) {
      throw new Error(
        `validateCatalog: number range "${range.id}" (${range.kind}) has to=${range.to} outside [${min}, ${max}]`,
      )
    }
    if (range.only) {
      for (const val of range.only) {
        if (val < min || val > max) {
          throw new Error(
            `validateCatalog: number range "${range.id}" (${range.kind}) has only value ${val} outside [${min}, ${max}]`,
          )
        }
      }
    }
  }

  // ── 5. Agreement entry invariants ───────────────────────────────────────────
  // phrase.split('_').length must equal answers.length + 1; answers must be non-empty.
  // Passes trivially when agreement is [].
  for (const entry of cat.agreement) {
    if (!entry.answers || entry.answers.length === 0) {
      throw new Error(
        `validateCatalog: agreement entry "${entry.id}" has an empty answers[]`,
      )
    }
    for (const ans of entry.answers) {
      if (!ans || !ans.trim()) {
        throw new Error(
          `validateCatalog: agreement entry "${entry.id}" has an empty/whitespace string in answers[]`,
        )
      }
    }
    const blankCount = entry.phrase.split('_').length - 1
    if (blankCount !== entry.answers.length) {
      throw new Error(
        `validateCatalog: agreement entry "${entry.id}" has ${blankCount} blank(s) in phrase but ${entry.answers.length} answer(s) — expected phrase.split('_').length === answers.length + 1`,
      )
    }
  }

  // ── 6. Sentence/exam entries: non-empty answer (and non-empty accept strings) ─
  // (accept[] emptiness is already covered by check #3 above; this covers the answer field)
  for (const sentence of cat.sentences) {
    if (!sentence.answer || !sentence.answer.trim()) {
      throw new Error(
        `validateCatalog: sentence "${sentence.id}" has an empty/missing answer`,
      )
    }
  }
}

// Validate eagerly so content bugs surface at startup, not mid-session.
validateCatalog(catalog)

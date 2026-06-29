/**
 * types.ts — the shared contract for Articoli Italiano.
 *
 * Design principle (the project's top priority):
 *   CONTENT declares curriculum facts (entry types below).
 *   The ENGINE expands entries into atomic practice ITEMS (one Item == one unit of
 *   practice AND one unit of mastery, keyed by `Item.id`).
 *   RENDERERS consume Items by `kind` without knowing the source.
 *
 * Boundaries:
 *   - `content/**` imports ONLY from this file. It never imports engine/ or lib/.
 *   - `engine/**` imports from this file (and other engine modules). Framework-agnostic.
 *   - `lib/**` (Svelte) imports from this file and engine/.
 *
 * Type-safety intent: the primitive string unions below (ArticleValue, Person,
 * VerbClass, …) make the compiler flag conjugation-table typos, invalid article
 * values, and missing persons AS CONTENT IS AUTHORED.
 *
 * Module/TS notes for every consumer:
 *   - Import types with `import type { … } from '../types'` (verbatimModuleSyntax).
 *   - No runtime enums — these are all `type` aliases / `interface`s (isolatedModules).
 *
 * The FULL progress shape (ItemProgress / SkillProgress / ProgressStore) is defined
 * now, in Phase 1A, even though 1A only exercises a subset of the fields — so Phase 2
 * needs no storage migration.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * 1. Primitive grammatical unions
 * ──────────────────────────────────────────────────────────────────────────── */

/** The six conventional present-tense persons. `lui` stands in for lui / lei / Lei. */
export type Person = 'io' | 'tu' | 'lui' | 'noi' | 'voi' | 'loro';

/** Stable ordering for the six persons; use when iterating tables deterministically. */
export const PERSONS: readonly Person[] = ['io', 'tu', 'lui', 'noi', 'voi', 'loro'];

export type Gender = 'm' | 'f';

export type GrammaticalNumber = 'singular' | 'plural';

/** Italian definite articles (exam Ex1). */
export type DefiniteArticle = 'il' | 'lo' | 'la' | "l'" | 'i' | 'gli' | 'le';

/** Italian indefinite articles (exam Ex5, assumed). */
export type IndefiniteArticle = 'un' | 'uno' | 'una' | "un'";

/**
 * Verb conjugation classes. The `tenses` map on a VerbEntry is the extension point:
 * future tenses are NEW KEYS in that map — no engine change, no new class needed.
 */
export type VerbClass =
  | 'are' // regular -are
  | 'ere' // regular -ere
  | 'ire' // regular -ire (non-isc)
  | 'ire-isc' // -ire with -isc- infix (finire, capire, …)
  | 'irregular' // andare, venire, fare, …
  | 'modal' // potere, volere, dovere
  | 'essere' // the copula (its own class for skill tagging)
  | 'avere'; // the auxiliary (its own class for skill tagging)

/** Present indicative is the only tense in 1A; the union grows with the curriculum. */
export type Tense = 'presente';

/* ────────────────────────────────────────────────────────────────────────────
 * 2. Item kinds (one renderer per kind; in 1A every kind is a typed blank)
 * ──────────────────────────────────────────────────────────────────────────── */

export type ItemKind =
  | 'verb-conjugation' // Ex4 — infinitive given, type the conjugated form
  | 'essere-avere' // Ex3 — essere OR avere in context (verb NOT given)
  | 'article' // Ex1 (definite) + Ex5 (indefinite) — type the article
  | 'agreement' // Ex2 — gender/number endings, multi-blank (Phase 1B)
  | 'number' // Ex6 — numeral shown, type the Italian word
  | 'vocab' // Ex7 — gloss/image cue, type the Italian word
  | 'pronoun' // subject-pronoun drill (supports the verb lane)
  | 'verb-choice' // deixis: choose+conjugate the right motion verb (lemma NOT given)
  | 'tell-time' // "che ore sono?" — clock shown, produce the Italian time phrase
  | 'functional-choice'; // pragmatics: pick the coherent reply (always multiple-choice)

/* ────────────────────────────────────────────────────────────────────────────
 * 3. The generic Item (unit of practice AND of mastery)
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The prompt a renderer shows. `text` is required for every kind; the rest are
 * optional cues. The single-blank placeholder token inside `text` is `BLANK`
 * (see the exported constant) — renderers split on it and drop the input there.
 */
export interface ItemPrompt {
  /** Sentence or cue containing the blank token `____`, e.g. "Io ____ colazione." */
  text: string;
  /** Parenthetical lemma cue shown like the exam, e.g. "fare" → "(fare)". */
  lemma?: string;
  /** Subject-pronoun cue for the verb lanes, e.g. "io". */
  person?: Person;
  /** Large numeral to display for number items, e.g. 27. */
  figure?: number;
  /** Optional image path (vocab/body diagram) resolved from /public or an import. */
  image?: string;
  /** Optional secondary hint line under the prompt. */
  hint?: string;
  /** Short display chips shown on the stage, e.g. ["Irregular"] or ["Determinado","Plural"]. */
  badges?: string[];
  /** Input placeholder hint, e.g. the candidate articles "un · uno · una · un'". */
  placeholder?: string;
}

/** How the current item is presented: easy multiple-choice, or free typing ("real"). */
export type PresentationMode = 'choice' | 'type';

/**
 * The presentation decision for an item, derived from its OWN per-item level:
 *   level 0–1 → { input:'choice', gloss:true }  (learning: MC + Spanish meaning)
 *   level 2   → { input:'type',   gloss:false }  (mastered: free typing, Italian-only)
 */
export interface PresentationStage {
  input: PresentationMode;
  gloss: boolean;
}

/**
 * One atomic practice item. `id` is the stable mastery key — never reuse an id for
 * different content. `answer` is the canonical (accented) form; `accept` lists extra
 * exact spellings. Accent-tolerant matching is the validator's job, NOT the content's
 * (do not pre-list unaccented variants in `accept`).
 */
export interface Item {
  /** Stable unique id, e.g. "verb:presente:fare:io", "article:def:studente:sing". */
  id: string;
  kind: ItemKind;
  /**
   * Pedagogical grouping for the two-level scheduler (the "tutor"). Items in the
   * same topic form one mini-lesson / SRS group, e.g. "verb:fare", "article:s_consonant",
   * "num:tens", "vocab:body", "pronoun", "exam".
   */
  topic: string;
  prompt: ItemPrompt;
  /** Canonical correct answer, fully accented. */
  answer: string;
  /** Additional accepted spellings (genuine alternates only — not accent variants). */
  accept?: string[];
  /** Small ES-MX gloss shown as an immersive hint. */
  gloss?: string;
  /** Full ES-MX sentence translation, shown alongside `gloss` when `gloss` is only a
   *  partial cue (e.g. an idiom). */
  translation?: string;
  /** Skill-bucket ids this item rolls up into (see SkillId examples). */
  skills: string[];
  /** Source unit for recency weighting (intro = 0, Unità 1 = 1, Unità 2 = 2, …). */
  unit: number;
  /** Exam priority: 0 = not on the sample exam; higher = more exam weight. */
  examWeight: number;
  /** Provenance breadcrumbs, e.g. ["LS p.32", "exam:e4.1"]. */
  source?: string[];
  /** Free-form tags for filtering / focused modes. */
  tags?: string[];
}

/* ────────────────────────────────────────────────────────────────────────────
 * 4. Answer results, validation
 * ──────────────────────────────────────────────────────────────────────────── */

/** Outcome of a single answer, as recorded in progress. */
export type AnswerResult = 'correct' | 'near' | 'wrong' | 'timeout' | 'dontKnow';

/** The status the validator returns for a typed answer. */
export type ValidationStatus = 'correct' | 'near' | 'wrong';

/**
 * Result of accent-tolerant validation.
 *  - 'correct' : exact match after normalization (case/space/apostrophe).
 *  - 'near'    : matches EXCEPT for missing/extra accents → "casi correcto";
 *                counts as correct for progression but surfaces the accented form.
 *  - 'wrong'   : anything else.
 */
export interface ValidationResult {
  status: ValidationStatus;
  /** The user's input after normalization (trim/case/space/apostrophe). */
  normalized: string;
  /** The canonical accented answer that was matched against (or the closest). */
  expected: string;
  /** Optional ES-MX micro-message, e.g. "Casi correcto: lleva acento → è". */
  message?: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 5. Per-item progress (FULL shape — defined now to avoid later migration)
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Per-item mastery/SRS state, keyed by `Item.id` in `ProgressStore.items`.
 * Phase 1A actively maintains: seen/correct/wrong, mastery, streak, recentLapses,
 * lastResult, lastSeen, averageResponseMs, difficulty. The SM-2-style `stability`
 * and `due` fields exist now but are only fully driven in Phase 2.
 */
export interface ItemProgress {
  seen: number;
  correct: number;
  wrong: number;
  /** 0–1 confidence. New items start ~0.2. */
  mastery: number;
  /** ~0.5–2.0. Irregular verbs & article exceptions start higher. */
  difficulty: number;
  /** Days-until-review estimate (SM-2-style). Phase 2 drives this. */
  stability: number;
  /** Consecutive correct answers; resets to 0 on any lapse. */
  streak: number;
  /** Rolling count of recent wrong/timeout/dontKnow lapses. */
  recentLapses: number;
  /** Per-item presentation level: 0–1 = MC + Spanish gloss, 2 = free typing. */
  level: number;
  /** Consecutive misses on THIS item (resets on any success); 2 → demote one level. */
  consecutiveMisses: number;
  /**
   * True while this item is "skill-primed": it skipped (or short-cut) the MC ladder
   * at creation because its governing rule was already mastered (engine/priming.ts).
   * Cleared on the FIRST answer — a success confirms the prime; a miss disproves it
   * and drops the item straight back to the MC ladder. Absent on legacy records.
   */
  primed?: boolean;
  lastResult: AnswerResult | null;
  /** Epoch ms of the last time this item was shown. */
  lastSeen: number | null;
  /** Epoch ms when this item is next due (Phase 2). */
  due: number | null;
  /** Exponential moving average of response time in ms (speed → confidence). */
  averageResponseMs: number | null;
  /** Denormalized copy of the item's skill ids (for rollup without the catalog). */
  skillIds: string[];
}

/** Aggregate mastery for one skill bucket, keyed by SkillId in `ProgressStore.skills`. */
export interface SkillProgress {
  seen: number;
  correct: number;
  wrong: number;
  /** 0–1 aggregate mastery for the dashboard and weak-area weighting. */
  mastery: number;
}

/**
 * Skill-bucket id. Free-form string by contract, but follow these conventions so
 * the dashboard can group them, e.g.:
 *   "verb:fare", "tense:presente", "person:io", "class:irregular", "class:isc",
 *   "class:modal", "essere", "avere",
 *   "article:def", "article:indef", "article:lo", "article:gli",
 *   "agreement:fem-sing", "agreement:fem-plural",
 *   "number:cardinal", "number:tens", "vocab:body", "pronoun".
 */
export type SkillId = string;

/* ────────────────────────────────────────────────────────────────────────────
 * 6. Sessions, settings, and the versioned persistence payload
 * ──────────────────────────────────────────────────────────────────────────── */

/** Practice modes. 1A ships "mixed" + focused single-lane; "exam-drill" lands in 1B. */
export type PracticeMode =
  | 'mixed'
  | 'verbs'
  | 'articles'
  | 'numbers'
  | 'vocab'
  | 'time'
  | 'functional'
  | 'exam-drill';

export interface Settings {
  timerEnabled: boolean;
  /** Seconds per item when the timer is on. */
  timeLimit: number;
  mode: PracticeMode;
  /** Show the small ES-MX gloss as a hint. */
  showGloss: boolean;
  /** Adaptive assist: new/weak items appear as multiple-choice, graduating to typing. */
  assist: boolean;
  /**
   * Skill-primed graduation: a NEW item whose governing rule is already mastered (and
   * that is not an exception) starts at free-typing instead of re-grinding the MC
   * ladder from zero. Only meaningful while `assist` is on. Default on; a kill-switch
   * for the cautious (e.g. right before an exam). Absent on legacy stores → defaults on.
   */
  skillPrimedGraduation: boolean;
  /**
   * Underline the stressed syllable (sílaba tónica) of 3+ syllable Italian words
   * on prompt cards — the hero word and multiple-choice options — as a
   * pronunciation aid. Default on; the sidebar conjugation cheat-sheet always
   * shows its stress mark regardless. Absent on legacy stores → defaults on.
   */
  tonicStress: boolean;
  /**
   * OPTIONAL exam date as an ISO yyyy-mm-dd string, or null when unset (the default).
   * When set, the scheduler ramps the blend toward review/coverage as the date nears.
   * Never hardcode a date anywhere — this is purely a user-set knob.
   */
  examDate: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  timerEnabled: false,
  timeLimit: 20,
  mode: 'mixed',
  showGloss: true,
  assist: true,
  skillPrimedGraduation: true,
  tonicStress: true,
  examDate: null,
};

/** A finished round, appended to history for trend/`Summary` views. */
export interface SessionRecord {
  /** Epoch ms when the round ended. */
  endedAt: number;
  mode: PracticeMode;
  answered: number;
  correct: number;
  near: number;
  /** Per-skill mistakes, e.g. { "class:irregular": 3 }. */
  mistakesBySkill: Record<SkillId, number>;
}

/**
 * The complete persisted payload (also the export/import shape). Stored under
 * localStorage key `articoli-progreso-v1`. `schemaVersion` gates future migrations;
 * `items`/`skills` are keyed by Item.id / SkillId.
 */
export interface ProgressStore {
  appVersion: string;
  schemaVersion: number;
  /** Epoch ms; set on export, null while live. */
  exportedAt: number | null;
  /** Course identifier, e.g. "npi-1" (Nuovissimo Progetto Italiano 1). */
  courseId: string;
  items: Record<string, ItemProgress>;
  skills: Record<SkillId, SkillProgress>;
  settings: Settings;
  history: SessionRecord[];
}

/** Schema version for `ProgressStore`. Bump + migrate when the shape changes. */
export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'articoli-progreso-v1';
/**
 * Isolated key used ONLY in automated-testing mode (`?claude-test`). Keeping it
 * separate guarantees a test run can never read or overwrite the real progress
 * under STORAGE_KEY. See engine/testMode.ts.
 */
export const TEST_STORAGE_KEY = 'articoli-progreso-test-v1';
/** Legacy key from the original article-only app, read once for seed migration. */
export const LEGACY_STORAGE_KEY = 'articoli-italiano-stats-v3';
export const COURSE_ID = 'npi-1';

/* ────────────────────────────────────────────────────────────────────────────
 * 7. Authored content entry types (each expands → Item[] via engine/items.ts)
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Noun / article entry (extends the legacy 147-noun dataset).
 * Generates: article:def:<id>:sing|plur, article:indef:<id>:sing,
 * and feeds the agreement / plural-transform lanes later.
 */
export interface NounEntry {
  /** Stable slug, e.g. "studente". */
  id: string;
  /** ES-MX gloss, e.g. "estudiante". */
  gloss: string;
  gender: Gender;
  /** Singular surface form, e.g. "studente". */
  singular: string;
  /** Plural surface form, e.g. "studenti". */
  plural: string;
  definite: { singular: DefiniteArticle; plural: DefiniteArticle };
  /** Indefinite is singular-only in Italian. Optional for invariable/odd cases. */
  indefinite?: { singular: IndefiniteArticle };
  /** Explanation-rule key (see ExplanationRule map), e.g. "s_consonant". */
  rule?: string;
  unit: number;
  examWeight?: number;
  tags?: string[];
}

/** A full six-person conjugation for one tense. */
export type Conjugation = Record<Person, string>;

/**
 * Verb entry. The `tenses` map is the extension point — add `passato`, `futuro`, …
 * as new keys with no engine change. Generates verb:<tense>:<infinitive>:<person>.
 */
export interface VerbEntry {
  /** Usually the infinitive, e.g. "fare". */
  id: string;
  infinitive: string;
  gloss: string;
  class: VerbClass;
  tenses: Partial<Record<Tense, Conjugation>>;
  /** True for potere/volere/dovere (rendered "(potere) + infinito"). */
  modal?: boolean;
  unit: number;
  examWeight?: number;
  tags?: string[];
}

/**
 * Numbers are GENERATED, not hand-listed. A range marks an in-scope band per unit;
 * `only` optionally restricts to specific values (e.g. the exact exam numbers).
 * Generates number:card:<n> / number:ord:<n> through engine/numbers.ts.
 */
export interface NumberRange {
  id: string;
  kind: 'cardinal' | 'ordinal';
  from: number;
  to: number;
  /** If set, only these values in [from,to] are emitted (e.g. exam: [5,16,27,38,100]). */
  only?: number[];
  unit: number;
  examWeight?: number;
}

/**
 * Vocabulary recall entry (body parts now; house/transport/days later).
 * Generates vocab:<category>:<id> — gloss/image cue → type the Italian term.
 */
export interface VocabEntry {
  /** Stable slug, e.g. "naso". */
  id: string;
  /** Italian term = the answer, e.g. "naso". */
  term: string;
  gloss: string;
  /** Category bucket, e.g. "body" | "house" | "transport" | "days". */
  category: string;
  gender?: Gender;
  article?: DefiniteArticle;
  plural?: string;
  image?: string;
  unit: number;
  examWeight?: number;
}

/**
 * Agreement / endings entry (exam Ex2). Multi-blank: `phrase` marks each blank with
 * a single `_`, and `answers` gives the letters in order, e.g.
 *   phrase: "l'amic_ messican_ di Laura", answers: ["a", "a"].
 * The multi-blank renderer is Phase 1B; the type is defined now.
 */
export interface AgreementEntry {
  id: string;
  phrase: string;
  answers: string[];
  gloss?: string;
  skills: SkillId[];
  unit: number;
  examWeight?: number;
  source?: string[];
}

/**
 * Sentence-prompt entry — reproduces an EXACT exam sentence (highest value).
 * `kind` selects the renderer/skill family; the blank inside `text` is `____`.
 *   { kind:"verb-conjugation", text:"Io ____ colazione… ", lemma:"fare",
 *     person:"io", answer:"faccio", source:["exam:e4.1"] }
 */
export interface SentenceEntry {
  id: string;
  kind: ItemKind;
  text: string;
  /** Canonical accented answer. */
  answer: string;
  accept?: string[];
  lemma?: string;
  person?: Person;
  gloss?: string;
  /** Full ES-MX translation of the whole sentence. Use ONLY when `gloss` carries a
   *  partial cue (e.g. an idiom: "avere fame = tener hambre") rather than the full
   *  sentence meaning — the two then show as separate lines. */
  translation?: string;
  /** Extra skills beyond what the generator infers from kind/lemma/person. */
  skills?: SkillId[];
  /** Free-form tags carried onto the item, e.g. ["rule:verb_spelling_h"] for feedback. */
  tags?: string[];
  unit: number;
  examWeight?: number;
  source?: string[];
}

/** Subject-pronoun drill entry (gloss → type the Italian pronoun). */
export interface PronounEntry {
  /** Stable slug, e.g. "io", "lui-lei-lei". */
  id: string;
  person: Person;
  /** Surface form(s); the canonical answer. For lui/lei/Lei use the primary form. */
  pronoun: string;
  /** Additional accepted forms, e.g. ["lei", "Lei"] for the 3rd person. */
  accept?: string[];
  gloss: string;
  unit: number;
  examWeight?: number;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 8. The assembled, runtime-validated catalog
 * ──────────────────────────────────────────────────────────────────────────── */

/** Everything content/index.ts assembles; engine/items.ts expands it into Items. */
export interface Catalog {
  nouns: NounEntry[];
  verbs: VerbEntry[];
  numbers: NumberRange[];
  vocab: VocabEntry[];
  agreement: AgreementEntry[];
  sentences: SentenceEntry[];
  pronouns: PronounEntry[];
}

/** A grammar explanation shown in feedback (ported from the legacy EXPLANATION_RULES). */
export interface ExplanationRule {
  title: string;
  text: string;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 9. Shared constants
 * ──────────────────────────────────────────────────────────────────────────── */

/** The single-blank placeholder token used inside ItemPrompt.text / SentenceEntry.text. */
export const BLANK = '____';

/** App version string surfaced in the export payload. */
export const APP_VERSION = '0.1.0';

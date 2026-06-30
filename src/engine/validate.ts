/**
 * engine/validate.ts — accent-tolerant answer checking for typed Italian answers.
 *
 * Framework-agnostic, pure TypeScript. The only outward dependency is the
 * `ValidationResult` shape from the shared contract.
 *
 * Policy (see types.ts §4):
 *  - 'correct' : exact match after normalization (case / whitespace / apostrophe).
 *  - 'near'    : "casi correcto" — matches EXCEPT for a missing or extra accent.
 *                Counts as correct for progression, but surfaces the accented form
 *                so the learner internalizes the diacritic.
 *  - 'wrong'   : any other spelling difference.
 *
 * Accent tolerance is deliberately ONLY about diacritics. Two tokens that differ
 * by anything else (a letter, an apostrophe placement that normalization didn't
 * already unify, etc.) are wrong.
 */

import type { ValidationResult } from '../types';

/**
 * Map of Italian accented vowels → their bare counterpart. Used by `fold` as a
 * belt-and-suspenders pass alongside Unicode NFD decomposition, so precomposed
 * characters are folded even if a runtime's NFD support is incomplete.
 */
const ACCENT_FOLD: Readonly<Record<string, string>> = {
  à: 'a',
  è: 'e',
  é: 'e',
  ì: 'i',
  í: 'i',
  î: 'i',
  ò: 'o',
  ó: 'o',
  ù: 'u',
  ú: 'u',
};

/** Matches any combining diacritical mark (Unicode block U+0300–U+036F). */
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Matches one or more whitespace characters (used to collapse internal runs). */
const WHITESPACE_RUN = /\s+/g;

/**
 * Matches any apostrophe-like character: typographic right/left single quotes,
 * the acute/grave standalone accents commonly typed for apostrophes, and the
 * straight ASCII apostrophe itself.
 */
const APOSTROPHE_VARIANTS = /[’‘´`']/g;

/** Removes whitespace that immediately follows an apostrophe, e.g. "l' amico" → "l'amico". */
const SPACE_AFTER_APOSTROPHE = /'\s+/g;

/**
 * Produce the faithful normalized form of an answer string.
 *
 * Steps, in order:
 *  1. trim leading/trailing whitespace;
 *  2. lowercase;
 *  3. unify all apostrophe variants (’ ‘ ´ ` ') → straight ASCII `'`;
 *  4. collapse internal whitespace runs to a single space;
 *  5. drop whitespace immediately after an apostrophe, so an elided article
 *     glues to its noun ("l' amico" → "l'amico", "un' amica" → "un'amica")
 *     while an unelided article keeps its space ("lo studente" stays).
 *
 * Accents are intentionally PRESERVED — this is the accented, canonical-faithful
 * form. Diacritic removal is `fold`'s job, not `normalize`'s.
 */
export function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(APOSTROPHE_VARIANTS, "'")
    .replace(WHITESPACE_RUN, ' ')
    .replace(SPACE_AFTER_APOSTROPHE, "'");
}

/**
 * Accent-folded form: `normalize` plus diacritic removal. Equates strings that
 * differ ONLY by missing/extra accents (e.g. "perche" ≍ "perché", "e" ≍ "è").
 *
 * Folding is done two ways for robustness: NFD decomposition + stripping the
 * combining-marks block handles the general case, and an explicit Italian-vowel
 * map covers the precomposed letters directly. Input is assumed already
 * `normalize`-shaped by callers, but the function is self-contained and idempotent.
 */
export function fold(input: string): string {
  const normalized = normalize(input);
  // Strip combining marks left behind after canonical decomposition…
  const decomposed = normalized.normalize('NFD').replace(COMBINING_MARKS, '');
  // …then map any surviving precomposed Italian vowels to be safe.
  let out = '';
  for (const ch of decomposed) {
    out += ACCENT_FOLD[ch] ?? ch;
  }
  return out;
}

/**
 * Accent-tolerant validation of a typed Italian answer.
 *
 * @param input  what the learner typed.
 * @param answer the canonical, fully-accented correct answer.
 * @param accept additional genuine alternate spellings (NOT accent variants) —
 *               e.g. `["lei", "Lei"]` for the third-person pronoun.
 * @returns a {@link ValidationResult}. `normalized` is always the learner's input
 *          after {@link normalize}; `expected` is the matched canonical form for
 *          'correct'/'near', or the primary `answer` for 'wrong'.
 *
 * Resolution order (first match within a tier wins; ALL candidates are checked
 * for 'correct' before any 'near' fallback):
 *  1. exact normalized equality against any candidate → 'correct';
 *  2. accent-folded equality against any candidate (and not already exact) → 'near';
 *  3. otherwise → 'wrong'.
 *
 * Empty or whitespace-only input is 'wrong'.
 */
export function checkAnswer(
  input: string,
  answer: string,
  accept?: string[],
  blanks?: string[],
): ValidationResult {
  // Multi-blank agreement (Ex2): the TYPE-mode renderer submits the per-blank endings
  // joined with '|' (e.g. "a|a"); a single-blank item submits the bare ending ("a").
  // CHOICE mode submits the FULL corrected phrase ("Non mi piace l'acqua fredda."),
  // which always contains spaces. So: when `blanks` is supplied, route to per-blank
  // grading UNLESS the input looks like a full phrase (contains a space) — that case
  // falls through to the normal full-string comparison against `answer`.
  if (blanks && blanks.length > 0 && !/\s/.test(input.trim())) {
    return checkAgreementBlanks(input, blanks, answer);
  }

  const ni = normalize(input);
  const candidates = [answer, ...(accept ?? [])];

  // Empty/whitespace input can never be correct; report against the primary answer.
  if (ni === '') {
    return { status: 'wrong', normalized: ni, expected: answer };
  }

  // Tier 1 — exact match after normalization. Check every candidate first so an
  // exact alternate always beats a near match on the primary answer.
  for (const candidate of candidates) {
    if (normalize(candidate) === ni) {
      return { status: 'correct', normalized: ni, expected: candidate };
    }
  }

  // Tier 2 — matches except for accents → "casi correcto". The `ni !== nc` guard
  // is structurally redundant (Tier 1 already returned on exact equality) but kept
  // to honor the spec's explicit condition and document intent.
  const foldedInput = fold(ni);
  for (const candidate of candidates) {
    const nc = normalize(candidate);
    if (fold(nc) === foldedInput && ni !== nc) {
      return {
        status: 'near',
        normalized: ni,
        expected: candidate,
        message: `Casi correcto: lleva acento → «${candidate}».`,
      };
    }
  }

  // Tier 3 — genuinely wrong. Practice surfaces the canonical answer itself,
  // so no message is attached here.
  return { status: 'wrong', normalized: ni, expected: answer };
}

/** Split a multi-blank agreement submission into its per-blank endings. Accepts the
 *  canonical '|' separator as well as '/', ',', ';' and bare whitespace, so a learner
 *  who types "a a" or "a/a" is still graded fairly. Empty tokens are PRESERVED (an
 *  unfilled blank must count as a blank), so we split on the separators only. */
function splitBlanks(value: string): string[] {
  return normalize(value).split(/\s*[|/,;]\s*/);
}

/**
 * Per-blank validation for a multi-blank agreement item (Ex2).
 *  - 'correct' : every blank matches its ending exactly (after normalization);
 *  - 'near'    : every blank matches, but at least one differs ONLY by an accent;
 *  - 'wrong'   : a wrong arity, an empty blank, or any non-accent difference.
 * `fullPhrase` (the corrected phrase) is reported as `expected` so the feedback box
 * shows the readable sentence rather than the raw "a|a".
 */
export function checkAgreementBlanks(input: string, blanks: string[], fullPhrase: string): ValidationResult {
  const submitted = splitBlanks(input);
  const ni = submitted.join('|');

  // Arity mismatch (missing/extra blank) is wrong.
  if (submitted.length !== blanks.length) {
    return { status: 'wrong', normalized: ni, expected: fullPhrase };
  }

  let hasNear = false;
  for (let i = 0; i < blanks.length; i += 1) {
    const got = normalize(submitted[i]);
    const want = normalize(blanks[i]);
    if (got === want) continue;
    // An empty blank can never be correct.
    if (got === '') return { status: 'wrong', normalized: ni, expected: fullPhrase };
    if (fold(got) === fold(want)) {
      hasNear = true;
      continue;
    }
    return { status: 'wrong', normalized: ni, expected: fullPhrase };
  }

  return {
    status: hasNear ? 'near' : 'correct',
    normalized: ni,
    expected: fullPhrase,
    message: hasNear ? 'Casi correcto: revisa los acentos.' : undefined,
  };
}

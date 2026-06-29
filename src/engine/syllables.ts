/**
 * syllables.ts — Italian orthographic syllabification + stressed-syllable
 * detection. A DISPLAY-ONLY pronunciation aid for SINGLE-WORD prompts (article
 * nouns like "alberi" and verb lemmas like "aprire"): it returns a word split
 * around its whole STRESSED SYLLABLE so the UI can underline it (àl·be·ro → "al").
 *
 * It never touches answers or validation — it only tells a renderer which run of
 * characters is the tonic syllable. Stress placement is rule-based:
 *   1. a written final accent (città, perché)         → that (last) syllable
 *   2. a curated list of sdrucciole (proparoxytones)   → antepenultimate
 *      (albero, medico, prèndere… — Italian's unpredictable third-from-last set,
 *      which spelling does NOT mark)
 *   3. otherwise                                       → penultimate (the default)
 * Words with fewer than MIN_SYLLABLES syllables return null (no underline),
 * matching the request to mark stress only on words of 3+ syllables.
 *
 * Syllabification is orthographic and tuned for the fixed study vocabulary; every
 * noun form, infinitive, conjugated form and number word is pinned by
 * scripts/syllable-harness.ts.
 *
 * Conjugated verb forms (which can surface as multiple-choice options) reuse the
 * hand-curated stressed-vowel table in engine/stress.ts — the single source of
 * truth for conjugation stress — so we never duplicate that knowledge here.
 */

import { PERSONS } from '../types';
import { verbs } from '../content/verbs';
import { stressSplit } from './stress';

export const MIN_SYLLABLES = 3;

export interface TonicSplit {
  /** Characters before the stressed syllable. */
  pre: string;
  /** The whole stressed syllable (what the UI underlines). */
  tonic: string;
  /** Characters after the stressed syllable. */
  post: string;
}

const ACCENTED = 'àáèéìíîòóùú';
const VOWELS = new Set((`aeiou${ACCENTED}`).split(''));
const ACCENTED_SET = new Set(ACCENTED.split(''));
/** Strong vowels (for hiatus): a/e/o plus any accented (i.e. stressed) vowel. */
const STRONG = new Set((`aeo${ACCENTED}`).split(''));
/** "Mute" consonants that combine with a liquid (l/r) into one onset cluster. */
const MUTA = new Set(['b', 'c', 'd', 'f', 'g', 'p', 't', 'v']);
const LIQUID = new Set(['l', 'r']);

const isVowel = (c: string): boolean => VOWELS.has(c);
const isStrong = (c: string): boolean => STRONG.has(c);

/**
 * Sdrucciole (proparoxytones) in the study vocabulary — stressed on the
 * antepenultimate syllable, which Italian spelling leaves unmarked. Anything NOT
 * listed here (and without a final written accent) defaults to penultimate
 * stress. Keyed by the exact lowercase surface form (singular AND plural where
 * both appear). Pinned by scripts/syllable-harness.ts.
 */
const PROPAROXYTONE = new Set<string>([
  // nouns
  'cinema',
  'zucchero', 'zuccheri',
  'psicologo', 'psicologi',
  'pseudonimo', 'pseudonimi',
  'pneumatico', 'pneumatici',
  'xilofono', 'xilofoni',
  'albero', 'alberi',
  'isola', 'isole',
  'tavolo', 'tavoli',
  'medico', 'medici',
  'macchina', 'macchine',
  'uomini',
  // verb infinitives — the -ere sdrucciole (all -are/-ire infinitives are
  // penultimate, so only the third-from-last -ere set needs listing).
  'essere', 'prendere', 'leggere', 'scrivere', 'chiudere', 'mettere',
  // number words — cardinals 11-16 (-dici) and ordinals 7/10 are sdrucciole.
  'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici',
  'settimo', 'decimo',
]);

/**
 * Oxytones (final-stressed) whose stress Italian leaves UNWRITTEN — compound
 * numbers ending in an inherently-stressed monosyllable (ventisèi, ventidùe).
 * (Forms ending in -tré already carry the accent and need no listing.)
 */
const OXYTONE = new Set<string>([
  'ventidue', 'ventisei',
]);

/**
 * Conjugated present-tense forms → 0-based index of their stressed VOWEL,
 * sourced once from engine/stress.ts (the curated conjugation table). Lets a
 * multiple-choice option like "prendono"/"finiscono" be underlined on its true
 * (often antepenultimate) syllable without re-encoding conjugation stress here.
 */
const FORM_VOWEL_INDEX: Map<string, number> = (() => {
  const map = new Map<string, number>();
  for (const v of verbs) {
    const present = v.tenses.presente;
    if (!present) continue;
    for (const person of PERSONS) {
      const form = present[person];
      if (!form) continue;
      const split = stressSplit(v.infinitive, person, form);
      if (!split) continue;
      const key = form.toLowerCase();
      // Forms are stable across the catalog; first writer wins on the rare repeat.
      if (!map.has(key)) map.set(key, split.pre.length);
    }
  }
  return map;
})();

/**
 * Forced splits for words our orthographic vowel-grouping would mis-handle,
 * keyed by lowercase form → [pre length, tonic length]. costruire = co·stru·Ì·re:
 * the "ui" is a hiatus with the i stressed, not a diphthong.
 */
const SPLIT_OVERRIDE: Record<string, [number, number]> = {
  costruire: [6, 1], // "costru" | "i" | "re"
};

/** Split a consonant string into units, keeping the digraphs ch/gh/gn whole. */
function consonantUnits(s: string): string[] {
  const units: string[] = [];
  let i = 0;
  while (i < s.length) {
    const two = s.slice(i, i + 2);
    if (two === 'ch' || two === 'gh' || two === 'gn') {
      units.push(two);
      i += 2;
    } else {
      units.push(s[i]);
      i += 1;
    }
  }
  return units;
}

const isMuta = (u: string): boolean => u.length === 1 && MUTA.has(u);
const isLiquid = (u: string): boolean => u.length === 1 && LIQUID.has(u);

/** Whether a run of consonant units is a valid Italian syllable onset. */
function isValidOnset(u: string[]): boolean {
  if (u.length === 1) return true;
  if (u.length === 2) {
    const [a, b] = u;
    // s-impura: s + a single (non-s) consonant — st, sp, sc, sb, sm…
    if (a === 's' && b.length === 1 && b !== 's' && !isVowel(b)) return true;
    // mute + liquid — br, tr, pr, gl, fr…
    if (isMuta(a) && isLiquid(b)) return true;
    return false;
  }
  if (u.length === 3) {
    const [a, b, c] = u;
    // s + (mute + liquid) — str, spr, scr, sgr, spl…
    if (a === 's' && isMuta(b) && isLiquid(c)) return true;
    return false;
  }
  return false;
}

/** How many trailing units of an inter-vowel consonant group start the next syllable. */
function onsetCount(units: string[]): number {
  for (let k = Math.min(3, units.length); k >= 1; k -= 1) {
    if (isValidOnset(units.slice(units.length - k))) return k;
  }
  return 1;
}

/**
 * Split a word into orthographic syllables (preserving the original casing).
 * sylls.join('') === word.
 */
export function syllabify(word: string): string[] {
  const lower = word.toLowerCase();
  const len = lower.length;

  // 1. Vowel nuclei — maximal vowel runs, split between two strong vowels (hiatus).
  const nuclei: Array<[number, number]> = [];
  for (let i = 0; i < len; ) {
    if (!isVowel(lower[i])) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < len && isVowel(lower[j])) j += 1;
    let s = i;
    for (let p = i; p < j - 1; p += 1) {
      if (isStrong(lower[p]) && isStrong(lower[p + 1])) {
        nuclei.push([s, p + 1]);
        s = p + 1;
      }
    }
    nuclei.push([s, j]);
    i = j;
  }
  if (nuclei.length <= 1) return [word];

  // 2. Boundaries — for each gap between nuclei, the coda stays, the onset leaves.
  const bounds: number[] = [0];
  for (let k = 0; k < nuclei.length - 1; k += 1) {
    const gapStart = nuclei[k][1];
    const gapEnd = nuclei[k + 1][0];
    if (gapEnd === gapStart) {
      bounds.push(gapStart); // hiatus / no consonant between the vowels
      continue;
    }
    const units = consonantUnits(lower.slice(gapStart, gapEnd));
    const codaUnits = units.slice(0, units.length - onsetCount(units));
    bounds.push(gapStart + codaUnits.join('').length);
  }
  bounds.push(len);

  const sylls: string[] = [];
  for (let k = 0; k < bounds.length - 1; k += 1) {
    sylls.push(word.slice(bounds[k], bounds[k + 1]));
  }
  return sylls;
}

/** Index of the syllable containing character position `charIndex` (or -1). */
function syllableIndexForChar(sylls: string[], charIndex: number): number {
  let pos = 0;
  for (let i = 0; i < sylls.length; i += 1) {
    if (charIndex >= pos && charIndex < pos + sylls[i].length) return i;
    pos += sylls[i].length;
  }
  return -1;
}

/** 0-based index of the stressed syllable within `sylls` (see module rules). */
function stressedIndex(lower: string, sylls: string[]): number {
  // 1. Known conjugated form → the syllable holding its curated stressed vowel.
  const vowelIdx = FORM_VOWEL_INDEX.get(lower);
  if (vowelIdx !== undefined) {
    const si = syllableIndexForChar(sylls, vowelIdx);
    if (si >= 0) return si;
  }
  // 2. A written accent marks its own (almost always final) syllable.
  for (let k = 0; k < sylls.length; k += 1) {
    if ([...sylls[k].toLowerCase()].some((ch) => ACCENTED_SET.has(ch))) return k;
  }
  // 3. Curated stress classes, else the penultimate default.
  if (PROPAROXYTONE.has(lower)) return sylls.length - 3;
  if (OXYTONE.has(lower)) return sylls.length - 1;
  return sylls.length - 2; // penultimate (Italian default)
}

/**
 * Split `word` around its whole stressed syllable, or return null when the word
 * has fewer than `minSyllables` syllables (graceful: the caller then shows the
 * word with no underline). pre + tonic + post === word.
 */
export function tonicSplit(word: string, minSyllables = MIN_SYLLABLES): TonicSplit | null {
  const lower = word.toLowerCase();

  const override = SPLIT_OVERRIDE[lower];
  if (override) {
    const [preLen, tonicLen] = override;
    return {
      pre: word.slice(0, preLen),
      tonic: word.slice(preLen, preLen + tonicLen),
      post: word.slice(preLen + tonicLen),
    };
  }

  const sylls = syllabify(word);
  if (sylls.length < minSyllables) return null;

  const idx = stressedIndex(lower, sylls);
  if (idx < 0 || idx >= sylls.length) return null;

  return {
    pre: sylls.slice(0, idx).join(''),
    tonic: sylls[idx],
    post: sylls.slice(idx + 1).join(''),
  };
}

/**
 * syllable-harness.ts — coverage + correctness check for engine/syllables.ts.
 *
 * Run: npx tsx scripts/syllable-harness.ts
 *
 * Covers EVERY word the renderer can underline — single-word heroes (noun forms +
 * infinitives) AND multiple-choice options (conjugated verb forms, number words,
 * vocab terms). For each it asserts a lossless split (pre+tonic+post === word) and
 * a non-empty tonic. For conjugated forms it ALSO cross-checks that the tonic
 * syllable contains the stressed vowel that engine/stress.ts marks (the curated
 * source of truth), so the two stress systems can never silently diverge.
 * Exits non-zero on any failure.
 */

import { nouns } from '../src/content/articles';
import { verbs } from '../src/content/verbs';
import { vocab } from '../src/content/vocab';
import { syllabify, tonicSplit } from '../src/engine/syllables';
import { stressSplit } from '../src/engine/stress';
import { numberToItalian, numberToOrdinal } from '../src/engine/numbers';
import { PERSONS } from '../src/types';

let failures = 0;
function fail(msg: string): void {
  failures += 1;
  console.error(`FAIL: ${msg}`);
}

function checkLossless(word: string): ReturnType<typeof tonicSplit> {
  const split = tonicSplit(word);
  if (split) {
    if (split.pre + split.tonic + split.post !== word) fail(`${word}: split is lossy`);
    if (!split.tonic) fail(`${word}: empty tonic syllable`);
  }
  return split;
}

function show(word: string): string {
  const sylls = syllabify(word).join('·');
  const split = tonicSplit(word);
  return split
    ? `${word.padEnd(14)} ${sylls.padEnd(22)} → ${split.pre}[${split.tonic}]${split.post}`
    : `${word.padEnd(14)} ${sylls.padEnd(22)} → (— ${syllabify(word).length} syl)`;
}

// ── Heroes: noun forms + infinitives ──────────────────────────────────────────
const heroWords = Array.from(
  new Set([...nouns.flatMap((n) => [n.singular, n.plural]), ...verbs.map((v) => v.infinitive)]),
).sort();
console.log(`Heroes — ${heroWords.length} noun forms + infinitives:`);
for (const w of heroWords) {
  checkLossless(w);
  console.log(`  ${show(w)}`);
}

// ── Choices: conjugated verb forms (cross-checked vs stress.ts) ────────────────
console.log('\nConjugated forms (tonic syllable must hold the stress.ts vowel):');
for (const v of verbs) {
  const present = v.tenses.presente;
  if (!present) continue;
  for (const person of PERSONS) {
    const form = present[person];
    if (!form) continue;
    const tonic = checkLossless(form);
    const vowel = stressSplit(v.infinitive, person, form);
    if (tonic && vowel) {
      // The stressed vowel (at index vowel.pre.length) must fall inside the tonic syllable.
      const vi = vowel.pre.length;
      const within = vi >= tonic.pre.length && vi < tonic.pre.length + tonic.tonic.length;
      if (!within) {
        fail(`${form} (${v.infinitive}:${person}): stressed vowel '${vowel.vowel}' (idx ${vi}) not inside tonic '${tonic.tonic}'`);
      }
    }
    if (syllabify(form).length >= 3) console.log(`  ${show(form)}`);
  }
}

// ── Choices: number words (cardinals + ordinals in the catalog's ranges) ───────
const cardinals = [...Array.from({ length: 30 }, (_, i) => i + 1), 40, 50, 60, 70, 80, 90, 100];
const ordinals = Array.from({ length: 10 }, (_, i) => i + 1);
const numberWords = Array.from(
  new Set([...cardinals.map(numberToItalian), ...ordinals.map(numberToOrdinal)]),
);
console.log('\nNumber words (cardinals 1-30/tens/100 + ordinals 1-10):');
for (const w of numberWords) {
  checkLossless(w);
  console.log(`  ${show(w)}`);
}

// ── Choices: vocab terms ──────────────────────────────────────────────────────
const vocabTerms = Array.from(new Set(vocab.map((v) => v.term))).sort();
console.log('\nVocab terms:');
for (const w of vocabTerms) {
  checkLossless(w);
  console.log(`  ${show(w)}`);
}

// ── Spot checks on the cases cited in the request + tricky stress classes ──────
type Case = { word: string; pre: string; tonic: string; post: string };
const cases: Case[] = [
  { word: 'albero', pre: '', tonic: 'al', post: 'bero' },
  { word: 'aprire', pre: 'a', tonic: 'pri', post: 're' },
  { word: 'medico', pre: '', tonic: 'me', post: 'dico' },
  { word: 'prendere', pre: '', tonic: 'pren', post: 'dere' },
  { word: 'università', pre: 'universi', tonic: 'tà', post: '' },
  { word: 'costruire', pre: 'costru', tonic: 'i', post: 're' },
  // conjugated MC options
  { word: 'prendono', pre: '', tonic: 'pren', post: 'dono' },
  { word: 'finiscono', pre: 'fi', tonic: 'ni', post: 'scono' },
  { word: 'possiamo', pre: 'pos', tonic: 'sia', post: 'mo' },
  { word: 'parlano', pre: '', tonic: 'par', post: 'lano' },
  { word: 'vogliamo', pre: 'vo', tonic: 'glia', post: 'mo' },
  // number MC options
  { word: 'settanta', pre: 'set', tonic: 'tan', post: 'ta' },
  { word: 'cinquanta', pre: 'cin', tonic: 'quan', post: 'ta' },
  { word: 'sedici', pre: '', tonic: 'se', post: 'dici' },
  { word: 'undici', pre: '', tonic: 'un', post: 'dici' },
  { word: 'quattordici', pre: 'quat', tonic: 'tor', post: 'dici' },
  { word: 'ventisei', pre: 'venti', tonic: 'sei', post: '' },
  { word: 'settimo', pre: '', tonic: 'set', post: 'timo' },
];
console.log('\nSpot checks:');
for (const c of cases) {
  const s = tonicSplit(c.word);
  if (!s) {
    fail(`${c.word}: expected a split, got null`);
    continue;
  }
  if (s.pre === c.pre && s.tonic === c.tonic && s.post === c.post) {
    console.log(`  ok  ${c.word.padEnd(12)} ${s.pre}[${s.tonic}]${s.post}`);
  } else {
    fail(`${c.word}: got ${s.pre}[${s.tonic}]${s.post}, expected ${c.pre}[${c.tonic}]${c.post}`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log('All syllable checks passed.');

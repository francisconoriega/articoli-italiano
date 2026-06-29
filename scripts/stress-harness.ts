/**
 * stress-harness.ts — coverage + correctness check for engine/stress.ts.
 *
 * Run: npx tsx scripts/stress-harness.ts
 *
 * For EVERY verb × person it asserts that stressSplit:
 *   - is non-null (full coverage of all 41 verbs × 6 forms),
 *   - reconstructs the form exactly (pre + vowel + post === form),
 *   - returns a single-character vowel.
 * Plus a few spot-asserts on cited cases. Exits non-zero on any failure.
 */

import { verbs } from '../src/content/verbs';
import { stressSplit } from '../src/engine/stress';
import { PERSONS } from '../src/types';
import type { Person } from '../src/types';

const VOWELS = new Set([
  'a', 'e', 'i', 'o', 'u',
  'à', 'è', 'é', 'ì', 'î', 'ò', 'ó', 'ù',
]);

let failures = 0;
let covered = 0;
let expectedTotal = 0;

function fail(msg: string): void {
  failures += 1;
  console.error(`FAIL: ${msg}`);
}

// ── Full coverage sweep ──────────────────────────────────────────────────────
for (const verb of verbs) {
  const presente = verb.tenses.presente;
  if (!presente) {
    fail(`${verb.infinitive} has no presente tense`);
    continue;
  }
  for (const person of PERSONS) {
    expectedTotal += 1;
    const form = presente[person];
    const split = stressSplit(verb.infinitive, person as Person, form);

    if (split === null) {
      fail(`missing/invalid entry for ${verb.infinitive}:${person} ("${form}")`);
      continue;
    }

    const { pre, vowel, post } = split;

    if (pre + vowel + post !== form) {
      fail(`${verb.infinitive}:${person} does not reconstruct: "${pre}|${vowel}|${post}" !== "${form}"`);
      continue;
    }
    if ([...vowel].length !== 1) {
      fail(`${verb.infinitive}:${person} vowel is not one char: "${vowel}"`);
      continue;
    }
    if (!VOWELS.has(vowel)) {
      fail(`${verb.infinitive}:${person} vowel "${vowel}" is not a vowel (form "${form}")`);
      continue;
    }

    covered += 1;
    // Visible rendering: stressed vowel wrapped in ‹ › so the form is human-checkable.
    console.log(`  ${verb.infinitive.padEnd(11)} ${person.padEnd(4)} ${pre}‹${vowel}›${post}`);
  }
}

// ── Spot assertions on the cited cases ───────────────────────────────────────
function spot(infinitive: string, person: Person, form: string, expectVowel: string, expectIndex: number): void {
  const split = stressSplit(infinitive, person, form);
  if (!split) {
    fail(`spot ${infinitive}:${person} returned null`);
    return;
  }
  if (split.vowel !== expectVowel) {
    fail(`spot ${infinitive}:${person} vowel "${split.vowel}" !== expected "${expectVowel}"`);
  }
  if (split.pre.length !== expectIndex) {
    fail(`spot ${infinitive}:${person} index ${split.pre.length} !== expected ${expectIndex}`);
  }
}

spot('essere', 'io', 'sono', 'o', 1);       // sono → s,o,n,o → stressed 'o' at index 1
spot('andare', 'noi', 'andiamo', 'a', 4);   // andiamo → the 'a' of -iamo (index 4)
spot('finire', 'loro', 'finiscono', 'i', 3); // finiscono → the -isc- 'i' (index 3)
spot('essere', 'lui', 'è', 'è', 0);          // è → accented 'è' at index 0

// ── Summary ──────────────────────────────────────────────────────────────────
console.log('');
console.log(`Covered ${covered}/${expectedTotal} forms across ${verbs.length} verbs.`);
if (failures === 0 && covered === expectedTotal) {
  console.log('ALL PASS — full, valid coverage, exit 0.');
} else {
  console.error(`FAILURES: ${failures}. Covered ${covered}/${expectedTotal}.`);
  process.exitCode = 1;
}

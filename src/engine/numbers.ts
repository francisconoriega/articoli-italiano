/**
 * numbers.ts — Italian number-word generation (cardinals + ordinals).
 *
 * PURE, framework-agnostic, zero imports. Deals only in plain numbers and
 * strings. Supports the range 0–2000 (the app focuses on 1–100 today but the
 * spelling rules generalize, so the implementation scales to 2000).
 *
 * The build is RULE-BASED, not a giant lookup table. Cardinals are composed
 * from three pieces — [thousands][hundreds][tens+units] — and the irregular
 * Italian "spelling" of the joins (vowel elision before uno/otto and the
 * accent on -tré) is applied by a small set of string rules at each boundary.
 */

/* ── Atomic word tables (the genuinely irregular forms) ───────────────────── */

/** 0–19: the units and the irregular teens (no rule generates these). */
const ONES: readonly string[] = [
  'zero',
  'uno',
  'due',
  'tre',
  'quattro',
  'cinque',
  'sei',
  'sette',
  'otto',
  'nove',
  'dieci',
  'undici',
  'dodici',
  'tredici',
  'quattordici',
  'quindici',
  'sedici',
  'diciassette',
  'diciotto',
  'diciannove',
];

/** Tens by their leading digit: TENS[2] = 'venti', TENS[9] = 'novanta'. */
const TENS: readonly string[] = [
  '', // 0 — unused (handled by ONES)
  '', // 1 — unused (the teens are in ONES)
  'venti',
  'trenta',
  'quaranta',
  'cinquanta',
  'sessanta',
  'settanta',
  'ottanta',
  'novanta',
];

/* ── Composition helpers ──────────────────────────────────────────────────── */

/**
 * Join a "tens base" word (e.g. "venti", "ottanta", or "cento") with a unit
 * word (1–9), applying the standard Italian spelling rules:
 *   - before "uno" (1) and "otto" (8) the base drops its final vowel:
 *       venti+uno → ventuno, venti+otto → ventotto, cento+otto → centotto.
 *   - before "tre" (3) the result takes a written accent: venti+tre → ventitré.
 *   - otherwise the words are simply concatenated: venti+sette → ventisette.
 * `unit` must be 1–9; callers handle the exact-multiple (unit 0) case.
 */
function joinUnit(base: string, unit: number): string {
  if (unit === 1 || unit === 8) {
    // Elide the base's trailing vowel ("venti" → "vent", "cento" → "cent").
    return base.slice(0, -1) + ONES[unit];
  }
  if (unit === 3) {
    // tre → tré when it is the closing element of a larger number.
    return base + 'tré';
  }
  return base + ONES[unit];
}

/** Spell 1–99 (the tens+units block), assuming n is in [1, 99]. */
function spellTwoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  if (unit === 0) return TENS[tens];
  return joinUnit(TENS[tens], unit);
}

/**
 * Spell 1–999 (the hundreds block + tens/units), assuming n is in [1, 999].
 * "cento" is invariable (1xx) and takes a multiplier prefix for 2xx–9xx
 * (duecento, trecento, …). The cento→remainder join reuses the same elision
 * rules: cento+uno → centuno, cento+otto → centotto, and crucially
 * cento+ottanta → centottanta (the o of cento is dropped before ottanta).
 */
function spellThreeDigits(n: number): string {
  if (n < 100) return spellTwoDigits(n);

  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const centoWord = hundreds === 1 ? 'cento' : ONES[hundreds] + 'cento';

  if (rest === 0) return centoWord;

  const restWord = spellTwoDigits(rest);
  // Elide cento's final "o" when the remainder begins with the relevant vowel
  // sound: that is, when it starts with the unit "uno"/"otto" or the tens word
  // "ottanta" (all of which begin with "o"/"u" that swallows the o of cento).
  if (restWord.startsWith('o') || restWord.startsWith('u')) {
    return centoWord.slice(0, -1) + restWord;
  }
  return centoWord + restWord;
}

/* ── Cardinal ─────────────────────────────────────────────────────────────── */

/**
 * Convert an integer to its Italian cardinal word (e.g. 23 → "ventitré",
 * 188 → "centottantotto", 1900 → "millenovecento"). Supports 0–2000.
 * Throws a RangeError for non-integers or values outside [0, 2000].
 */
export function numberToItalian(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 2000) {
    throw new RangeError(`numberToItalian: expected an integer in [0, 2000], got ${n}`);
  }

  if (n < 1000) {
    // 0 is the only value the sub-1000 spellers don't cover.
    return n === 0 ? ONES[0] : spellThreeDigits(n);
  }

  // Thousands: 1000 = "mille", 2000+ = "<n>mila". The remainder (1–999) is
  // simply concatenated — millecento, milleduecento…, millenovecento — with no
  // extra elision at this boundary for the values in range.
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const thousandsWord = thousands === 1 ? 'mille' : ONES[thousands] + 'mila';

  if (rest === 0) return thousandsWord;
  return thousandsWord + spellThreeDigits(rest);
}

/* ── Ordinal ──────────────────────────────────────────────────────────────── */

/** 1–10 ordinals are wholly irregular and listed verbatim. */
const ORDINALS_1_10: readonly string[] = [
  '', // 0 — no ordinal
  'primo',
  'secondo',
  'terzo',
  'quarto',
  'quinto',
  'sesto',
  'settimo',
  'ottavo',
  'nono',
  'decimo',
];

/**
 * Convert an integer to its Italian ordinal word (e.g. 21 → "ventunesimo",
 * 1000 → "millesimo"). For 1–10 the irregular forms are used directly; from 11
 * on, the rule is: take the cardinal, drop its final vowel, append "esimo"
 * (undici → undicesimo, venti → ventesimo, cento → centesimo). Two spelling
 * exceptions preserve the cardinal's final sound:
 *   - cardinals ending in accented "-tré" (23, 33…) keep the e and lose the
 *     accent: ventitré → ventitreesimo.
 *   - cardinals ending in "-sei" (26, 36…) keep the i: ventisei → ventiseiesimo.
 * Supports 1–2000 (0 has no ordinal). Throws RangeError otherwise.
 */
export function numberToOrdinal(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 2000) {
    throw new RangeError(`numberToOrdinal: expected an integer in [1, 2000], got ${n}`);
  }

  if (n <= 10) return ORDINALS_1_10[n];

  const cardinal = numberToItalian(n);

  // -tré → -treesimo (accented e becomes a plain e, then +simo via the
  // general "keep the vowel, add -esimo" path).
  if (cardinal.endsWith('tré')) {
    return cardinal.slice(0, -1) + 'eesimo';
  }
  // -sei keeps its final i (sei → seiesimo).
  if (cardinal.endsWith('sei')) {
    return cardinal + 'esimo';
  }
  // General rule: drop the final vowel, add -esimo.
  return cardinal.slice(0, -1) + 'esimo';
}

/**
 * Teach how a 2-digit compound cardinal is built from its family — the "explicit
 * number-family lesson" shown in feedback:
 *   27 → "venti + sette → ventisette"
 *   68 → "sessanta + otto → sessantotto"  (+ elision note)
 *   23 → "venti + tre → ventitré"          (+ accent note)
 * Returns null for numbers with nothing to decompose (base names 0–19, round tens,
 * hundreds). Markdown ** ** marks the key forms for the feedback renderer.
 */
export function cardinalLesson(n: number): string | null {
  if (!Number.isInteger(n) || n < 21 || n > 99) return null;
  const unit = n % 10;
  if (unit === 0) return null; // round tens (20, 30, …) are the family heads
  const tens = n - unit;
  const tensWord = numberToItalian(tens);
  const unitWord = numberToItalian(unit);
  const full = numberToItalian(n);
  let note = `**${tensWord} + ${unitWord} → ${full}**`;
  if (unit === 1 || unit === 8) {
    note += ` — se elide la vocal final de ${tensWord} antes de ${unitWord}`;
  } else if (unit === 3) {
    note += ` — el «tre» final lleva acento`;
  }
  return note;
}

/**
 * scripts/test-mode-harness.ts — guards the automated-testing isolation contract.
 *
 * The storage layer is the one place a careless test can lose the user's REAL
 * study progress. Test mode (`?claude-test`, sticky session, or VITE_CLAUDE_TEST) must:
 *   1. read/write ONLY the isolated TEST key (real key untouched),
 *   2. never seed from the legacy store,
 *   3. wipe the test store when `=reset`/`=fresh` is requested (but NOT on sticky reloads),
 *   4. never mirror to the shared dev file (no network fetch),
 *   5. STAY isolated after a reload drops the URL param (sticky via sessionStorage) — this is
 *      the regression guard for the 2026-06-29 incident where the preview tool reloaded to the
 *      base URL, dropped `?claude-test`, and a save leaked to the real file.
 *
 * Run:  npx tsx scripts/test-mode-harness.ts
 *
 * Detection is lazy (per-call), so we mock window/localStorage/sessionStorage and flip
 * `location.search` between assertions. The env-flag path (VITE_CLAUDE_TEST) can't be mocked
 * in node (import.meta.env is static) — it's smoke-tested by `npm run dev:test` (broker gone).
 */

// ── Minimal browser mocks (must exist before importing the storage module) ──
function makeStorage() {
  const m = new Map<string, string>();
  return {
    _m: m,
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
    clear: () => { m.clear(); },
  };
}
const localStorageMock = makeStorage();
const sessionStorageMock = makeStorage();
let search = '';
let fetchCalls = 0;

(globalThis as Record<string, unknown>).localStorage = localStorageMock;
(globalThis as Record<string, unknown>).sessionStorage = sessionStorageMock;
(globalThis as Record<string, unknown>).window = { location: { get search() { return search; } } };
(globalThis as Record<string, unknown>).fetch = () => { fetchCalls++; return Promise.resolve({ ok: false } as Response); };

function setUrl(s: string) { search = s; }
/** Simulate a brand-new tab: clear the sticky session flag. */
function freshSession() { sessionStorageMock.clear(); }

import { STORAGE_KEY, TEST_STORAGE_KEY, LEGACY_STORAGE_KEY } from '../src/types';
import { isTestMode, isTestReset } from '../src/engine/testMode';
import { loadStore, saveStore, createStore } from '../src/engine/storage';

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? '✅' : '❌'} ${name}`);
  if (!cond) failures++;
}

// ── 1. Detection (fresh session each time so stickiness doesn't bleed across cases) ──
freshSession(); setUrl('');
check('no param → not test mode', !isTestMode() && !isTestReset());
freshSession(); setUrl('?claude-test');
check('?claude-test → test mode, no reset', isTestMode() && !isTestReset());
freshSession(); setUrl('?claude-test=1');
check('?claude-test=1 → test mode, no reset', isTestMode() && !isTestReset());
freshSession(); setUrl('?claude-test=reset');
check('?claude-test=reset → test mode + reset', isTestMode() && isTestReset());
freshSession(); setUrl('?claude-test=fresh');
check('?claude-test=fresh → test mode + reset', isTestMode() && isTestReset());
freshSession(); setUrl('?foo=bar');
check('unrelated param → not test mode', !isTestMode());

// ── 2. Real mode writes the real key ──
freshSession(); setUrl('');
localStorageMock.clear();
const real = createStore();
real.items['article:def:x:sing'] = { seen: 9 } as never;
saveStore(real);
check('real save → writes STORAGE_KEY', localStorageMock.getItem(STORAGE_KEY) !== null);
check('real save → does NOT write TEST key', localStorageMock.getItem(TEST_STORAGE_KEY) === null);

// ── 3. Test mode is isolated from the real store ──
freshSession(); setUrl('?claude-test');
const loadedInTest = loadStore();
check('test load → fresh (ignores real key data)', Object.keys(loadedInTest.items).length === 0);
const t = createStore();
t.items['num:base:7'] = { seen: 3 } as never;
fetchCalls = 0;
saveStore(t);
check('test save → writes TEST key', localStorageMock.getItem(TEST_STORAGE_KEY) !== null);
check('test save → real key UNTOUCHED', JSON.parse(localStorageMock.getItem(STORAGE_KEY)!).items['article:def:x:sing'].seen === 9);
check('test save → no network mirror to shared dev file', fetchCalls === 0);

// ── 4. STICKY: a reload that drops the URL param stays isolated (THE incident regression) ──
// We are still in the same "session" (sticky armed by step 3's ?claude-test). Drop the param:
setUrl(''); // preview tool reloaded to the base URL, query string gone
check('sticky → still test mode after param dropped', isTestMode());
check('sticky → isTestReset stays false (no wipe on reload)', !isTestReset());
fetchCalls = 0;
const t2 = createStore();
t2.items['verb:essere:io'] = { seen: 1 } as never;
saveStore(t2);
check('sticky save → still writes TEST key', JSON.parse(localStorageMock.getItem(TEST_STORAGE_KEY)!).items['verb:essere:io'].seen === 1);
check('sticky save → real key STILL untouched', JSON.parse(localStorageMock.getItem(STORAGE_KEY)!).items['article:def:x:sing'].seen === 9);
check('sticky save → no network mirror', fetchCalls === 0);
// A truly new tab (no sticky, no param) is back to real mode:
freshSession(); setUrl('');
check('new tab (no sticky) → back to real mode', !isTestMode());

// ── 5. Reset wipes; sticky reload preserves the test store ──
freshSession(); setUrl('?claude-test');
localStorageMock.removeItem(TEST_STORAGE_KEY);
const seed = createStore(); seed.items['num:base:7'] = { seen: 3 } as never;
saveStore(seed);
check('test reload (sticky, no reset) → keeps test data', Object.keys(loadStore().items).length === 1);
setUrl('?claude-test=reset');
check('?claude-test=reset → wipes test store', Object.keys(loadStore().items).length === 0);
check('reset only cleared TEST key, real key intact', localStorageMock.getItem(STORAGE_KEY) !== null && localStorageMock.getItem(TEST_STORAGE_KEY) === null);

// ── 6. Legacy seeding never bleeds into test mode ──
freshSession();
localStorageMock.clear();
localStorageMock.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ cards: { 'gruppo-1:singular': { seen: 5, correct: 4, wrong: 1 } } }));
setUrl('?claude-test');
check('test mode → does NOT seed from legacy store', Object.keys(loadStore().items).length === 0);
freshSession(); setUrl('');
check('real first-launch → DOES seed from legacy store', Object.keys(loadStore().items).length > 0);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

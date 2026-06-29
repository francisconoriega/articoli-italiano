/**
 * engine/testMode.ts — opt-in persistence isolation for automated / throwaway testing.
 *
 * When test mode is ON, persistence is fully isolated from the user's REAL study progress:
 *   - localStorage uses a SEPARATE test key (TEST_STORAGE_KEY); the real
 *     `articoli-progreso-v1` is never read or written, and
 *   - the dev cross-port file sync (`/__progress` → ~/.articoli-progreso-dev.json)
 *     is DISABLED, so the user's shared study file is never touched.
 *
 * Three ways to turn it on (checked in this order):
 *   1. SERVER FLAG — `VITE_CLAUDE_TEST=1` in the env (e.g. `npm run dev:test`). Puts the
 *      WHOLE server instance in test mode regardless of URL. Robust under automation:
 *      it can't be lost to a reload. The vite config also drops the `/__progress` broker
 *      when this is set, so that server physically cannot write the real file.
 *   2. URL PARAM — `?claude-test` (optionally `=reset`/`=fresh` to wipe on load). Lets you
 *      reuse a NORMAL dev server for a one-off safe test without a restart.
 *   3. STICKY — the first time the URL param is seen, it's mirrored to sessionStorage, so
 *      test mode SURVIVES a reload that drops the query string (the Claude preview tooling
 *      reloads to the base URL — see STORAGE.md). Stickiness lasts the browser session/tab.
 *
 * `isTestReset()` fires ONLY from the live `=reset`/`=fresh` URL — never from stickiness —
 * so a reload mid-test keeps the test store instead of wiping it every time.
 *
 * All detection is guarded so this module is import-safe in node / SSR (no window/storage).
 *
 * See STORAGE.md for the full persistence picture.
 */

/** Query-param name that turns on isolated testing mode. */
export const TEST_PARAM = 'claude-test';

/** sessionStorage key used to make URL-triggered test mode sticky across reloads. */
const STICKY_KEY = 'claude-test-mode';

/** Read the raw `?claude-test` value, or null if the param is absent / unavailable. */
function readParam(): string | null {
  try {
    if (typeof window === 'undefined' || !window.location) return null;
    return new URLSearchParams(window.location.search).get(TEST_PARAM);
  } catch {
    return null;
  }
}

/** True when the build/server env opts the whole instance into test mode (VITE_CLAUDE_TEST). */
function envFlag(): boolean {
  try {
    const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    const v = env?.VITE_CLAUDE_TEST;
    return v === '1' || v === 'true' || v === true;
  } catch {
    return false;
  }
}

/** True when a prior URL param made test mode sticky for this session/tab. */
function stickyPresent(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(STICKY_KEY) !== null;
  } catch {
    return false;
  }
}

/** Persist test mode for this session so it survives a query-string-dropping reload. */
function markSticky(): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(STICKY_KEY, '1');
  } catch {
    /* ignore — stickiness is a best-effort safety net */
  }
}

/**
 * True when the app is running in isolated automated-testing mode — via the server
 * env flag, the `?claude-test` URL param, or a sticky flag set by a prior param load.
 * Seeing the URL param also arms stickiness so a later param-less reload stays isolated.
 */
export function isTestMode(): boolean {
  if (envFlag()) return true;
  if (readParam() !== null) {
    markSticky();
    return true;
  }
  return stickyPresent();
}

/**
 * True when test mode also requested a clean slate THIS load (`?claude-test=reset`/`=fresh`).
 * Only ever true from the live URL — never from the env flag or stickiness — so a mid-test
 * reload preserves the test store instead of wiping it on every navigation.
 */
export function isTestReset(): boolean {
  const v = readParam();
  return v === 'reset' || v === 'fresh';
}

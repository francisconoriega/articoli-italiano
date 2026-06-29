/**
 * engine/storage.ts — versioned persistence for the full ProgressStore.
 *
 * Responsibilities:
 *   1. createStore()       — build a default empty store
 *   2. loadStore()         — read from localStorage, migrate legacy data on first load
 *   3. saveStore()         — write to localStorage (swallows quota errors)
 *   4. exportStoreJson()   — serialise with an exportedAt timestamp for download
 *   5. importStoreJson()   — parse, validate, and normalise an exported file
 *
 * All localStorage access is guarded by a typeof check so this module is
 * import-safe in SSR / test environments with no DOM.
 */

import type {
  ProgressStore,
  ItemProgress,
} from '../types';

import {
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  SCHEMA_VERSION,
  COURSE_ID,
  APP_VERSION,
  DEFAULT_SETTINGS,
} from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

/** True when localStorage is available (guards against SSR / worker contexts). */
function hasStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

/** Clamp a number between lo and hi (inclusive). */
function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

// ─── Legacy migration shape ──────────────────────────────────────────────────

/**
 * Shape of one card entry in the legacy "articoli-italiano-stats-v3" store.
 * The key format is  "<groupId>:singular"  or  "<groupId>:plural".
 */
interface LegacyCard {
  seen: number;
  correct: number;
  wrong: number;
  timeouts?: number;
  dontKnow?: number;
}

interface LegacyStore {
  cards?: Record<string, LegacyCard>;
  [key: string]: unknown;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build a brand-new, empty ProgressStore with all fields at their defaults.
 * Safe to call without a DOM.
 */
export function createStore(): ProgressStore {
  return {
    appVersion: APP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: null,
    courseId: COURSE_ID,
    items: {},
    skills: {},
    settings: { ...DEFAULT_SETTINGS },
    history: [],
  };
}

/**
 * Load the ProgressStore from localStorage.
 *
 * Flow:
 *   1. No localStorage  →  return createStore()
 *   2. STORAGE_KEY present and valid JSON with matching schemaVersion  →
 *        return it, filling any missing top-level fields from createStore()
 *        (defensively handles partial saves from older minor versions).
 *   3. STORAGE_KEY present but schemaVersion differs  →
 *        return parsed store with schemaVersion corrected; items/skills kept.
 *        (Placeholder for real schema migration when the shape changes.)
 *   4. STORAGE_KEY absent  →  create fresh store, seed it from the legacy
 *        "articoli-italiano-stats-v3" key via migrateLegacyStore(), return.
 *   5. Any JSON parse error  →  fall back to createStore().
 */
export function loadStore(): ProgressStore {
  if (!hasStorage()) {
    return createStore();
  }

  const raw = localStorage.getItem(STORAGE_KEY);

  // ── Case 4: first ever launch under the new key ──
  if (raw === null) {
    const fresh = createStore();
    migrateLegacyStore(fresh);
    return fresh;
  }

  // ── Cases 2 & 3: key exists ──
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return createStore();
    }

    const defaults = createStore();
    // Defensively merge: prefer parsed values, fall back to defaults for missing keys.
    const store: ProgressStore = {
      appVersion:    _str(parsed, 'appVersion',    defaults.appVersion),
      schemaVersion: _num(parsed, 'schemaVersion', defaults.schemaVersion),
      exportedAt:    _numOrNull(parsed, 'exportedAt'),
      courseId:      _str(parsed, 'courseId',      defaults.courseId),
      items:         _obj(parsed, 'items',         defaults.items),
      skills:        _obj(parsed, 'skills',        defaults.skills),
      settings: {
        ...defaults.settings,
        ...(_objOrUndef(parsed, 'settings') ?? {}),
      },
      history:       _arr(parsed, 'history',       defaults.history),
    };

    // Normalise schemaVersion regardless of mismatch (no real migration yet).
    store.schemaVersion = SCHEMA_VERSION;

    return store;
  } catch {
    return createStore();
  }
}

/**
 * Persist `store` to localStorage under STORAGE_KEY.
 * Silently swallows quota exceeded errors (the caller is not expected to handle them).
 */
export function saveStore(store: ProgressStore): void {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('[storage] saveStore: could not write to localStorage.', err);
  }
}

/**
 * Serialise `store` for file download.
 * Sets `exportedAt` to the current epoch ms and pretty-prints with 2-space indent.
 * The original `store` object is NOT mutated.
 */
export function exportStoreJson(store: ProgressStore): string {
  const payload: ProgressStore = { ...store, exportedAt: Date.now() };
  return JSON.stringify(payload, null, 2);
}

/**
 * Parse and validate a JSON string previously produced by exportStoreJson().
 * Returns a normalised ProgressStore (missing top-level fields filled from createStore()).
 *
 * Throws `Error("Archivo de progreso inválido")` if the string is not valid JSON
 * or is missing the required `items`, `skills`, or `schemaVersion` fields.
 *
 * NOTE (Phase 1B): the UI wiring for merge-vs-replace lives in Phase 1B.
 * This function simply yields a clean, complete store ready to use.
 */
export function importStoreJson(json: string): ProgressStore {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Archivo de progreso inválido');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>)['items'] !== 'object' ||
    (parsed as Record<string, unknown>)['items'] === null ||
    typeof (parsed as Record<string, unknown>)['skills'] !== 'object' ||
    (parsed as Record<string, unknown>)['skills'] === null ||
    typeof (parsed as Record<string, unknown>)['schemaVersion'] !== 'number'
  ) {
    throw new Error('Archivo de progreso inválido');
  }

  const defaults = createStore();
  return {
    appVersion:    _str(parsed, 'appVersion',    defaults.appVersion),
    schemaVersion: _num(parsed, 'schemaVersion', SCHEMA_VERSION),
    exportedAt:    _numOrNull(parsed, 'exportedAt'),
    courseId:      _str(parsed, 'courseId',      defaults.courseId),
    items:         _obj(parsed, 'items',         defaults.items),
    skills:        _obj(parsed, 'skills',        defaults.skills),
    settings: {
      ...defaults.settings,
      ...(_objOrUndef(parsed, 'settings') ?? {}),
    },
    history:       _arr(parsed, 'history',       defaults.history),
  };
}

// ─── Legacy migration (internal) ─────────────────────────────────────────────

/**
 * Read LEGACY_STORAGE_KEY and seed `store.items` with article-progress entries.
 *
 * Legacy key format  →  new Item id:
 *   "<groupId>:singular"  →  "article:def:<groupId>:sing"
 *   "<groupId>:plural"    →  "article:def:<groupId>:plur"
 *
 * Only cards with seen > 0 are migrated.
 * mastery = clamp(correct / seen, 0.2, 0.95); remaining SRS fields are zeroed.
 * Wrapped in try/catch — migration failure must never break loadStore().
 *
 * @param store  The fresh store to seed in-place.
 */
function migrateLegacyStore(store: ProgressStore): void {
  if (!hasStorage()) return;
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;

    const legacy: LegacyStore = JSON.parse(raw) as LegacyStore;
    if (typeof legacy.cards !== 'object' || legacy.cards === null) return;

    for (const [cardKey, card] of Object.entries(legacy.cards)) {
      if (!card || typeof card !== 'object') continue;
      const { seen = 0, correct = 0, wrong = 0 } = card;
      if (seen <= 0) continue;

      // cardKey is "<groupId>:singular" or "<groupId>:plural"
      const colonIdx = cardKey.lastIndexOf(':');
      if (colonIdx === -1) continue;

      const groupId   = cardKey.slice(0, colonIdx);
      const numberStr = cardKey.slice(colonIdx + 1); // "singular" | "plural"

      // Map to the abbreviated suffix used in Item ids
      const suffix = numberStr === 'singular' ? 'sing'
                   : numberStr === 'plural'   ? 'plur'
                   : null;
      if (suffix === null) continue;

      const itemId = `article:def:${groupId}:${suffix}`;

      const mastery = seen > 0 ? clamp(correct / seen, 0.2, 0.95) : 0.2;

      const progress: ItemProgress = {
        seen,
        correct,
        wrong,
        mastery,
        difficulty:        0.8,
        stability:         0,
        streak:            0,
        recentLapses:      0,
        level:             0,
        consecutiveMisses: 0,
        lastResult:        null,
        lastSeen:          null,
        due:               null,
        averageResponseMs: null,
        skillIds:          ['article:def'],
      };

      store.items[itemId] = progress;
    }
  } catch (err) {
    // Migration failure is non-fatal; the fresh store is returned unchanged.
    console.warn('[storage] migrateLegacyStore: migration failed (non-fatal).', err);
  }
}

// ─── Typed field extractors (private) ────────────────────────────────────────
// These helpers keep the merge logic readable and type-safe without casting soup.

function _str(obj: unknown, key: string, fallback: string): string {
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === 'string' ? v : fallback;
}

function _num(obj: unknown, key: string, fallback: number): number {
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === 'number' ? v : fallback;
}

function _numOrNull(obj: unknown, key: string): number | null {
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === 'number' ? v : null;
}

function _obj<T extends object>(obj: unknown, key: string, fallback: T): T {
  const v = (obj as Record<string, unknown>)[key];
  return (typeof v === 'object' && v !== null && !Array.isArray(v)) ? v as T : fallback;
}

function _objOrUndef(obj: unknown, key: string): Record<string, unknown> | undefined {
  const v = (obj as Record<string, unknown>)[key];
  return (typeof v === 'object' && v !== null && !Array.isArray(v))
    ? v as Record<string, unknown>
    : undefined;
}

function _arr<T>(obj: unknown, key: string, fallback: T[]): T[] {
  const v = (obj as Record<string, unknown>)[key];
  return Array.isArray(v) ? v as T[] : fallback;
}

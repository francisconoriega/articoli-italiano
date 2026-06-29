# Storage & progress sync — how it works

This documents **where study progress lives, how it's shared, and how it behaves in
production**. The data shape itself (`ProgressStore`) is the contract in
[`src/types.ts`](src/types.ts); the logic is in [`src/engine/storage.ts`](src/engine/storage.ts).

## TL;DR

- Progress is saved to the browser's **`localStorage`** under the key `articoli-progreso-v1`.
- `localStorage` is **isolated by origin** = `scheme + host + port`. Different port / host /
  IP = a **separate** store. Different devices (phone vs laptop) = always separate.
- **In development**, a dev-only vite middleware unifies progress across ports via one shared
  file on disk — so testing in two `npm run dev` instances counts as one study history.
- **In production** (GitHub Pages) there is a single origin, so plain `localStorage` already
  unifies everything. The dev sync is **completely off** in the build.
- **Export / Import** (JSON) is the only way to move progress **across devices**.

## The data: `ProgressStore`

One object, persisted as JSON. Keyed collections plus metadata:

```
ProgressStore {
  appVersion, schemaVersion, courseId, exportedAt
  items:    Record<itemId, ItemProgress>   // per-item mastery + SRS (seen, mastery, level, stability, due, lastSeen, …)
  skills:   Record<skillId, SkillProgress>  // aggregate per skill bucket
  settings: Settings                        // timer, mode, assist, examDate, …
  history:  SessionRecord[]                 // last 50 finished rounds
}
```

`schemaVersion` (currently `1`) gates future migrations. See `src/types.ts` for the full shape.

## Local persistence (always on)

- `loadStoreAsync()` runs once at boot ([`src/main.ts`](src/main.ts)). It reads `localStorage`
  (migrating the legacy article-only key on first run), then — in dev only — merges any shared
  cross-port store (below).
- `saveStore()` runs after **every** answer: writes `localStorage` synchronously, then mirrors
  to the dev sync (no-op in prod).
- Restarting the dev server does **not** reset progress — the browser holds it, not the server.
  Only a change of *origin* (port/host/IP) shows a different store.

## Dev cross-port sync (the "broker")

**Problem it solves:** two `npm run dev` instances on different ports are different origins and
can't see each other's `localStorage`. **Mechanism:**

```
  app @ :5173 ─┐                              ┌─ GET  /__progress → read file
               ├─ fetch /__progress ──► vite middleware (vite.config.ts)
  app @ :5174 ─┘     (dev only)               └─ POST /__progress → MERGE-on-write → file
                                              shared file: ~/.articoli-progreso-dev.json
```

- The middleware lives in [`vite.config.ts`](vite.config.ts) with `apply: 'serve'` — it exists
  **only under `vite dev`** and is never in the production build.
- **Load:** `loadStoreAsync` GETs the shared file (≤600 ms timeout) and merges it into the local
  store by recency. Any failure → falls back to `localStorage`.
- **Save:** `saveStore` POSTs the store; the middleware **merges-on-write** (reads the current
  file, merges by recency via [`scripts/dev-progress-merge.mjs`](scripts/dev-progress-merge.mjs),
  writes). So two *active* instances **don't clobber** each other.
- **Merge rule (recency):** per item keep the newer `lastSeen`; per skill keep more `seen`;
  history concat + de-dupe + cap 50; settings stay device-local. Same rule client-side
  (`mergeStores`) and server-side (`mergeProgress`) — verified by
  `scripts/dev-progress-merge-harness.mjs` and the engine harnesses.

### Caveats (dev sync)

- **Reset doesn't propagate.** Merge-by-recency only *adds*/keeps-recent; clearing one instance
  won't delete from the shared file. To truly reset, delete `~/.articoli-progreso-dev.json`.
- **Any dev instance with this config joins the shared pool** — including throwaway/test servers.
  Editing `vite.config.ts` hot-reloads a *running* dev server into the sync.
- It's a **single-user, same-machine** convenience, not a multi-user backend.

## Production (GitHub Pages)

- Single origin → `localStorage` already unifies all visits. `import.meta.env.DEV` is `false`,
  so `devSyncEnabled()` returns false and **no `/__progress` request is ever made**. Even if one
  were, `fetch`/POST failures fall back to `localStorage` — nothing breaks.

## Export / Import (cross-device)

- **Exportar** downloads the full `ProgressStore` as `articoli-progreso-<date>.json`.
- **Importar** reads such a file and **merges it by recency** into the current progress (neither
  side loses data); an invalid file is rejected with a message.
- This is the supported way to move progress **between devices** (laptop ↔ phone), since
  `localStorage` never crosses browsers/devices on its own.

## Quick reference

| Action | Same progress? |
|---|---|
| Restart dev server on the **same** port | ✅ kept |
| Dev server on a **different** port (same machine) | ✅ unified via the dev sync |
| **Production** site, repeat visits (same browser) | ✅ localStorage |
| **Different device** (phone vs laptop) | ❌ — use Export/Import |
| `Reiniciar` (one instance) | clears that origin; dev shared file persists until deleted |

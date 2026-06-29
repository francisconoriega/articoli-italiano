# Testing the app safely (without touching real study progress)

> **Why this file exists:** the persistence layer is the one place a careless test can lose the
> user's real exam-prep progress (`~/.articoli-progreso-dev.json`, written by the dev cross-port
> sync). Before poking the app in a browser, read this. Full persistence details: [STORAGE.md](STORAGE.md).

## TL;DR

- **Automated / preview-tool testing → `npm run dev:test`.** The whole server instance runs in
  isolated test mode and the `/__progress` broker is removed, so it *cannot* write the real file.
- **Quick manual check on an already-running normal server → add `?claude-test` to the URL.**
- Never submit answers on a plain `npm run dev` instance — that writes the real shared file.

## The two ways to enable test mode

### 1. Server flag — `npm run dev:test`  ✅ recommended for automation

```bash
npm run dev:test        # = VITE_CLAUDE_TEST=1 vite
```

- The **whole instance** is in test mode, every tab, regardless of URL.
- `vite.config.ts` **drops the `/__progress` broker** → `POST /__progress` 404s → the server is
  *physically incapable* of reading or writing the real file.
- For the Claude preview tool, start the **`dev-test`** config in `.claude/launch.json`.

### 2. URL param — `?claude-test`

```
http://localhost:5173/?claude-test          # isolated, persists across reloads in the tab
http://localhost:5173/?claude-test=reset     # same, but wipes the test store first (clean slate)
```

- Lets you reuse a normal `npm run dev` for a one-off safe test, no restart.
- **Sticky:** once seen, it's mirrored to `sessionStorage`, so it survives a reload that drops the
  query string (the Claude preview tool reloads to the base URL — see the incident note below).

Either way: a separate localStorage key (`articoli-progreso-test-v1`), zero writes to the real
shared file, and a red `🧪 MODO PRUEBA` banner + `console.warn` + `documentElement.dataset.claudeTest`.

## Which is better, and why

**Use the server flag for anything automated; use the URL param for a quick manual poke.**

The progress is written in two layers — the **browser** (`saveStore` → localStorage + `POST /__progress`)
and the **server** (the vite middleware that actually writes the file). The two mechanisms reach
different layers:

| | `?claude-test` (URL) | `npm run dev:test` (server flag) |
|---|---|---|
| Who knows | only that **tab** | the **whole instance** (server + every tab) |
| Can the server still write the real file? | **yes** (broker live) | **no** (broker removed) |
| If the signal is lost (reload, link without it) | reverts to real writes ⚠️ **fail-open** | impossible to write real ✅ **fail-safe** |
| Needs a restart | no | yes |

The deciding principle is **fail-safe vs fail-open.** The URL param leaves the server fully capable
of writing real data and merely *asks* the client to opt out every navigation — lose the param and
the danger is back. The server flag **removes the capability**, so no slip can re-enable it.
Removing the capability beats relying on the client to opt out every time.

> **Implementation note:** the server flag is an **env var** (`VITE_CLAUDE_TEST=1`), not a CLI arg.
> A positional arg to vite (e.g. `vite claude-test`) would NOT reach the browser. Only an env var
> reaches *both* layers: `vite.config.ts` via `process.env`, and the client via `import.meta.env`.

## ⚠️ Incident that motivated the server flag (2026-06-29)

While verifying with the Claude preview tool over `?claude-test`, the tool reloaded the page to the
base URL (`/`) on a snapshot — silently dropping the query param. A subsequent click was then made
in (now) non-test mode and wrote one item to the real file. Caught via a backup-sha diff and fully
restored. **Lesson, baked into the design:** for the preview tool, use `dev:test` (no URL
dependency). Always back up first regardless: `cp ~/.articoli-progreso-dev.json <scratchpad>` + sha.

## Verifying changes without a browser

In a worktree, `npm run dev` can hit a Vite/rolldown dep-optimizer error. Lean on:

- `npm run check` — svelte-check + tsc (keep clean).
- `npx tsx scripts/*-harness.ts` — pure-node regression harnesses. The test-mode isolation contract
  is guarded by `scripts/test-mode-harness.ts` (23 checks, incl. the sticky regression).
- `npm run build` — sidesteps the dev dep-optimizer.

# Articoli Italiano — status & backlog

> Living checklist. The full design rationale lives in **[claude-PLAN.md](claude-PLAN.md)**;
> this file tracks what's shipped vs. next so any session can pick up cold. (The
> in-app/harness task list is ephemeral; this is the durable record.)

Run: `npm run dev` (http://localhost:5173/). Verify: `npm run check` must be clean.
Architecture: strict `content/` → `engine/` → `lib/` separation; contract in `src/types.ts`.

## Phase 1A — SHIPPED ✅ (committed)

- Vite + Svelte 5 (runes) + TS scaffold; visual system ported; legacy app under `legacy/`.
- `src/types.ts` contract; `content/` (73 nouns + indefinite, 41 verb tables, body vocab,
  pronouns, verbatim exam sentences) → **568 atomic items**.
- Engine: numbers (cardinals 1–100 + ordinals 1–10 + elisions + `cardinalLesson`),
  accent-tolerant `validate`, `mastery` + **per-item level state machine**, versioned
  `storage` (+ legacy migration), `items` generators, weighted `select`, `session`, MC `choices`.
- Lanes: Mixto / Verbos / Artículos / Números / Vocabulario. Typed + accent-tolerant answers.
- **Adaptive per-word difficulty**: L0–L1 multiple-choice + Spanish gloss → L2 free typing.
  Promote on a correct; demote only after **2 consecutive misses** on that item (no cascade).
- Unified card anatomy (hero = verb lemma / numeral / blanked phrase → meaning → task → answer).
- Same-verb MC distractors; nearby-number distractors. Badges (irregular/modal/-isc;
  det/indet + sing/plur; cardinal/ordinal + excepción) with tooltips; article placeholders.
- Anchored 3s correction banner; verb meaning in results; number-family lesson; grammar notes.
- Insights panel: weak **words** + weak **skills**. Round summary. localStorage persistence.

## Phase 1B — NEXT

- [ ] **Adaptive study scheduler ("the tutor")** — two-level topic scheduler, spaced repetition (decay),
      a session composer (focused mini-lessons + interleaved spaced review, 50/50), weak-remediation,
      and the conjugation-table sidebar. **The next big build** (subsumes Exam-Drill; pulls Phase-2
      SRS/dashboard forward). See **[claude-SCHEDULER-BRIEF.md](claude-SCHEDULER-BRIEF.md)**.
- [ ] **Ex2 — gender/number endings** (agreement lane). See **[claude-EX2-BRIEF.md](claude-EX2-BRIEF.md)**.
- [ ] **Export / import** progress JSON (merge by recency; the structure is in `ProgressStore`).
- [ ] **Exam-Drill mode** — compose a round in sample-test proportions (verbs ~35% / articles ~15%
      / endings ~15% / essere-avere ~15% / numbers ~10% / body ~10%); two-stage selection
      (pick lane by proportion, then weight within lane).
- [ ] Migrate the remaining `legacy/data.js` nouns if any are missing; add indefinite-plural if exam needs it.
- [ ] Richer round summary grouped by skill; a small dashboard (stage counts, accuracy trend).

## Phase 2 — LATER

- Broader Unità 1–2 content (nationalities/family/food; days/time/house/transport; prepositions;
  numbers → 2000 + more ordinals); reading-comprehension + matching/banked-cloze.
- Real SRS (use `stability`/`due`, currently inert); skill-rollup dashboard.
- Vitest suites (numbers incl. ventuno/ventotto/ventitré, validate, mastery, selection, generators,
  storage migration, content validation). Browser-automation full-flow.
- GitHub Actions Pages deploy (vite `base` is already env-dependent).

## Notes
- Per-device progress; no export yet → warn before clearing site data (1B export fixes this).
- A rival implementation exists at `/Users/francisco/.codex/worktrees/b7c6/Articoli Italiano`
  (broader: ships Ex2 + dashboard + export; weaker on per-item hysteresis & same-verb distractors).
  Build 1B features INDEPENDENTLY first, then cross-compare to avoid bias.

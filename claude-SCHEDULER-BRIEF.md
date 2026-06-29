# Build brief — the adaptive study scheduler ("the tutor")

Evolve *Articoli Italiano* from **weighted-random + per-item adaptive difficulty** into a
real **two-level tutor**: topic-aware scheduling, spaced repetition (decay), a session
**composer** that blends focused mini-lessons with interleaved spaced review, focused
weak-remediation, and a conjugation-table sidebar. This is a **core-loop change** — keep
`npm run check` green at every step and keep the app usable throughout (build additively).

## Where you are
- Repo `/Users/francisco/Documents/Articoli Italiano`, branch `claude/priceless-shamir-a8b719`
  (work in a worktree off it; it has the committed app + this brief). `npm install`, `npm run dev`
  (LAN host is on — reachable via the machine's IP). **`npm run check` must stay clean.**
- Read first: `claude-PLAN.md`, `TASKS.md`; `src/types.ts`; `src/engine/{mastery,select,session,choices,items}.ts`;
  `src/content/index.ts`; `src/lib/{App,Practice}.svelte`, `src/lib/promptView.ts`; the memory note
  `articoli-italiano-architecture`. Note: `session.curriculumFilter` already gates number compounds —
  fold that into topic locks.

## Pedagogical foundations — do NOT lose these (they justify every decision)
- **Acquire BLOCKED → retain INTERLEAVED + SPACED.** Massed/blocked practice (drill a verb's whole
  table at once) is great for *first acquisition* but gives poor long-term retention on its own;
  interleaving + spacing is what makes memory durable. Sequence BOTH: a focused mini-lesson to
  acquire, then fold that group into the interleaved, spaced review pool.
- **Spacing / SRS (the "decay").** Items resurface on expanding intervals to verify retention; nothing
  is abandoned, just pushed to longer intervals. This is the mechanism that converts a cram into memory.
- **Testing effect.** Retrieval practice is the strongest retention lever → do NOT show the answer (the
  conjugation table) during a review *test*; show it while *learning* and in *feedback* only.
- **Mastery learning.** Gate progression; measure "mastered" on **typed (production)** success, not MC
  (lucky guesses inflate it — our per-item level already requires reaching L2/typing).
- **Weak-remediation = focus, not weight.** A missed item needs a focused burst (it + its topic
  siblings, soon and repeatedly), not merely a higher weight in a 568-item lottery. The current pain
  ("I see weak words in 'A reforzar' but they don't come back") is exactly this: weighting ≠ focusing.

## Decisions already made (from the brainstorm)
- **Blend = 50/50** focused (mini-lesson / remediation) vs interleaved (spaced review + a little new).
- **Exam date = an OPTIONAL knob** (`Settings.examDate`), OFF by default. When set, it ramps the blend
  toward review/coverage (cram) as the date nears. **Do NOT hardcode any date.** (Context: the user's
  exam is Wed 2026-07-01, but the app must keep working afterward — hence a knob, not a hardcode.)
- **Conjugation table** in the info sidebar: visible during that verb's mini-lesson (Learning) and in
  feedback; hidden during interleaved review test (optionally behind a "peek" that's logged as a hint).
- Give a satisfying **mini-lesson completion beat** ("¡Verbo dominado!") — the motivation half of 50/50.

## Build plan
1. **Topic model** — add `topic: string` to `Item`; assign in the `items.ts` generators:
   - verbs (incl. essere/avere) → `verb:<infinitive>`
   - numbers → `num:<band>` where band ∈ {ones (1–10), teens (11–19), tens (round 20–90), compound, hundreds, ordinal}
   - articles → `article:<rule>` (the noun's explanation-rule key, or `article:regular`) so a noun's 3 items stay together
   - vocab → `vocab:<category>` (body); pronouns → `pronoun`; exam sentence items → `verb:<lemma>` when they have one, else `exam`
   Compute **topic state** (locked / new / learning / reviewing / mastered) from a topic's items'
   aggregate (fraction seen, fraction at L2/typed, avg mastery). Locks honor prerequisites (numbers).
2. **SRS spacing/decay** (`engine/mastery.ts` or new `engine/srs.ts`) — re-tune `stability`/`due` to a
   COMPRESSED exam-week ladder (e.g. 3m → 8m → 25m → 90m → 6h → 24h → 72h; relapse ≈ 1–2m). Treat
   `stability` as a step counter (++ on success, reset/-2 on lapse). Add `isDue(progress, now)`.
3. **`engine/scheduler.ts` — `composeRound(allItems, store, settings, now, size)`** → an ordered
   `Item[]` round:
   - choose a **focus topic** (priority: a topic with consecutive weak misses → remediation; else a
     Learning topic → acquisition; else the next New topic).
   - buckets: **focus mini-lesson block** (focus topic's unseen/weak items in pedagogical order, served
     *consecutively*); **interleaved due-review** (`isDue` items across topics, most-overdue first); a
     **little new** (next not-started topic). The within-round recent-miss requeue still applies.
   - compose ~**50/50** blocked vs interleaved; apply the `examDate` ramp (more review/coverage as it
     nears). Dedup; fill to `size` from a weak-weighted fallback. Also export `topicState(...)` for the UI.
4. **Session integration** — `session` holds the composed plan; `next()` serves it (recent-miss still
   overrides); expose `currentTopic`, `isMiniLesson`, and the round's focus topic. Keep the existing
   `chooseNext` as a fallback if the plan underfills. Persist as today (no schema break; add fields
   defensively with `?? defaults`).
5. **UI**
   - **Conjugation-table sidebar**: when the current item's topic is `verb:<inf>`, render that verb's
     present-tense table (from `content` verbs) in the info panel — during its mini-lesson + in feedback;
     hidden during a review test. Highlight the row being asked once answered.
   - **Mini-lesson indicator** ("Lección: fare" + progress) and the completion beat.
   - Surface **topic progress** (learning/reviewing/mastered) in the insights panel alongside the
     existing weak-words / weak-skills lists.
   - A minimal **examDate** setting (date input or "exam en N días" toggle).
6. **Verify** — `npm run check` clean; a `tsx` harness for `composeRound` (blend ≈ 50/50, due items
   prioritized, mini-lesson items grouped consecutively, focus = weakest topic) and `isDue`; browser:
   mini-lesson blocks served consecutively, due items resurface, a repeatedly-missed word gets a focused
   burst, the conjugation sidebar shows/hides per learning-vs-review, progress survives reload. Commit.

## Guardrails
- It's a core rewrite days before a real exam — **additive, reversible, check-green at every step**;
  never leave the app unusable between commits.
- Don't over-block: the composer must FORCE interleaved review even while a mini-lesson is active.
- Cross-reference (optional, after yours works): the rival at `/Users/francisco/.codex/worktrees/b7c6/Articoli Italiano`
  uses sequential number-lesson unlock + a two-stage exam selection — worth a look for ideas, not to copy.

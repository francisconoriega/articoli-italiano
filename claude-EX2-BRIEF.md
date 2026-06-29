# Build brief — Ex2: gender/number endings (agreement lane)

You are implementing **Phase 1B, Exercise 2** of *Articoli Italiano*: adjective/noun
**gender & number agreement** ("terminaciones"), as a new practice lane integrated into
the existing 1A app. **Build it INDEPENDENTLY** — do NOT look at any other implementation
until yours is finished and verified; the user will cross-compare afterward to avoid bias.

## Where you are
- Repo: `/Users/francisco/Documents/Articoli Italiano`, branch `claude/priceless-shamir-a8b719`
  (work in a worktree off it). The full, committed 1A app lives here. `npm install` then
  `npm run dev` (http://localhost:5173/). **`npm run check` must stay clean.**
- Read first, in order:
  1. `claude-PLAN.md` (roadmap; Ex2 = "agreement", a Heavy/multi-blank task) and `TASKS.md`.
  2. `src/types.ts` — the contract. **`AgreementEntry` and the `'agreement'` ItemKind already
     exist.** `AgreementEntry = { id, phrase, answers, gloss?, skills, unit, examWeight?, source? }`
     where `phrase` marks each blank with a single `_` (e.g. `"l'amic_ messican_ di Laura"`) and
     `answers` are the endings in order (e.g. `["a","a"]`). So `phrase.split('_').length === answers.length + 1`.
  3. `src/engine/items.ts` (generators + `buildItems`), `src/content/index.ts` (assembles the
     catalog; `agreement: []` is the placeholder + has `validateCatalog`).
  4. `src/lib/promptView.ts`, `src/lib/exercises/TypeAnswer.svelte`, `src/lib/exercises/Choice.svelte`,
     `src/lib/Practice.svelte`, `src/App.svelte` — the unified card anatomy + Choice/TypeAnswer switch.
  5. `src/engine/mastery.ts` (per-item **level** machine: L0–L1 MC+gloss → L2 typing; promote on
     correct, demote after 2 consecutive misses), `src/engine/choices.ts` (`presentationFor`,
     `buildChoices`), `src/engine/validate.ts` (accent-tolerant `checkAnswer`).
  6. The memory note `articoli-italiano-architecture` if available.

## Grammar (what Ex2 tests)
Adjectives/nouns agree in **gender + number** with the noun:
- **-o / -a class:** masc sing `-o` → plur `-i` (ragazzo→ragazzi, italiano→italiani);
  fem sing `-a` → plur `-e` (ragazza→ragazze, messicana→messicane).
- **-e class** (both genders): sing `-e` → plur `-i` (felice→felici, semplice→semplici, grande→grandi).
- The adjective copies the noun's gender+number, e.g. `le sorelle felici` (fem plur: noun -a→-e, adj -e→-i).

## Exam ground truth (seed these VERBATIM, `source:["exam:e2.N"]`, examWeight high)
From the sample test, Esercizio 2 ("Completa le parole inserendo il genere e il numero corretti"):
1. `Paola è l'amic_ messican_ di Laura.` → **a, a** (l'amic**a** messican**a**) — fem sing, -o/-a adj
2. `Le sorell_ di Giorgio sono sempre felic_.` → **e, i** (sorell**e** felic**i**) — fem plur, -e adj
3. `Mi piacciono le pizz_ semplic_.` → **e, i** (pizz**e** semplic**i**) — fem plur, -e adj
4. `Giulia è simpatic_ e Matteo è antipatic_.` → **a, o** (simpatic**a** … antipatic**o**) — fem sing + masc sing
5. `Non mi piace l'acqua fredd_.` → **a** (acqua fredd**a**) — fem sing, -o/-a adj

(Note #4 has two blanks across two clauses — both go in one item's `answers`.)

## Content to author (`src/content/agreement.ts`)
- The 5 exam phrases above (verbatim).
- ~15–25 more `AgreementEntry` covering all 4 cells × both adjective classes:
  masc-sing (-o/-o), fem-sing (-a/-a), masc-plur (-i/-i), fem-plur (-e/-i for -e adj; -e/-e via noun-e+adj? no:
  fem-plur with -o/-a adj = noun -e + adj -e, e.g. `le case rosse`). Reuse nouns/adjectives the learner
  already meets in `content/articles.ts`/`verbs`. Tag skills like `agreement:fem-plural`, `agreement:adj-e`,
  `agreement:adj-oa`. Keep them unambiguous and correct.
- Wire `agreement` into `content/index.ts` (replace the `[]`), and extend `validateCatalog` to assert
  `phrase.split('_').length === answers.length + 1` and answers non-empty.

## Engine + renderer
- **Generator** (`items.ts` → `agreementToItems`): emit one `Item` per entry, `kind:'agreement'`.
  Our `Item.answer` is a single string — decide how to carry N endings. Cleanest options: store the
  full corrected phrase as `answer` and the per-blank endings in a small new optional field on
  `ItemPrompt` (e.g. `blanks?: string[]`), OR join endings (`answers.join('|')`) and split in the
  validator. Pick one, keep it typed, document it. Skills from the entry + derived gender/number.
- **Presentation**: reuse the per-item level model. **L0–L1 → multiple-choice**, **L2 → typing**.
  - MC distractors (`choices.ts`): generate plausible WRONG ending-sets by flipping gender/number
    (e.g. correct `a,a` → distractors `a,o` / `e,i` / `o,a`). Render each option as the **full phrase**
    with those endings filled in (so the learner reads it in context, not bare letters). 4 options.
  - Typing: one small input per blank, inline in the phrase; auto-advance focus between blanks;
    submit joins them. Accent-tolerance via `checkAnswer` per blank (endings are vowels; usually no accents).
- **Card anatomy**: hero = the phrase with inline blanks (like the article hero). Badges via the
  existing system: **Femenino/Masculino + Singular/Plural** (+ optionally the adjective class). Gloss =
  the Spanish translation, shown at L0–L1 per the gloss rule. Feedback: show the corrected phrase + a
  one-line rule (add an `agreement` entry to the explanation rules in `content/index.ts`).
- Add the **Concordancia** lane button in `Practice.svelte` (`poolForMode` already filters by kind;
  add `'agreement'` handling) and make sure `App.svelte` keyboard (digit hotkeys for choice, Enter to
  advance) works for the multi-blank renderer.

## Verify (required)
- `npm run check` clean (0 errors/0 warnings).
- Browser: the Concordancia lane renders; MC shows full-phrase options with correct/wrong marking;
  typing mode takes per-blank input; the 5 exam items appear and grade correctly; a near/wrong shows
  the corrected phrase + rule; progress survives reload. A small node/tsx harness over the generator
  (unique ids, `phrase`↔`answers` arity) is a plus.

## Only AFTER yours is done and verified
Cross-compare with the rival at `/Users/francisco/.codex/worktrees/b7c6/Articoli Italiano`
(`src/content/agreement.ts`, `src/engine/options.ts`, `src/lib/exercises/AgreementAnswer.svelte`) and
report differences + anything worth adopting. Not before — keep the build unbiased.

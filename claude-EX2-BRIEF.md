# Build brief — Ex2: gender/number endings (agreement lane)

You are implementing **Exercise 2** of *Articoli Italiano*: adjective/noun **gender & number
agreement** ("concordancia"), as a new practice lane integrated into the existing app.
**Build it INDEPENDENTLY** — do NOT look at any other implementation until yours is finished
and verified; the user will cross-compare afterward to avoid bias.

> **Run this AFTER the scheduler ("tutor") build lands.** The scheduler restructures the core
> loop and adds a **required `topic` field to every `Item`**, plus topic-grouped mini-lessons +
> spaced repetition. Branch from the latest state that includes it so you inherit those changes.
> You do NOT build any scheduling here — you just make agreement items good citizens of the tutor.

## Where you are
- Repo `/Users/francisco/Documents/Articoli Italiano`, branch `claude/priceless-shamir-a8b719`
  (work in a worktree off the latest commit that includes the scheduler). `npm install`,
  `npm run dev` (LAN host is on). **`npm run check` must stay clean.**
- Read first, in order:
  1. `claude-PLAN.md` (roadmap), `TASKS.md`, and **`claude-SCHEDULER-BRIEF.md`** (so you understand
     topics, mini-lessons, and how the composer schedules items).
  2. `src/types.ts` — the contract. **`AgreementEntry` and the `'agreement'` ItemKind already exist**,
     and **`Item.topic` is now required**. `AgreementEntry = { id, phrase, answers, gloss?, skills,
     unit, examWeight?, source? }`, where `phrase` marks each blank with a single `_`
     (e.g. `"l'amic_ messican_ di Laura"`) and `answers` are the endings in order (`["a","a"]`); so
     `phrase.split('_').length === answers.length + 1`.
  3. `src/engine/items.ts` (generators + `buildItems`; see how each generator now sets `topic`),
     `src/content/index.ts` (assembles the catalog; `agreement: []` placeholder + `validateCatalog`).
  4. `src/engine/scheduler.ts` + `src/engine/session.ts` (how rounds are composed and served — you
     won't change these much, but your items must fit them), `src/engine/select.ts`
     (`poolForMode` — add the `agreement` lane), `src/engine/choices.ts` (`buildChoices`),
     `src/engine/validate.ts` (accent-tolerant `checkAnswer`), `src/engine/mastery.ts` (per-item
     level + SRS).
  5. `src/lib/promptView.ts`, `src/lib/exercises/{TypeAnswer,Choice}.svelte`, `src/lib/Practice.svelte`,
     `src/App.svelte` — the unified card anatomy + Choice/TypeAnswer switch. Memory note
     `articoli-italiano-architecture`.

## Grammar (what Ex2 tests)
Adjectives/nouns agree in **gender + number** with the noun:
- **-o / -a class:** masc sing `-o` → plur `-i` (ragazzo→ragazzi, italiano→italiani);
  fem sing `-a` → plur `-e` (ragazza→ragazze, messicana→messicane).
- **-e class** (both genders): sing `-e` → plur `-i` (felice→felici, semplice→semplici, grande→grandi).
- The adjective copies the noun's gender+number, e.g. `le sorelle felici` (fem plur: noun -a→-e, adj -e→-i).

## Exam ground truth (seed VERBATIM, `source:["exam:e2.N"]`, examWeight high)
Esercizio 2 ("Completa le parole inserendo il genere e il numero corretti"):
1. `Paola è l'amic_ messican_ di Laura.` → **a, a** (l'amic**a** messican**a**) — fem sing, -o/-a adj
2. `Le sorell_ di Giorgio sono sempre felic_.` → **e, i** (sorell**e** felic**i**) — fem plur, -e adj
3. `Mi piacciono le pizz_ semplic_.` → **e, i** (pizz**e** semplic**i**) — fem plur, -e adj
4. `Giulia è simpatic_ e Matteo è antipatic_.` → **a, o** (simpatic**a** … antipatic**o**) — fem sing + masc sing
5. `Non mi piace l'acqua fredd_.` → **a** (acqua fredd**a**) — fem sing, -o/-a adj

(#4 has two blanks across two clauses — both endings go in that item's `answers`.)

## Content to author (`src/content/agreement.ts`)
- The 5 exam phrases above (verbatim).
- ~15–25 more `AgreementEntry` covering all 4 cells × both adjective classes:
  masc-sing (-o/-o), fem-sing (-a/-a), masc-plur (-i/-i), fem-plur with -e adj (-e/-i) and with
  -o/-a adj (noun -e + adj -e, e.g. `le case rosse`). Reuse familiar nouns/adjectives. Tag skills like
  `agreement:fem-plural`, `agreement:adj-e`, `agreement:adj-oa`. Keep them unambiguous and correct.
- Wire `agreement` into `content/index.ts` (replace `[]`); extend `validateCatalog` to assert
  `phrase.split('_').length === answers.length + 1` and non-empty answers.

## Engine + renderer
- **Generator** (`items.ts` → `agreementToItems`): emit one `Item` per entry, `kind:'agreement'`, and
  **set `topic`** so the tutor can group it into a mini-lesson + schedule it. Use the agreement CELL as
  the topic: `` topic = `agreement:${gender === 'f' ? 'fem' : 'masc'}-${number === 'singular' ? 'sing' : 'plural'}` `` (so "drill all fem-plural endings" is a coherent mini-lesson). Carry the entry's skills
  + derived gender/number badges. Our `Item.answer` is a single string — decide how to carry N endings:
  cleanest is the corrected full phrase as `answer` plus the per-blank endings in a small optional field
  on `ItemPrompt` (e.g. `blanks?: string[]`), OR join (`answers.join('|')`) and split in the validator.
  Pick one, keep it typed, document it.
- **Presentation** (reuse the per-item level model + SRS — you get mini-lessons & spacing for free once
  `topic`/skills/progress are set):
  - **L0–L1 → multiple-choice**: distractors = plausible WRONG ending-sets by flipping gender/number
    (correct `a,a` → `a,o` / `e,i` / `o,a`), rendered as the **full phrase** with those endings filled in
    (context, not bare letters). 4 options.
  - **L2 → typing**: one small input per blank, inline in the phrase; auto-advance focus between blanks;
    submit joins them; accent-tolerant `checkAnswer` per blank.
- **Card anatomy**: hero = the phrase with inline blanks (like the article hero). Badges:
  **Femenino/Masculino + Singular/Plural** (+ optionally adjective class). Gloss = the Spanish
  translation (shown at L0–L1). Feedback: corrected phrase + a one-line rule (add an `agreement`
  explanation to `content/index.ts`'s rules).
- **Lane**: add the **Concordancia** lane — `'agreement'` handling in `select.poolForMode` and the lane
  button in `Practice.svelte`. The scheduler/composer iterates all items+topics, so agreement topics
  will appear in mini-lessons/review automatically once items exist. Make the keyboard (digit hotkeys
  for choice; Enter/Space to advance) work for the multi-blank renderer.

## Verify (required)
- `npm run check` clean (0 errors/0 warnings).
- Browser: the Concordancia lane renders; MC shows full-phrase options with correct/wrong marking;
  typing mode takes per-blank input; the 5 exam items appear and grade correctly; a near/wrong shows
  the corrected phrase + rule; agreement items show up inside the scheduler's mini-lessons/review (not
  just the lane); progress survives reload. A small `tsx` harness over the generator (unique ids,
  `phrase`↔`answers` arity, every item has a `topic`) is a plus.

## Only AFTER yours is done and verified
Cross-compare with the rival at `/Users/francisco/.codex/worktrees/b7c6/Articoli Italiano`
(`src/content/agreement.ts`, `src/engine/options.ts`, `src/lib/exercises/AgreementAnswer.svelte`) and
report differences + anything worth adopting. Not before — keep the build unbiased.

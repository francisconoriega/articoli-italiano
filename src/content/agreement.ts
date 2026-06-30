/**
 * content/agreement.ts — gender/number agreement endings (exam Ex2, "concordancia").
 *
 * Each entry is a phrase whose noun/adjective endings the learner must complete. A
 * blank is a single `_` inside `phrase`; `answers` lists the endings in order, so the
 * invariant `phrase.split('_').length === answers.length + 1` holds (asserted by
 * content/index.ts → validateCatalog). The grammar tested (per the brief):
 *
 *   -o/-a class:  masc sing -o → plur -i;  fem sing -a → plur -e.
 *   -e   class:   sing -e → plur -i (both genders).
 *   The adjective copies the noun's gender + number.
 *
 * `gender`/`number` mark the agreement CELL (used for the topic + badges). Phrase #4
 * mixes two cells across two clauses, so it leaves them undefined and relies on skills.
 *
 * Skill tags follow the brief's convention:
 *   agreement:<cell>        — fem-sing | fem-plural | masc-sing | masc-plural
 *   agreement:adj-oa        — the adjective is -o/-a class
 *   agreement:adj-e         — the adjective is -e class
 */
import type { AgreementEntry } from '../types'

export const agreement: AgreementEntry[] = [
  /* ── The 5 exam phrases, VERBATIM (Esercizio 2) ─────────────────────────────── */
  {
    id: 'agreement:exam-1',
    phrase: 'Paola è l\'amic_ messican_ di Laura.',
    answers: ['a', 'a'],
    gloss: 'Paola es la amiga mexicana de Laura.',
    gender: 'f',
    number: 'singular',
    unit: 1,
    examWeight: 5,
    skills: ['agreement:fem-sing', 'agreement:adj-oa'],
    source: ['exam:e2.1'],
  },
  {
    id: 'agreement:exam-2',
    phrase: 'Le sorell_ di Giorgio sono sempre felic_.',
    answers: ['e', 'i'],
    gloss: 'Las hermanas de Giorgio son siempre felices.',
    gender: 'f',
    number: 'plural',
    unit: 1,
    examWeight: 5,
    skills: ['agreement:fem-plural', 'agreement:adj-e'],
    source: ['exam:e2.2'],
  },
  {
    id: 'agreement:exam-3',
    phrase: 'Mi piacciono le pizz_ semplic_.',
    answers: ['e', 'i'],
    gloss: 'Me gustan las pizzas sencillas.',
    gender: 'f',
    number: 'plural',
    unit: 1,
    examWeight: 5,
    skills: ['agreement:fem-plural', 'agreement:adj-e'],
    source: ['exam:e2.3'],
  },
  {
    // Two clauses, two cells (fem sing + masc sing) — gender/number left undefined.
    id: 'agreement:exam-4',
    phrase: 'Giulia è simpatic_ e Matteo è antipatic_.',
    answers: ['a', 'o'],
    gloss: 'Giulia es simpática y Matteo es antipático.',
    unit: 1,
    examWeight: 5,
    skills: ['agreement:fem-sing', 'agreement:masc-sing', 'agreement:adj-oa'],
    source: ['exam:e2.4'],
  },
  {
    id: 'agreement:exam-5',
    phrase: 'Non mi piace l\'acqua fredd_.',
    answers: ['a'],
    gloss: 'No me gusta el agua fría.',
    gender: 'f',
    number: 'singular',
    unit: 1,
    examWeight: 5,
    skills: ['agreement:fem-sing', 'agreement:adj-oa'],
    source: ['exam:e2.5'],
  },

  /* ── Fem singular (-a noun) ─────────────────────────────────────────────────── */
  {
    id: 'agreement:fs-oa-1',
    phrase: 'La ragazz_ italian_ studia a Roma.',
    answers: ['a', 'a'],
    gloss: 'La chica italiana estudia en Roma.',
    gender: 'f',
    number: 'singular',
    unit: 1,
    examWeight: 2,
    skills: ['agreement:fem-sing', 'agreement:adj-oa'],
  },
  {
    id: 'agreement:fs-oa-2',
    phrase: 'La cas_ ross_ è grande.',
    answers: ['a', 'a'],
    gloss: 'La casa roja es grande.',
    gender: 'f',
    number: 'singular',
    unit: 1,
    examWeight: 2,
    skills: ['agreement:fem-sing', 'agreement:adj-oa'],
  },
  {
    id: 'agreement:fs-e-1',
    phrase: 'La lezion_ è difficil_.',
    answers: ['e', 'e'],
    gloss: 'La lección es difícil.',
    gender: 'f',
    number: 'singular',
    unit: 1,
    examWeight: 2,
    skills: ['agreement:fem-sing', 'agreement:adj-e'],
  },
  {
    id: 'agreement:fs-e-2',
    phrase: 'La sorell_ giovan_ canta bene.',
    answers: ['a', 'e'],
    gloss: 'La hermana joven canta bien.',
    gender: 'f',
    number: 'singular',
    unit: 1,
    examWeight: 2,
    skills: ['agreement:fem-sing', 'agreement:adj-e'],
  },

  /* ── Fem plural ─────────────────────────────────────────────────────────────── */
  {
    id: 'agreement:fp-oa-1',
    phrase: 'Le cas_ ross_ sono grandi.',
    answers: ['e', 'e'],
    gloss: 'Las casas rojas son grandes.',
    gender: 'f',
    number: 'plural',
    unit: 1,
    examWeight: 2,
    skills: ['agreement:fem-plural', 'agreement:adj-oa'],
  },
  {
    id: 'agreement:fp-oa-2',
    phrase: 'Le ragazz_ american_ visitano il museo.',
    answers: ['e', 'e'],
    gloss: 'Las chicas americanas visitan el museo.',
    gender: 'f',
    number: 'plural',
    unit: 1,
    examWeight: 2,
    skills: ['agreement:fem-plural', 'agreement:adj-oa'],
  },
  {
    id: 'agreement:fp-e-1',
    phrase: 'Le lezion_ sono interessant_.',
    answers: ['i', 'i'],
    gloss: 'Las lecciones son interesantes.',
    gender: 'f',
    number: 'plural',
    unit: 1,
    examWeight: 2,
    skills: ['agreement:fem-plural', 'agreement:adj-e'],
  },
  {
    id: 'agreement:fp-e-2',
    phrase: 'Le amich_ simpatic_ arrivano oggi.',
    answers: ['e', 'he'],
    gloss: 'Las amigas simpáticas llegan hoy.',
    gender: 'f',
    number: 'plural',
    unit: 2,
    examWeight: 1,
    skills: ['agreement:fem-plural', 'agreement:adj-oa'],
  },

  /* ── Masc singular ──────────────────────────────────────────────────────────── */
  {
    id: 'agreement:ms-oa-1',
    phrase: 'Il ragazz_ italian_ gioca a calcio.',
    answers: ['o', 'o'],
    gloss: 'El chico italiano juega al fútbol.',
    gender: 'm',
    number: 'singular',
    unit: 1,
    examWeight: 2,
    skills: ['agreement:masc-sing', 'agreement:adj-oa'],
  },
  {
    id: 'agreement:ms-oa-2',
    phrase: 'Il libr_ nuov_ è sul tavolo.',
    answers: ['o', 'o'],
    gloss: 'El libro nuevo está sobre la mesa.',
    gender: 'm',
    number: 'singular',
    unit: 1,
    examWeight: 2,
    skills: ['agreement:masc-sing', 'agreement:adj-oa'],
  },
  {
    id: 'agreement:ms-e-1',
    phrase: 'Lo student_ è intelligent_.',
    answers: ['e', 'e'],
    gloss: 'El estudiante es inteligente.',
    gender: 'm',
    number: 'singular',
    unit: 2,
    examWeight: 1,
    skills: ['agreement:masc-sing', 'agreement:adj-e'],
  },
  {
    id: 'agreement:ms-e-2',
    phrase: 'Il can_ grand_ dorme.',
    answers: ['e', 'e'],
    gloss: 'El perro grande duerme.',
    gender: 'm',
    number: 'singular',
    unit: 2,
    examWeight: 1,
    skills: ['agreement:masc-sing', 'agreement:adj-e'],
  },

  /* ── Masc plural ────────────────────────────────────────────────────────────── */
  {
    id: 'agreement:mp-oa-1',
    phrase: 'I ragazz_ italian_ giocano a calcio.',
    answers: ['i', 'i'],
    gloss: 'Los chicos italianos juegan al fútbol.',
    gender: 'm',
    number: 'plural',
    unit: 1,
    examWeight: 2,
    skills: ['agreement:masc-plural', 'agreement:adj-oa'],
  },
  {
    id: 'agreement:mp-oa-2',
    phrase: 'I libr_ nuov_ sono sul tavolo.',
    answers: ['i', 'i'],
    gloss: 'Los libros nuevos están sobre la mesa.',
    gender: 'm',
    number: 'plural',
    unit: 1,
    examWeight: 2,
    skills: ['agreement:masc-plural', 'agreement:adj-oa'],
  },
  {
    id: 'agreement:mp-e-1',
    phrase: 'I professor_ gentil_ spiegano con calma.',
    answers: ['i', 'i'],
    gloss: 'Los profesores amables explican con calma.',
    gender: 'm',
    number: 'plural',
    unit: 2,
    examWeight: 1,
    skills: ['agreement:masc-plural', 'agreement:adj-e'],
  },
  {
    id: 'agreement:mp-e-2',
    phrase: 'Gli eserciz_ sono facil_.',
    answers: ['i', 'i'],
    gloss: 'Los ejercicios son fáciles.',
    gender: 'm',
    number: 'plural',
    unit: 2,
    examWeight: 1,
    skills: ['agreement:masc-plural', 'agreement:adj-e'],
  },
]

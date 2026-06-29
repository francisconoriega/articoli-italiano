/**
 * lessons.ts — frases temáticas (SentenceEntry) que reutilizan los renderers e
 * ItemKinds existentes, sin tocar el motor:
 *   §1  pronombre correcto a partir del sujeto (kind 'pronoun')
 *   §5  modal + infinitivo (kind 'verb-conjugation', solo cambia el modal)
 *   §6  léxico de prendere en contexto (kind 'verb-conjugation')
 *   §9  días de la semana — pistas relacionales (kind 'vocab')
 *
 * Todas las explicaciones son en español y originales (no copiadas de libros).
 */
import type { SentenceEntry } from '../types';

/* ── §1 — Elegir el pronombre a partir del sujeto ───────────────────────────── */
const pronounDrills: SentenceEntry[] = [
  {
    id: 'pron-loro-names',
    kind: 'pronoun',
    text: 'Sabina e Carla → ____',
    answer: 'loro',
    gloss: 'Dos personas de las que HABLAS → loro (ellas).',
    skills: ['pronoun', 'person:loro'],
    tags: ['rule:pron_voi_loro'],
    unit: 1,
    examWeight: 2,
  },
  {
    id: 'pron-voi-tu-e-x',
    kind: 'pronoun',
    text: 'Tu e Marco (te hablo a ti) → ____',
    answer: 'voi',
    gloss: '«tú y X» = voi (ustedes), porque la persona a la que hablas está en el grupo.',
    skills: ['pronoun', 'person:voi'],
    tags: ['rule:pron_voi_loro'],
    unit: 1,
    examWeight: 2,
  },
  {
    id: 'pron-noi-x-e-io',
    kind: 'pronoun',
    text: 'Marco e io → ____',
    answer: 'noi',
    gloss: '«X y yo» = noi (nosotros), porque tú estás en el grupo.',
    skills: ['pronoun', 'person:noi'],
    tags: ['rule:pron_voi_loro'],
    unit: 1,
    examWeight: 2,
  },
  {
    id: 'pron-loro-tutti',
    kind: 'pronoun',
    text: 'Tutti (vogliono ballare) → ____',
    answer: 'loro',
    gloss: '«tutti» = todos → loro (3.ª plural): tutti vogliono.',
    skills: ['pronoun', 'person:loro'],
    tags: ['rule:pron_group'],
    unit: 1,
    examWeight: 1,
  },
  {
    id: 'pron-lui-classe',
    kind: 'pronoun',
    text: 'La classe (comincia) → ____',
    answer: 'lui',
    accept: ['lei'],
    gloss: 'Un nombre colectivo singular (la classe) concuerda en 3.ª SINGULAR: la classe comincia.',
    skills: ['pronoun', 'person:lui'],
    tags: ['rule:pron_group'],
    unit: 1,
    examWeight: 1,
  },
  {
    id: 'pron-lei-courtesy',
    kind: 'pronoun',
    text: 'Scusi signora, di dove ____? (usted)',
    answer: 'Lei',
    accept: ['lei'],
    gloss: 'Cortesía: usted = Lei, siempre en 3.ª singular (como «usted» en español).',
    skills: ['pronoun', 'person:lui'],
    tags: ['rule:pron_courtesy'],
    unit: 1,
    examWeight: 2,
  },
];

/* ── §5 — Modal + infinitivo (solo se conjuga el modal) ─────────────────────── */
const modalDrills: SentenceEntry[] = [
  {
    id: 'modal-voglio-imparare',
    kind: 'verb-conjugation',
    text: 'Io ____ imparare l\'italiano.',
    lemma: 'volere',
    person: 'io',
    answer: 'voglio',
    gloss: 'Yo quiero aprender italiano. (solo cambia el modal; «imparare» queda en infinitivo)',
    skills: ['verb:volere', 'tense:presente', 'person:io', 'class:modal'],
    tags: ['rule:verb_modal'],
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'modal-non-possiamo-venire',
    kind: 'verb-conjugation',
    text: 'Noi non ____ venire stasera.',
    lemma: 'potere',
    person: 'noi',
    answer: 'possiamo',
    gloss: 'Nosotros no podemos venir esta noche.',
    skills: ['verb:potere', 'tense:presente', 'person:noi', 'class:modal'],
    tags: ['rule:verb_modal'],
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'modal-devi-andare',
    kind: 'verb-conjugation',
    text: 'Tu ____ andare dal medico.',
    lemma: 'dovere',
    person: 'tu',
    answer: 'devi',
    gloss: 'Tú debes ir al médico.',
    skills: ['verb:dovere', 'tense:presente', 'person:tu', 'class:modal'],
    tags: ['rule:verb_modal'],
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'modal-vogliono-suonare',
    kind: 'verb-conjugation',
    text: 'Loro ____ suonare la chitarra.',
    lemma: 'volere',
    person: 'loro',
    answer: 'vogliono',
    gloss: 'Ellos quieren tocar la guitarra. (NO «vogliono suonano»: el 2.º verbo queda en infinitivo)',
    skills: ['verb:volere', 'tense:presente', 'person:loro', 'class:modal'],
    tags: ['rule:verb_modal'],
    unit: 2,
    examWeight: 2,
  },
];

/* ── §6 — prendere en contexto (tomar/agarrar) ──────────────────────────────── */
const prendereDrills: SentenceEntry[] = [
  {
    id: 'lex-prendo-treno',
    kind: 'verb-conjugation',
    text: 'Io ____ il treno delle otto.',
    lemma: 'prendere',
    person: 'io',
    answer: 'prendo',
    gloss: 'Yo tomo el tren de las ocho. (prendere + transporte)',
    skills: ['verb:prendere', 'tense:presente', 'person:io'],
    tags: ['rule:lex_prendere'],
    unit: 1,
    examWeight: 2,
  },
  {
    id: 'lex-prende-caffe',
    kind: 'verb-conjugation',
    text: 'Lei ____ un caffè al bar.',
    lemma: 'prendere',
    person: 'lui',
    answer: 'prende',
    gloss: 'Ella toma un café en el bar. (prendere un caffè — muy frecuente)',
    skills: ['verb:prendere', 'tense:presente', 'person:lui'],
    tags: ['rule:lex_prendere'],
    unit: 1,
    examWeight: 2,
  },
  {
    id: 'lex-prendiamo-decisione',
    kind: 'verb-conjugation',
    text: 'Noi ____ una decisione importante.',
    lemma: 'prendere',
    person: 'noi',
    answer: 'prendiamo',
    gloss: 'Nosotros tomamos una decisión importante. (prendere una decisione)',
    skills: ['verb:prendere', 'tense:presente', 'person:noi'],
    tags: ['rule:lex_prendere'],
    unit: 1,
    examWeight: 1,
  },
];

/* ── §9 — Días de la semana: pistas relacionales ────────────────────────────── */
const dayDrills: SentenceEntry[] = [
  {
    id: 'day-after-lunedi',
    kind: 'vocab',
    text: 'El día después del lunes (lunedì)',
    answer: 'martedì',
    gloss: 'martes',
    skills: ['vocab:days'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'day-before-domenica',
    kind: 'vocab',
    text: 'El día antes del domingo (domenica)',
    answer: 'sabato',
    gloss: 'sábado',
    skills: ['vocab:days'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'day-seventh',
    kind: 'vocab',
    text: 'El séptimo día de la semana italiana',
    answer: 'domenica',
    gloss: 'el domingo (en la semana italiana lunedì es el primer día)',
    skills: ['vocab:days'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'day-fifth',
    kind: 'vocab',
    text: 'El quinto día de la semana italiana',
    answer: 'venerdì',
    gloss: 'el viernes',
    skills: ['vocab:days'],
    unit: 2,
    examWeight: 1,
  },
];

export const lessons: SentenceEntry[] = [
  ...pronounDrills,
  ...modalDrills,
  ...prendereDrills,
  ...dayDrills,
];

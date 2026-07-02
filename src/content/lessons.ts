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
/* Sin gloss: para adultos hispanohablantes el prompt + las opciones bastan; la pista
 * de desambiguación (cuando hace falta) va como paréntesis en el prompt, y la regla se
 * explica DESPUÉS de responder (banner por `tag`). En los verbos, el lemma ya se
 * muestra como hero (VOLERE, PRENDERE), así que el significado no hace falta. */
const pronounDrills: SentenceEntry[] = [
  {
    id: 'pron-loro-names',
    kind: 'pronoun',
    text: 'Sabina e Carla → ____',
    answer: 'loro',
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
    skills: ['vocab:days'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'day-before-domenica',
    kind: 'vocab',
    text: 'El día antes del domingo (domenica)',
    answer: 'sabato',
    skills: ['vocab:days'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'day-seventh',
    kind: 'vocab',
    text: 'El séptimo día de la semana italiana',
    answer: 'domenica',
    skills: ['vocab:days'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'day-fifth',
    kind: 'vocab',
    text: 'El quinto día de la semana italiana',
    answer: 'venerdì',
    skills: ['vocab:days'],
    unit: 2,
    examWeight: 1,
  },
];

/* ── §12 — Semana / fin de semana: pistas relacionales ──────────────────────── */
/* Prompt (español) + opciones bastan; sin gloss que traduzca la respuesta. */
const weekDrills: SentenceEntry[] = [
  {
    id: 'week-seven-days',
    kind: 'vocab',
    text: 'El período de siete días',
    answer: 'settimana',
    skills: ['vocab:calendar'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'week-weekend',
    kind: 'vocab',
    text: 'El sábado y el domingo juntos (sabato, domenica)',
    answer: 'fine settimana',
    accept: ['weekend'],
    skills: ['vocab:calendar'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'week-twelve-months',
    kind: 'vocab',
    text: 'El período de doce meses',
    answer: 'anno',
    skills: ['vocab:calendar'],
    unit: 2,
    examWeight: 1,
  },
];

/* ── §13 — Meses: pistas relacionales ───────────────────────────────────────── */
const monthDrills: SentenceEntry[] = [
  {
    id: 'month-after-marzo',
    kind: 'vocab',
    text: 'El mes después de marzo (marzo)',
    answer: 'aprile',
    skills: ['vocab:months'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'month-before-agosto',
    kind: 'vocab',
    text: 'El mes antes de agosto (agosto)',
    answer: 'luglio',
    skills: ['vocab:months'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'month-first',
    kind: 'vocab',
    text: 'El primer mes del año',
    answer: 'gennaio',
    skills: ['vocab:months'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'month-last',
    kind: 'vocab',
    text: 'El último mes del año',
    answer: 'dicembre',
    skills: ['vocab:months'],
    unit: 2,
    examWeight: 1,
  },
];

/* ── §14 — Estaciones: pistas relacionales ──────────────────────────────────── */
const seasonDrills: SentenceEntry[] = [
  {
    id: 'season-flowers',
    kind: 'vocab',
    text: 'La estación de las flores, entre el invierno y el verano',
    answer: 'primavera',
    skills: ['vocab:seasons'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'season-coldest',
    kind: 'vocab',
    text: 'La estación más fría (diciembre–febbraio)',
    answer: 'inverno',
    skills: ['vocab:seasons'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'season-hottest',
    kind: 'vocab',
    text: 'La estación más calurosa (giugno–agosto)',
    answer: 'estate',
    skills: ['vocab:seasons'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'season-leaves',
    kind: 'vocab',
    text: 'La estación en que caen las hojas',
    answer: 'autunno',
    skills: ['vocab:seasons'],
    unit: 2,
    examWeight: 1,
  },
];

/* ── §15 — Reglas del calendario (artículo habitual, preposiciones, prossimo/scorso) ─
 * Sin gloss: la pista mínima va en el prompt y la REGLA se explica después de
 * responder (banner por `tag`), no como pista que adelanta la respuesta. */
const calendarRuleDrills: SentenceEntry[] = [
  {
    id: 'cal-habitual-il-lunedi',
    kind: 'vocab',
    text: '____ lunedì vado in palestra. (todos los lunes, acción habitual)',
    answer: 'il',
    distractors: ['lo', 'la', 'i'],
    skills: ['vocab:days'],
    tags: ['rule:day_article_habitual'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'cal-prep-month',
    kind: 'vocab',
    text: '____ agosto vado in Italia. (en agosto)',
    answer: 'a',
    accept: ['in'],
    distractors: ['di', 'da', 'con'],
    skills: ['vocab:months'],
    tags: ['rule:month_preposition'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'cal-prep-season',
    kind: 'vocab',
    text: '____ inverno nevica. (en invierno)',
    answer: 'in',
    distractors: ['a', 'di', 'da'],
    skills: ['vocab:seasons'],
    tags: ['rule:season_preposition'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'cal-next-week',
    kind: 'vocab',
    text: 'La settimana ____. (la próxima, la que viene)',
    answer: 'prossima',
    distractors: ['prossimo', 'scorsa', 'scorso'],
    skills: ['vocab:calendar'],
    tags: ['rule:time_next_last'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'cal-last-year',
    kind: 'vocab',
    text: 'L\'anno ____. (el pasado)',
    answer: 'scorso',
    distractors: ['scorsa', 'prossimo', 'prossima'],
    skills: ['vocab:calendar'],
    tags: ['rule:time_next_last'],
    unit: 2,
    examWeight: 1,
  },
];

/* ── §16 — Fechas: «il + número + mes» (el 1.º es ORDINAL) ───────────────────── */
const dateDrills: SentenceEntry[] = [
  {
    id: 'date-2-june',
    kind: 'vocab',
    text: 'Il ____ giugno. (día 2 del mes)',
    answer: 'due',
    distractors: ['secondo', 'tre', 'dodici'],
    skills: ['vocab:calendar'],
    tags: ['rule:date_format'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'date-25-december',
    kind: 'vocab',
    text: 'Il ____ dicembre, Natale. (día 25 del mes)',
    answer: 'venticinque',
    distractors: ['venticinquesimo', 'ventiquattro', 'ventisei'],
    skills: ['vocab:calendar'],
    tags: ['rule:date_format'],
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'date-first-may',
    kind: 'vocab',
    text: 'Il ____ maggio. (día 1 del mes: ¡es especial!)',
    answer: 'primo',
    distractors: ['uno', 'prima', 'secondo'],
    skills: ['vocab:calendar'],
    tags: ['rule:date_format'],
    unit: 2,
    examWeight: 1,
  },
];

export const lessons: SentenceEntry[] = [
  ...pronounDrills,
  ...modalDrills,
  ...prendereDrills,
  ...dayDrills,
  ...weekDrills,
  ...monthDrills,
  ...seasonDrills,
  ...calendarRuleDrills,
  ...dateDrills,
];

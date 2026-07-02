import type { VocabEntry } from '../types';

/**
 * Body parts vocabulary (Unit 2, Exam Ex7).
 *
 * The 10 EXAM terms (examWeight: 3) + 8 extras (examWeight: 1) — each in whichever
 * number the exam/book used. Every one of those 18 also gets a companion entry
 * (examWeight: 1) in the OTHER number, so both singular and plural are quizzed for
 * every word (several are irregular: braccio/braccia, dito/dita, labbro/labbra
 * switch to feminine in the plural; orecchio's common plural is fem. "le orecchie").
 * All category: 'body'. Glosses are ES-MX.
 */
export const vocab: VocabEntry[] = [
  // ────────────────────────────────────────────────────────────────────────────
  // 10 EXAM terms (examWeight: 3) + their singular/plural companion
  // ────────────────────────────────────────────────────────────────────────────

  {
    id: 'capelli',
    term: 'capelli',
    gloss: 'el cabello / el pelo',
    category: 'body',
    gender: 'm',
    article: 'i',
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'capello',
    term: 'capello',
    gloss: 'un cabello / un pelo',
    category: 'body',
    gender: 'm',
    article: 'il',
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'occhi',
    term: 'occhi',
    gloss: 'los ojos',
    category: 'body',
    gender: 'm',
    article: 'gli',
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'occhio',
    term: 'occhio',
    gloss: 'el ojo',
    category: 'body',
    gender: 'm',
    article: "l'",
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'naso',
    term: 'naso',
    gloss: 'la nariz',
    category: 'body',
    gender: 'm',
    article: 'il',
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'nasi',
    term: 'nasi',
    gloss: 'las narices',
    category: 'body',
    gender: 'm',
    article: 'i',
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'collo',
    term: 'collo',
    gloss: 'el cuello',
    category: 'body',
    gender: 'm',
    article: 'il',
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'colli',
    term: 'colli',
    gloss: 'los cuellos',
    category: 'body',
    gender: 'm',
    article: 'i',
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'braccio',
    term: 'braccio',
    gloss: 'el brazo',
    category: 'body',
    gender: 'm',
    article: 'il',
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'braccia',
    term: 'braccia',
    gloss: 'los brazos',
    category: 'body',
    gender: 'f',
    article: 'le',
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'gamba',
    term: 'gamba',
    gloss: 'la pierna',
    category: 'body',
    gender: 'f',
    article: 'la',
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'gambe',
    term: 'gambe',
    gloss: 'las piernas',
    category: 'body',
    gender: 'f',
    article: 'le',
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'piedi',
    term: 'piedi',
    gloss: 'los pies',
    category: 'body',
    gender: 'm',
    article: 'i',
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'piede',
    term: 'piede',
    gloss: 'el pie',
    category: 'body',
    gender: 'm',
    article: 'il',
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'bocca',
    term: 'bocca',
    gloss: 'la boca',
    category: 'body',
    gender: 'f',
    article: 'la',
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'bocche',
    term: 'bocche',
    gloss: 'las bocas',
    category: 'body',
    gender: 'f',
    article: 'le',
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'pancia',
    term: 'pancia',
    gloss: 'la panza / la barriga',
    category: 'body',
    gender: 'f',
    article: 'la',
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'pance',
    term: 'pance',
    gloss: 'las panzas / las barrigas',
    category: 'body',
    gender: 'f',
    article: 'le',
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'mano',
    term: 'mano',
    gloss: 'la mano',
    category: 'body',
    gender: 'f',
    article: 'la',
    unit: 2,
    examWeight: 3,
  },
  {
    id: 'mani',
    term: 'mani',
    gloss: 'las manos',
    category: 'body',
    gender: 'f',
    article: 'le',
    unit: 2,
    examWeight: 1,
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 8 EXTRAS (examWeight: 1) + their singular/plural companion
  // ────────────────────────────────────────────────────────────────────────────

  {
    id: 'orecchio',
    term: 'orecchio',
    gloss: 'la oreja',
    category: 'body',
    gender: 'm',
    article: "l'",
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'orecchie',
    term: 'orecchie',
    gloss: 'las orejas',
    category: 'body',
    gender: 'f',
    article: 'le',
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'denti',
    term: 'denti',
    gloss: 'los dientes',
    category: 'body',
    gender: 'm',
    article: 'i',
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'dente',
    term: 'dente',
    gloss: 'el diente',
    category: 'body',
    gender: 'm',
    article: 'il',
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'labbra',
    term: 'labbra',
    gloss: 'los labios',
    category: 'body',
    gender: 'f',
    article: 'le',
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'labbro',
    term: 'labbro',
    gloss: 'el labio',
    category: 'body',
    gender: 'm',
    article: 'il',
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'fronte',
    term: 'fronte',
    gloss: 'la frente',
    category: 'body',
    gender: 'f',
    article: 'la',
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'fronti',
    term: 'fronti',
    gloss: 'las frentes',
    category: 'body',
    gender: 'f',
    article: 'le',
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'spalla',
    term: 'spalla',
    gloss: 'el hombro',
    category: 'body',
    gender: 'f',
    article: 'la',
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'spalle',
    term: 'spalle',
    gloss: 'los hombros',
    category: 'body',
    gender: 'f',
    article: 'le',
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'dito',
    term: 'dito',
    gloss: 'el dedo',
    category: 'body',
    gender: 'm',
    article: 'il',
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'dita',
    term: 'dita',
    gloss: 'los dedos',
    category: 'body',
    gender: 'f',
    article: 'le',
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'testa',
    term: 'testa',
    gloss: 'la cabeza',
    category: 'body',
    gender: 'f',
    article: 'la',
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'teste',
    term: 'teste',
    gloss: 'las cabezas',
    category: 'body',
    gender: 'f',
    article: 'le',
    unit: 2,
    examWeight: 1,
  },

  {
    id: 'faccia',
    term: 'faccia',
    gloss: 'la cara',
    category: 'body',
    gender: 'f',
    article: 'la',
    unit: 2,
    examWeight: 1,
  },
  {
    id: 'facce',
    term: 'facce',
    gloss: 'las caras',
    category: 'body',
    gender: 'f',
    article: 'le',
    unit: 2,
    examWeight: 1,
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Días de la semana (brief §9). lunedì–venerdì llevan -ì acentuada (tolerada por
  // el validador como "near"); todos masculinos salvo domenica (femenino).
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'lunedì',
    term: 'lunedì',
    gloss: 'el lunes',
    category: 'days',
    gender: 'm',
    article: 'il',
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'martedì',
    term: 'martedì',
    gloss: 'el martes',
    category: 'days',
    gender: 'm',
    article: 'il',
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'mercoledì',
    term: 'mercoledì',
    gloss: 'el miércoles',
    category: 'days',
    gender: 'm',
    article: 'il',
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'giovedì',
    term: 'giovedì',
    gloss: 'el jueves',
    category: 'days',
    gender: 'm',
    article: 'il',
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'venerdì',
    term: 'venerdì',
    gloss: 'el viernes',
    category: 'days',
    gender: 'm',
    article: 'il',
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'sabato',
    term: 'sabato',
    gloss: 'el sábado',
    category: 'days',
    gender: 'm',
    article: 'il',
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'domenica',
    term: 'domenica',
    gloss: 'el domingo',
    category: 'days',
    gender: 'f',
    article: 'la',
    unit: 2,
    examWeight: 2,
  },

  // ────────────────────────────────────────────────────────────────────────────
  // Unidades de tiempo (category 'calendar'). Nombres generales del calendario, con
  // compañero singular/plural en los más frecuentes. «fine settimana» y «weekend»
  // son masculinos INVARIABLES (i fine settimana / i weekend). examWeight 1: no
  // entran en el examen del Módulo 1, solo práctica.
  // ────────────────────────────────────────────────────────────────────────────
  { id: 'giorno', term: 'giorno', gloss: 'el día', category: 'calendar', gender: 'm', article: 'il', unit: 2, examWeight: 1 },
  { id: 'giorni', term: 'giorni', gloss: 'los días', category: 'calendar', gender: 'm', article: 'i', unit: 2, examWeight: 1 },
  { id: 'settimana', term: 'settimana', gloss: 'la semana', category: 'calendar', gender: 'f', article: 'la', unit: 2, examWeight: 1 },
  { id: 'settimane', term: 'settimane', gloss: 'las semanas', category: 'calendar', gender: 'f', article: 'le', unit: 2, examWeight: 1 },
  { id: 'fine-settimana', term: 'fine settimana', gloss: 'el fin de semana', category: 'calendar', gender: 'm', article: 'il', unit: 2, examWeight: 1 },
  { id: 'weekend', term: 'weekend', gloss: 'el fin de semana (weekend)', category: 'calendar', gender: 'm', article: 'il', unit: 2, examWeight: 1 },
  { id: 'mese', term: 'mese', gloss: 'el mes', category: 'calendar', gender: 'm', article: 'il', unit: 2, examWeight: 1 },
  { id: 'mesi', term: 'mesi', gloss: 'los meses', category: 'calendar', gender: 'm', article: 'i', unit: 2, examWeight: 1 },
  { id: 'anno', term: 'anno', gloss: 'el año', category: 'calendar', gender: 'm', article: "l'", unit: 2, examWeight: 1 },
  { id: 'anni', term: 'anni', gloss: 'los años', category: 'calendar', gender: 'm', article: 'gli', unit: 2, examWeight: 1 },
  { id: 'secolo', term: 'secolo', gloss: 'el siglo', category: 'calendar', gender: 'm', article: 'il', unit: 2, examWeight: 1 },
  { id: 'ora', term: 'ora', gloss: 'la hora', category: 'calendar', gender: 'f', article: "l'", unit: 2, examWeight: 1 },
  { id: 'ore', term: 'ore', gloss: 'las horas', category: 'calendar', gender: 'f', article: 'le', unit: 2, examWeight: 1 },
  { id: 'minuto', term: 'minuto', gloss: 'el minuto', category: 'calendar', gender: 'm', article: 'il', unit: 2, examWeight: 1 },
  { id: 'minuti', term: 'minuti', gloss: 'los minutos', category: 'calendar', gender: 'm', article: 'i', unit: 2, examWeight: 1 },

  // ────────────────────────────────────────────────────────────────────────────
  // Los 12 meses (category 'months'). TODOS masculinos y en MINÚSCULA. aprile,
  // agosto y ottobre empiezan por vocal → artículo «l'».
  // ────────────────────────────────────────────────────────────────────────────
  { id: 'gennaio', term: 'gennaio', gloss: 'enero', category: 'months', gender: 'm', article: 'il', unit: 2, examWeight: 1 },
  { id: 'febbraio', term: 'febbraio', gloss: 'febrero', category: 'months', gender: 'm', article: 'il', unit: 2, examWeight: 1 },
  { id: 'marzo', term: 'marzo', gloss: 'marzo', category: 'months', gender: 'm', article: 'il', unit: 2, examWeight: 1 },
  { id: 'aprile', term: 'aprile', gloss: 'abril', category: 'months', gender: 'm', article: "l'", unit: 2, examWeight: 1 },
  { id: 'maggio', term: 'maggio', gloss: 'mayo', category: 'months', gender: 'm', article: 'il', unit: 2, examWeight: 1 },
  { id: 'giugno', term: 'giugno', gloss: 'junio', category: 'months', gender: 'm', article: 'il', unit: 2, examWeight: 1 },
  { id: 'luglio', term: 'luglio', gloss: 'julio', category: 'months', gender: 'm', article: 'il', unit: 2, examWeight: 1 },
  { id: 'agosto', term: 'agosto', gloss: 'agosto', category: 'months', gender: 'm', article: "l'", unit: 2, examWeight: 1 },
  { id: 'settembre', term: 'settembre', gloss: 'septiembre', category: 'months', gender: 'm', article: 'il', unit: 2, examWeight: 1 },
  { id: 'ottobre', term: 'ottobre', gloss: 'octubre', category: 'months', gender: 'm', article: "l'", unit: 2, examWeight: 1 },
  { id: 'novembre', term: 'novembre', gloss: 'noviembre', category: 'months', gender: 'm', article: 'il', unit: 2, examWeight: 1 },
  { id: 'dicembre', term: 'dicembre', gloss: 'diciembre', category: 'months', gender: 'm', article: 'il', unit: 2, examWeight: 1 },

  // ────────────────────────────────────────────────────────────────────────────
  // Las 4 estaciones (category 'seasons'). «estate» es FEMENINA (l'estate); autunno
  // e inverno son masculinos (l'autunno, l'inverno); primavera femenina (la primavera).
  // ────────────────────────────────────────────────────────────────────────────
  { id: 'primavera', term: 'primavera', gloss: 'la primavera', category: 'seasons', gender: 'f', article: 'la', unit: 2, examWeight: 1 },
  { id: 'estate', term: 'estate', gloss: 'el verano', category: 'seasons', gender: 'f', article: "l'", unit: 2, examWeight: 1 },
  { id: 'autunno', term: 'autunno', gloss: 'el otoño', category: 'seasons', gender: 'm', article: "l'", unit: 2, examWeight: 1 },
  { id: 'inverno', term: 'inverno', gloss: 'el invierno', category: 'seasons', gender: 'm', article: "l'", unit: 2, examWeight: 1 },

  // ────────────────────────────────────────────────────────────────────────────
  // Momentos del día (category 'dayparts').
  // ────────────────────────────────────────────────────────────────────────────
  { id: 'mattina', term: 'mattina', gloss: 'la mañana (~6–12 h)', category: 'dayparts', gender: 'f', article: 'la', unit: 2, examWeight: 1 },
  { id: 'pomeriggio', term: 'pomeriggio', gloss: 'la tarde (~12–18 h)', category: 'dayparts', gender: 'm', article: 'il', unit: 2, examWeight: 1 },
  { id: 'sera', term: 'sera', gloss: 'la tarde-noche (~18–24 h)', category: 'dayparts', gender: 'f', article: 'la', unit: 2, examWeight: 1 },
  { id: 'notte', term: 'notte', gloss: 'la noche (~24–6 h)', category: 'dayparts', gender: 'f', article: 'la', unit: 2, examWeight: 1 },

  // ────────────────────────────────────────────────────────────────────────────
  // Adverbios de tiempo (category 'timeadv'). Son invariables → sin género/artículo.
  // ────────────────────────────────────────────────────────────────────────────
  { id: 'oggi', term: 'oggi', gloss: 'hoy', category: 'timeadv', unit: 2, examWeight: 1 },
  { id: 'ieri', term: 'ieri', gloss: 'ayer', category: 'timeadv', unit: 2, examWeight: 1 },
  { id: 'domani', term: 'domani', gloss: 'mañana', category: 'timeadv', unit: 2, examWeight: 1 },
  { id: 'dopodomani', term: 'dopodomani', gloss: 'pasado mañana', category: 'timeadv', unit: 2, examWeight: 1 },
  { id: 'altro-ieri', term: "l'altro ieri", gloss: 'antier / anteayer', category: 'timeadv', unit: 2, examWeight: 1 },
];

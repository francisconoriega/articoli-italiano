import type { VocabEntry } from '../types';

/**
 * Body parts vocabulary (Unit 2, Exam Ex7).
 *
 * The 10 EXAM terms (examWeight: 3) + 8 extras (examWeight: 1).
 * All category: 'body'. Glosses are ES-MX.
 */
export const vocab: VocabEntry[] = [
  // ────────────────────────────────────────────────────────────────────────────
  // 10 EXAM terms (examWeight: 3)
  // ────────────────────────────────────────────────────────────────────────────

  {
    id: 'capelli',
    term: 'capelli',
    gloss: 'el cabello / el pelo',
    category: 'body',
    gender: 'm',
    article: 'i',
    plural: 'capelli',
    unit: 2,
    examWeight: 3,
  },

  {
    id: 'occhi',
    term: 'occhi',
    gloss: 'los ojos',
    category: 'body',
    gender: 'm',
    article: 'gli',
    plural: 'occhi',
    unit: 2,
    examWeight: 3,
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
    id: 'braccio',
    term: 'braccio',
    gloss: 'el brazo',
    category: 'body',
    gender: 'm',
    article: 'il',
    plural: 'le braccia',
    unit: 2,
    examWeight: 3,
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
    id: 'piedi',
    term: 'piedi',
    gloss: 'los pies',
    category: 'body',
    gender: 'm',
    article: 'i',
    plural: 'piedi',
    unit: 2,
    examWeight: 3,
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
    id: 'mano',
    term: 'mano',
    gloss: 'la mano',
    category: 'body',
    gender: 'f',
    article: 'la',
    plural: 'le mani',
    unit: 2,
    examWeight: 3,
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 8 EXTRAS (examWeight: 1)
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
    id: 'denti',
    term: 'denti',
    gloss: 'los dientes',
    category: 'body',
    gender: 'm',
    article: 'i',
    plural: 'denti',
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
    plural: 'labbra',
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
    id: 'dito',
    term: 'dito',
    gloss: 'el dedo',
    category: 'body',
    gender: 'm',
    article: 'il',
    plural: 'le dita',
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
    id: 'faccia',
    term: 'faccia',
    gloss: 'la cara',
    category: 'body',
    gender: 'f',
    article: 'la',
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
];

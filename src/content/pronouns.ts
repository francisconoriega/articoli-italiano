import type { PronounEntry } from '../types';

/**
 * Subject pronouns (Unit 1).
 *
 * Six pronouns, each with examWeight: 1.
 * Glosses are ES-MX.
 */
export const pronouns: PronounEntry[] = [
  {
    id: 'io',
    person: 'io',
    pronoun: 'io',
    gloss: 'yo',
    unit: 1,
    examWeight: 1,
  },

  {
    id: 'tu',
    person: 'tu',
    pronoun: 'tu',
    gloss: 'tú',
    unit: 1,
    examWeight: 1,
  },

  {
    id: 'lui-lei',
    person: 'lui',
    pronoun: 'lui',
    accept: ['lei', 'Lei'],
    gloss: 'él / ella / usted',
    unit: 1,
    examWeight: 1,
  },

  {
    id: 'noi',
    person: 'noi',
    pronoun: 'noi',
    gloss: 'nosotros / nosotras',
    unit: 1,
    examWeight: 1,
  },

  {
    id: 'voi',
    person: 'voi',
    pronoun: 'voi',
    gloss: 'ustedes / vosotros',
    unit: 1,
    examWeight: 1,
  },

  {
    id: 'loro',
    person: 'loro',
    pronoun: 'loro',
    gloss: 'ellos / ellas',
    unit: 1,
    examWeight: 1,
  },
];

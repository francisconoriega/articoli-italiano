/**
 * deixis.ts — §4 movimiento y deixis: andare vs venire vs uscire.
 *
 * Kind 'verb-choice': NO se da el infinitivo; el alumno elige el verbo correcto
 * por significado (dirección respecto al hablante/oyente) y lo conjuga. Los
 * distractores son las formas de la MISMA persona de los otros verbos de
 * movimiento (engine/choices.ts), así que lo que se prueba es la elección, no la
 * persona. La explicación va anclada al español ir/venir/salir.
 */
import type { SentenceEntry } from '../types';

export const deixis: SentenceEntry[] = [
  {
    id: 'deixis-vengo-casa-tua',
    kind: 'verb-choice',
    text: 'Stasera ____ a casa tua. (movimiento hacia donde estás TÚ)',
    person: 'io',
    answer: 'vengo',
    gloss: 'Esta noche voy a tu casa → venire: el destino es donde está el oyente.',
    skills: ['verb:venire', 'tense:presente', 'person:io', 'motion'],
    tags: ['rule:deixis_motion'],
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'deixis-vado-cinema',
    kind: 'verb-choice',
    text: 'Io ____ al cinema. (a un tercer lugar, lejos de los dos)',
    person: 'io',
    answer: 'vado',
    gloss: 'Yo voy al cine → andare: el destino no es donde estás tú ni nosotros.',
    skills: ['verb:andare', 'tense:presente', 'person:io', 'motion'],
    tags: ['rule:deixis_motion'],
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'deixis-esco-casa',
    kind: 'verb-choice',
    text: 'Io ____ di casa alle otto. (dejar un espacio cerrado)',
    person: 'io',
    answer: 'esco',
    gloss: 'Yo salgo de casa a las ocho → uscire: salir de un lugar cerrado.',
    skills: ['verb:uscire', 'tense:presente', 'person:io', 'motion'],
    tags: ['rule:deixis_motion'],
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'deixis-venite-montagna',
    kind: 'verb-choice',
    text: '____ in montagna con noi? (hacia donde estaremos NOSOTROS)',
    person: 'voi',
    answer: 'venite',
    gloss: '¿Vienen a la montaña con nosotros? → venire: el destino es donde estará el grupo.',
    skills: ['verb:venire', 'tense:presente', 'person:voi', 'motion'],
    tags: ['rule:deixis_motion'],
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'deixis-andiamo-supermercato',
    kind: 'verb-choice',
    text: 'Noi ____ al supermercato. (a un tercer lugar)',
    person: 'noi',
    answer: 'andiamo',
    gloss: 'Nosotros vamos al supermercado → andare.',
    skills: ['verb:andare', 'tense:presente', 'person:noi', 'motion'],
    tags: ['rule:deixis_motion'],
    unit: 2,
    examWeight: 2,
  },
  {
    id: 'deixis-usciamo-stasera',
    kind: 'verb-choice',
    text: 'Stasera (noi) ____ con gli amici. (salir socialmente)',
    person: 'noi',
    answer: 'usciamo',
    gloss: 'Esta noche salimos con los amigos → uscire (salir a divertirse).',
    skills: ['verb:uscire', 'tense:presente', 'person:noi', 'motion'],
    tags: ['rule:deixis_motion'],
    unit: 2,
    examWeight: 2,
  },
];

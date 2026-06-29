/**
 * functional.ts — §11 lenguaje funcional: invitar, aceptar, rechazar, proponer.
 *
 * Kind 'functional-choice': SIEMPRE opción múltiple (escribir una frase libre no
 * aplica a una tarea de pragmática). El motor fuerza el modo 'choice' para este
 * kind (engine/session.ts). El `answer` es la respuesta coherente; la cláusula que
 * sigue a la invitación es la que desambigua, y los distractores son otras fórmulas
 * gramaticalmente correctas pero contextualmente incoherentes.
 */
import type { SentenceEntry } from '../types';

export const functional: SentenceEntry[] = [
  {
    id: 'func-decline-esame',
    kind: 'functional-choice',
    text: 'Andiamo al cinema stasera? — Mi dispiace, ____: domani ho un esame.',
    answer: 'non posso',
    gloss: 'La cláusula «domani ho un esame» obliga a rechazar.',
    skills: ['functional', 'functional:decline'],
    tags: ['rule:functional_reply'],
    unit: 3,
    examWeight: 2,
  },
  {
    id: 'func-magari-perugia',
    kind: 'functional-choice',
    text: 'Vieni a cena sabato? — ____: venerdì partiamo per Perugia.',
    answer: 'Magari la prossima volta',
    gloss: '«Quizá la próxima vez»: rechazo cortés cuando ya tienes otro plan.',
    skills: ['functional', 'functional:decline'],
    tags: ['rule:functional_reply'],
    unit: 3,
    examWeight: 2,
  },
  {
    id: 'func-accept-volentieri',
    kind: 'functional-choice',
    text: 'Ti va un caffè? — ____, con piacere!',
    answer: 'Volentieri',
    gloss: '«Con gusto»: aceptación entusiasta.',
    skills: ['functional', 'functional:accept'],
    tags: ['rule:functional_reply'],
    unit: 3,
    examWeight: 2,
  },
  {
    id: 'func-propose-perche-non',
    kind: 'functional-choice',
    text: 'È una bella giornata. — ____ andiamo al parco?',
    answer: 'Perché non',
    gloss: '«¿Por qué no…?»: fórmula para PROPONER un plan.',
    skills: ['functional', 'functional:propose'],
    tags: ['rule:functional_reply'],
    unit: 3,
    examWeight: 2,
  },
  {
    id: 'func-accept-buona-idea',
    kind: 'functional-choice',
    text: 'Che ne dici di una pizza? — ____, ho fame!',
    answer: 'Buona idea',
    gloss: '«Buena idea»: aceptar una propuesta.',
    skills: ['functional', 'functional:accept'],
    tags: ['rule:functional_reply'],
    unit: 3,
    examWeight: 1,
  },
  {
    id: 'func-decline-impegno',
    kind: 'functional-choice',
    text: 'Usciamo domani? — ____, ho già un impegno.',
    answer: 'Mi dispiace',
    gloss: 'Rechazo cortés: «lo siento», ya tengo un compromiso.',
    skills: ['functional', 'functional:decline'],
    tags: ['rule:functional_reply'],
    unit: 3,
    examWeight: 1,
  },
];

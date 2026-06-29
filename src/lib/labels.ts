/** Human-friendly ES-MX labels for practice modes and skill buckets. */
import type { PracticeMode } from '../types'

export function modeLabel(mode: PracticeMode): string {
  const map: Record<PracticeMode, string> = {
    mixed: 'Mixto',
    verbs: 'Verbos',
    articles: 'Artículos',
    numbers: 'Números',
    vocab: 'Vocabulario',
    'exam-drill': 'Examen',
  }
  return map[mode]
}

export function skillLabel(skill: string): string {
  if (skill.startsWith('verb:')) return `verbo ${skill.slice(5)}`
  if (skill.startsWith('person:')) return `persona ${skill.slice(7)}`
  if (skill.startsWith('tense:')) return skill.slice(6)
  if (skill.startsWith('article:')) {
    const a = skill.slice(8)
    if (a === 'def') return 'artículos determinados'
    if (a === 'indef') return 'artículos indeterminados'
    return `artículo «${a}»`
  }
  if (skill.startsWith('class:')) {
    const c = skill.slice(6)
    if (c === 'irregular') return 'verbos irregulares'
    if (c === 'modal') return 'verbos modales'
    if (c === 'isc') return 'verbos -isc'
    if (c === 'regular') return 'verbos regulares'
    return c
  }
  if (skill.startsWith('number:')) {
    const n = skill.slice(7)
    if (n === 'cardinal') return 'números'
    if (n === 'ordinal') return 'ordinales'
    if (n === 'base') return 'números base (1-19)'
    if (n === 'tens') return 'decenas'
    if (n === 'compound') return 'números compuestos'
    if (n === 'elision') return 'excepciones (elisión)'
    return `números (${n})`
  }
  if (skill.startsWith('vocab:')) return skill.slice(6)
  if (skill.startsWith('idiom:')) return `modismo ${skill.slice(6).replace(/-/g, ' ')}`
  if (skill === 'essere') return 'verbo essere'
  if (skill === 'avere') return 'verbo avere'
  if (skill === 'pronoun') return 'pronombres'
  return skill
}

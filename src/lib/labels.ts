/** Human-friendly ES-MX labels for practice modes, skill buckets, and items. */
import type { Item, PracticeMode } from '../types'
import { BLANK } from '../types'

/** Compact, concrete label for an item in the "weak words" list. */
export function itemLabel(item: Item): string {
  if (typeof item.prompt.figure === 'number') {
    const ordinal = item.skills.includes('number:ordinal')
    return `${item.prompt.figure}${ordinal ? '°' : ''} → ${item.answer}`
  }
  if (item.prompt.lemma) {
    return `${item.answer} · ${item.prompt.lemma}` // e.g. "faccio · fare"
  }
  if (item.kind === 'article') {
    const noun = item.prompt.text.replace(BLANK, '').trim()
    return `${item.answer} ${noun}` // e.g. "lo studente"
  }
  return item.answer // vocab / pronoun / essere-avere / sentence
}

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

/** Human ES-MX label for a scheduler topic (e.g. "verb:fare" → "verbo fare"). */
export function topicLabel(topic: string): string {
  if (topic.startsWith('verb:')) return `verbo ${topic.slice(5)}`
  if (topic.startsWith('vocab:')) {
    const c = topic.slice(6)
    return c === 'body' ? 'partes del cuerpo' : c
  }
  if (topic === 'pronoun') return 'pronombres'
  if (topic === 'exam') return 'frases del examen'
  const numMap: Record<string, string> = {
    'num:ones': 'números 1–10',
    'num:teens': 'números 11–19',
    'num:tens': 'decenas (20–90)',
    'num:hundreds': 'centenas',
    'num:compound': 'números compuestos',
    'num:ordinal': 'números ordinales',
  }
  if (numMap[topic]) return numMap[topic]
  if (topic.startsWith('article:')) {
    const rule = topic.slice('article:'.length)
    if (rule === 'regular') return 'artículos regulares'
    return `artículos: ${rule.replace(/_/g, ' ')}`
  }
  return topic
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

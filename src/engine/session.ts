/**
 * engine/session.ts — the round/session controller.
 *
 * Framework-agnostic: it owns the progress store, the current item, round counters,
 * and the recent-miss queue, and exposes plain methods. The Svelte layer (App.svelte)
 * calls these and mirrors the relevant fields into reactive `$state`. All persistence
 * happens here (saveStore after every recorded answer).
 */
import type {
  AnswerResult,
  Item,
  ItemProgress,
  PracticeMode,
  PresentationMode,
  ProgressStore,
  SessionRecord,
  Settings,
  ValidationResult,
} from '../types'
import { checkAnswer } from './validate'
import { applyAnswer, createItemProgress, rollUpSkill } from './mastery'
import { saveStore } from './storage'
import { chooseNext, poolForMode, scheduleRecentMiss, type RecentMiss } from './select'
import { buildChoices, presentationFor } from './choices'

export const ROUND_SIZE = 15

export interface SubmitResult {
  /** Display result (for the typed-answer feedback box). */
  result: ValidationResult
  /** Recorded outcome (correct/near/wrong/timeout/dontKnow). */
  answerResult: AnswerResult
  item: Item
  /** True when this answer completed the round. */
  roundComplete: boolean
}

/** A snapshot of round/session stats for the UI to render. */
export interface SessionStats {
  answered: number
  correct: number
  near: number
  streak: number
  roundAnswered: number
  roundCorrect: number
  roundSize: number
  sessionAccuracy: number
}

export class PracticeSession {
  store: ProgressStore
  current: Item | null = null
  /** Whether the current item is shown as multiple-choice or free typing. */
  currentMode: PresentationMode = 'type'
  /** Shuffled answer options when currentMode === 'choice' (empty otherwise). */
  currentChoices: string[] = []
  /** Whether to show the Spanish gloss for the current item (stage-driven). */
  currentShowGloss = true
  roundSize = ROUND_SIZE

  // lifetime counters
  answered = 0
  correct = 0
  near = 0
  streak = 0

  // round counters
  roundAnswered = 0
  roundCorrect = 0
  roundNear = 0
  mistakesBySkill: Record<string, number> = {}
  roundMistakes: Array<{ id: string; prompt: string; answer: string }> = []

  mode: PracticeMode
  private allItems: Item[]
  private pool: Item[]
  private recentMisses: RecentMiss[] = []
  private lastId: string | null = null
  private startedAt = 0

  constructor(allItems: Item[], store: ProgressStore) {
    this.allItems = allItems
    this.store = store
    this.mode = store.settings.mode
    this.pool = poolForMode(allItems, this.mode)
  }

  get settings(): Settings {
    return this.store.settings
  }

  get poolSize(): number {
    return this.pool.length
  }

  stats(): SessionStats {
    return {
      answered: this.answered,
      correct: this.correct,
      near: this.near,
      streak: this.streak,
      roundAnswered: this.roundAnswered,
      roundCorrect: this.roundCorrect,
      roundSize: this.roundSize,
      sessionAccuracy: this.answered === 0 ? 0 : Math.round((this.correct / this.answered) * 100),
    }
  }

  setMode(mode: PracticeMode, now: number): Item | null {
    this.mode = mode
    this.store.settings.mode = mode
    this.pool = poolForMode(this.allItems, mode)
    saveStore(this.store)
    return this.startRound(now)
  }

  setTimer(enabled: boolean, limit?: number): void {
    this.store.settings.timerEnabled = enabled
    if (typeof limit === 'number') this.store.settings.timeLimit = limit
    saveStore(this.store)
  }

  /** Toggle the adaptive multiple-choice assist and re-evaluate the current item. */
  setAssist(enabled: boolean): void {
    this.store.settings.assist = enabled
    saveStore(this.store)
    this.computePresentation(this.current)
  }

  /** Reset round counters and draw the first item of a new round. */
  startRound(now: number): Item | null {
    this.roundAnswered = 0
    this.roundCorrect = 0
    this.roundNear = 0
    this.mistakesBySkill = {}
    this.roundMistakes = []
    return this.next(now)
  }

  /** Draw the next item without touching round counters. */
  next(now: number): Item | null {
    const { item, recentMisses } = chooseNext({
      pool: this.curriculumFilter(this.pool),
      progress: this.store.items,
      recentMisses: this.recentMisses,
      answered: this.answered,
      lastId: this.lastId,
      now,
    })
    this.recentMisses = recentMisses
    this.current = item
    this.startedAt = now
    this.computePresentation(item)
    return item
  }

  /** Stage-driven presentation (input mode, gloss, distractor difficulty) for the item. */
  private computePresentation(item: Item | null): void {
    if (!item) {
      this.currentMode = 'type'
      this.currentShowGloss = true
      this.currentChoices = []
      return
    }
    const stage = presentationFor(this.store.items[item.id])
    this.currentMode = this.store.settings.assist ? stage.input : 'type'
    this.currentShowGloss = stage.gloss && this.store.settings.showGloss
    this.currentChoices = this.currentMode === 'choice' ? buildChoices(item, this.allItems, 4) : []
  }

  /** Has the learner reached the round tens / base names well enough for compounds? */
  private numbersReady(): boolean {
    const base = this.store.skills['number:base']?.mastery ?? 0
    const tens = this.store.skills['number:tens']?.mastery ?? 0
    return base >= 0.5 && tens >= 0.4
  }

  /**
   * Numbers curriculum gate: until base names + round tens are getting learned, hide
   * non-exam compound numbers (21, 22, …) so the learner builds the foundation first.
   * Exam-weighted compounds (27, 38) and every other kind pass through untouched.
   */
  private curriculumFilter(pool: Item[]): Item[] {
    if (this.numbersReady()) return pool
    return pool.filter(
      (i) => !(i.kind === 'number' && i.skills.includes('number:compound') && i.examWeight < 2),
    )
  }

  /** Validate and record a typed answer. */
  submit(input: string, now: number): SubmitResult {
    const item = this.current
    if (!item) throw new Error('PracticeSession.submit called with no current item')
    const result = checkAnswer(input, item.answer, item.accept)
    // ValidationStatus ('correct'|'near'|'wrong') is a subset of AnswerResult.
    return this.record(item, result, result.status, now)
  }

  /** Record a timeout (no input). */
  submitTimeout(now: number): SubmitResult {
    const item = this.current
    if (!item) throw new Error('PracticeSession.submitTimeout called with no current item')
    const result: ValidationResult = {
      status: 'wrong',
      normalized: '',
      expected: item.answer,
      message: 'Se acabó el tiempo.',
    }
    return this.record(item, result, 'timeout', now)
  }

  /** Record a "no sé" (counts as a lapse, like the legacy app). */
  submitDontKnow(now: number): SubmitResult {
    const item = this.current
    if (!item) throw new Error('PracticeSession.submitDontKnow called with no current item')
    const result: ValidationResult = {
      status: 'wrong',
      normalized: '',
      expected: item.answer,
      message: `La respuesta es «${item.answer}».`,
    }
    return this.record(item, result, 'dontKnow', now)
  }

  private record(item: Item, result: ValidationResult, answerResult: AnswerResult, now: number): SubmitResult {
    const responseMs = Math.max(0, now - this.startedAt)

    // 1) item mastery
    const prev: ItemProgress = this.store.items[item.id] ?? createItemProgress(item)
    this.store.items[item.id] = applyAnswer(prev, answerResult, responseMs, now)

    // 2) skill rollups
    for (const skill of item.skills) {
      this.store.skills[skill] = rollUpSkill(this.store.skills[skill], answerResult)
    }

    // 3) counters
    const success = answerResult === 'correct' || answerResult === 'near'
    this.answered += 1
    this.roundAnswered += 1
    if (success) {
      this.correct += 1
      this.roundCorrect += 1
      this.streak += 1
      if (answerResult === 'near') {
        this.near += 1
        this.roundNear += 1
      }
    } else {
      this.streak = 0
      for (const skill of item.skills) {
        this.mistakesBySkill[skill] = (this.mistakesBySkill[skill] ?? 0) + 1
      }
      this.roundMistakes.push({ id: item.id, prompt: item.prompt.text || String(item.prompt.figure ?? ''), answer: item.answer })
      this.recentMisses = scheduleRecentMiss(this.recentMisses, item.id, this.answered)
    }

    this.lastId = item.id
    saveStore(this.store)

    return { result, answerResult, item, roundComplete: this.roundAnswered >= this.roundSize }
  }

  /** Wipe all saved progress (items, skills, history, counters) and start fresh. */
  resetProgress(now: number): Item | null {
    for (const key of Object.keys(this.store.items)) delete this.store.items[key]
    for (const key of Object.keys(this.store.skills)) delete this.store.skills[key]
    this.store.history = []
    this.answered = 0
    this.correct = 0
    this.near = 0
    this.streak = 0
    this.recentMisses = []
    this.lastId = null
    saveStore(this.store)
    return this.startRound(now)
  }

  /** Append the finished round to history and return its record. */
  finishRound(now: number): SessionRecord {
    const record: SessionRecord = {
      endedAt: now,
      mode: this.mode,
      answered: this.roundAnswered,
      correct: this.roundCorrect,
      near: this.roundNear,
      mistakesBySkill: { ...this.mistakesBySkill },
    }
    this.store.history.push(record)
    if (this.store.history.length > 50) {
      this.store.history = this.store.history.slice(-50)
    }
    saveStore(this.store)
    return record
  }
}

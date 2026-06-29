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
import { chooseNext, poolForMode, scheduleRecentMiss, pickRecentMiss, type RecentMiss } from './select'
import { buildChoices, presentationFor } from './choices'
import { composeRound, topicInfos, type RoundPlan, type TopicState, type TopicInfo } from './scheduler'

export const ROUND_SIZE = 15

export interface SubmitResult {
  /** Display result (for the typed-answer feedback box). */
  result: ValidationResult
  /** Recorded outcome (correct/near/wrong/timeout/dontKnow). */
  answerResult: AnswerResult
  item: Item
  /** True when this answer completed the round. */
  roundComplete: boolean
  /**
   * Set to the focus topic when THIS answer finished the round's mini-lesson block
   * (every block item has now been answered) — the UI shows a completion beat. Null
   * otherwise.
   */
  miniLessonCompletedTopic: string | null
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

  // ── Scheduler-facing state (mirrored into the UI) ──────────────────────────
  /** The composed plan for the current round (null before the first round). */
  plan: RoundPlan | null = null
  /** The current item's topic (e.g. "verb:fare", "num:tens"), or null. */
  currentTopic: string | null = null
  /** True when the current item belongs to this round's mini-lesson block. */
  isMiniLesson = false
  /** This round's focus topic / state / reason (from the plan). */
  focusTopic: string | null = null
  focusState: TopicState | null = null
  roundReason: RoundPlan['reason'] = 'review'
  /** Size of this round's mini-lesson block (for the "Lección: x (done/total)" indicator). */
  miniLessonTotal = 0

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

  // Round plan bookkeeping.
  /** The composed queue for this round, walked by planIndex. */
  private planItems: Item[] = []
  private planIndex = 0
  /** Ids already served this round (so the plan never re-serves a non-miss item). */
  private servedIds = new Set<string>()
  /** This round's lock-filtered pool (for recent-miss validity + weighted fallback). */
  private roundPool: Item[] = []
  private roundPoolIds = new Set<string>()
  /** The mini-lesson block ids; blockRemaining shrinks as they're answered. */
  private miniLessonSet = new Set<string>()
  private blockRemaining = new Set<string>()

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

  /** Reset round counters, compose a fresh plan, and draw the first item. */
  startRound(now: number): Item | null {
    this.roundAnswered = 0
    this.roundCorrect = 0
    this.roundNear = 0
    this.mistakesBySkill = {}
    this.roundMistakes = []

    // A fresh within-round recent-miss queue so the mini-lesson block isn't pre-empted.
    this.recentMisses = []
    this.servedIds = new Set()
    this.planIndex = 0

    // Lock-filtered pool for recent-miss validity + the weighted fallback.
    this.roundPool = this.availableFor(now)
    this.roundPoolIds = new Set(this.roundPool.map((i) => i.id))

    // Compose the round (the scheduler does its own lock filtering on the lane pool).
    const plan = composeRound(this.pool, this.store, now, this.roundSize)
    this.plan = plan
    this.planItems = plan.items
    this.miniLessonSet = new Set(plan.miniLessonIds)
    this.blockRemaining = new Set(plan.miniLessonIds)
    this.miniLessonTotal = plan.miniLessonIds.length
    this.focusTopic = plan.focusTopic
    this.focusState = plan.focusState
    this.roundReason = plan.reason

    return this.next(now)
  }

  /**
   * Draw the next item: a within-round recent-miss override first (a missed item
   * comes back soon — keeps remediation tight), then the next not-yet-served item
   * from the composed plan (so the mini-lesson block stays contiguous), then a
   * weighted fallback over the lock-filtered pool if the plan is exhausted.
   */
  next(now: number): Item | null {
    let item: Item | null = null

    // 1) Recent-miss override.
    const miss = pickRecentMiss(this.recentMisses, this.roundPoolIds, this.answered, this.lastId)
    if (miss) {
      this.recentMisses = miss.recentMisses
      item = this.roundPool.find((i) => i.id === miss.id) ?? null
    }

    // 2) Next plan item (skipping anything already served this round).
    if (!item) {
      while (this.planIndex < this.planItems.length) {
        const cand = this.planItems[this.planIndex]
        this.planIndex += 1
        if (!this.servedIds.has(cand.id)) {
          item = cand
          break
        }
      }
    }

    // 3) Weighted fallback.
    if (!item) {
      const res = chooseNext({
        pool: this.roundPool,
        progress: this.store.items,
        recentMisses: this.recentMisses,
        answered: this.answered,
        lastId: this.lastId,
        now,
      })
      this.recentMisses = res.recentMisses
      item = res.item
    }

    this.current = item
    this.startedAt = now
    if (item) this.servedIds.add(item.id)
    this.currentTopic = item?.topic ?? null
    this.isMiniLesson = item ? this.miniLessonSet.has(item.id) : false
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

  /**
   * The lane pool minus currently-locked topics' items (number compounds/hundreds
   * before their prerequisites are learned), EXCEPT exam-weighted items (>= 2), which
   * stay reachable for exam survival. This folds the old numbers curriculum gate into
   * the scheduler's topic locks, so locking lives in one place.
   */
  private availableFor(now: number): Item[] {
    const infos = topicInfos(this.pool, this.store, now)
    const locked = new Set<string>()
    for (const info of infos.values()) if (info.state === 'locked') locked.add(info.topic)
    if (locked.size === 0) return this.pool.slice()
    return this.pool.filter((i) => !locked.has(i.topic) || i.examWeight >= 2)
  }

  /** Per-topic state rollup for the insights panel (every topic in the active lane). */
  topicProgress(now: number): TopicInfo[] {
    return [...topicInfos(this.pool, this.store, now).values()]
  }

  /** How many of this round's mini-lesson block items have been answered so far. */
  miniLessonDone(): number {
    return this.miniLessonTotal - this.blockRemaining.size
  }

  /** Set (or clear with null) the OPTIONAL exam date; takes effect from the next round. */
  setExamDate(examDate: string | null): void {
    this.store.settings.examDate = examDate
    saveStore(this.store)
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

    // Mini-lesson completion beat — fires once, when the last block item is answered.
    let miniLessonCompletedTopic: string | null = null
    if (this.blockRemaining.has(item.id)) {
      this.blockRemaining.delete(item.id)
      if (this.blockRemaining.size === 0) miniLessonCompletedTopic = this.focusTopic
    }

    this.lastId = item.id
    saveStore(this.store)

    return {
      result,
      answerResult,
      item,
      roundComplete: this.roundAnswered >= this.roundSize,
      miniLessonCompletedTopic,
    }
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

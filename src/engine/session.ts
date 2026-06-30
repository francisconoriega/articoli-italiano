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
import { createPrimedItemProgress } from './priming'
import { saveStore, exportStoreJson, importStoreJson, mergeStores } from './storage'
import { chooseNext, poolForMode, scheduleRecentMiss, pickRecentMiss, type RecentMiss } from './select'
import {
  buildChoicesWithNotes,
  optionNotesForLevel,
  presentationFor,
  presentationForItem,
  CHOICE_ONLY_KINDS,
  type ChoiceOption,
} from './choices'
import { composeRound, topicInfos, type RoundPlan, type TopicState, type TopicInfo } from './scheduler'
import { decorateItem } from './frames'

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
  /** Same options annotated with optional L0 helper notes (empty when not choice). */
  currentChoiceOptions: ChoiceOption[] = []
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
  /** "Parte N de M" when the focus topic spans several mini-lessons; both 0 otherwise. */
  miniLessonPart = 0
  miniLessonParts = 0

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

  /** Toggle the tonic-syllable underline on prompt cards (pure display setting). */
  setTonicStress(enabled: boolean): void {
    this.store.settings.tonicStress = enabled
    saveStore(this.store)
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
    this.miniLessonPart = plan.miniLessonPart
    this.miniLessonParts = plan.miniLessonParts
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

    // Presentation-only decoration: a verb item may be shown inside a fresh contextual
    // sentence (engine/frames.ts). id/answer/skills/topic are preserved, so all the
    // bookkeeping below (servedIds, mini-lesson, mastery on record) is unaffected.
    const shown = item ? decorateItem(item) : null
    this.current = shown
    this.startedAt = now
    if (shown) this.servedIds.add(shown.id)
    this.currentTopic = shown?.topic ?? null
    this.isMiniLesson = shown ? this.miniLessonSet.has(shown.id) : false
    this.computePresentation(shown)
    return shown
  }

  /** Stage-driven presentation (input mode, gloss, distractor difficulty) for the item. */
  private computePresentation(item: Item | null): void {
    if (!item) {
      this.currentMode = 'type'
      this.currentShowGloss = true
      this.currentChoices = []
      this.currentChoiceOptions = []
      return
    }
    // Skill-primed graduation: when an item is still UNSEEN, presentationForItem may
    // start it at typing if its governing rule is already mastered. Once seen, both
    // paths read the item's own level. Gated by a setting (default on).
    const progress = this.store.items[item.id]
    const stage = this.store.settings.skillPrimedGraduation
      ? presentationForItem(progress, item, this.store.skills)
      : presentationFor(progress)
    // Choice-only kinds (pragmatics) stay multiple-choice regardless of level/assist.
    const choiceOnly = CHOICE_ONLY_KINDS.has(item.kind)
    this.currentMode = choiceOnly ? 'choice' : this.store.settings.assist ? stage.input : 'type'
    this.currentShowGloss = (choiceOnly || stage.gloss) && this.store.settings.showGloss
    // L0 (level 0) shows per-option helper notes; L1 is MC+gloss without them ("solo italiano").
    const level = progress?.level ?? 0
    this.currentChoiceOptions =
      this.currentMode === 'choice'
        ? buildChoicesWithNotes(item, this.allItems, 4, optionNotesForLevel(level))
        : []
    this.currentChoices = this.currentChoiceOptions.map((o) => o.value)
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

  /**
   * Distinct topics in this round's queue, focus topic first — drives the sidebar's
   * "ahora reforzando" chips so what's shown is exactly what's being drilled.
   */
  roundTopics(): string[] {
    const out: string[] = []
    const seen = new Set<string>()
    if (this.focusTopic) {
      seen.add(this.focusTopic)
      out.push(this.focusTopic)
    }
    for (const it of this.planItems) {
      if (it.topic && !seen.has(it.topic)) {
        seen.add(it.topic)
        out.push(it.topic)
      }
    }
    return out
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
    // Agreement (Ex2) type-mode submissions carry per-blank endings ('a|a'); pass the
    // item's blanks so checkAnswer grades them per-blank. Choice-mode (full phrase) and
    // every other kind ignore the extra arg (input has no '|' separator).
    const result = checkAnswer(input, item.answer, item.accept, item.prompt.blanks)
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

    // 1) item mastery — a never-seen item is seeded with a skill-primed head start
    // (typing + higher mastery) when its governing rule is mastered, else the plain
    // MC-floor record. Gated by a setting (default on).
    const prev: ItemProgress =
      this.store.items[item.id] ??
      (this.store.settings.skillPrimedGraduation
        ? createPrimedItemProgress(item, this.store.skills)
        : createItemProgress(item))
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

  /** Serialise the whole progress store as pretty JSON for download. */
  exportJson(): string {
    return exportStoreJson(this.store)
  }

  /**
   * Import a previously-exported store and MERGE it into the current one by recency
   * (neither side loses progress). Throws on an invalid file (caller shows the error).
   * Resets the live round and draws a fresh item.
   */
  importJson(json: string, now: number): Item | null {
    const incoming = importStoreJson(json)
    const merged = mergeStores(this.store, incoming)
    // Apply in place so existing references (App reads session.store) stay valid.
    for (const key of Object.keys(this.store.items)) delete this.store.items[key]
    Object.assign(this.store.items, merged.items)
    for (const key of Object.keys(this.store.skills)) delete this.store.skills[key]
    Object.assign(this.store.skills, merged.skills)
    this.store.history = merged.history
    // The progress changed underneath — reset live session counters.
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

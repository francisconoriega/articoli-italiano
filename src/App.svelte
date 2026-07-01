<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte'
  import type {
    Item,
    Person,
    PracticeMode,
    PresentationMode,
    ProgressStore,
    SessionRecord,
    ValidationResult,
  } from './types'
  import { BLANK } from './types'
  import { PracticeSession, type SessionStats, type SubmitResult } from './engine/session'
  import type { ChoiceOption } from './engine/choices'
  import { daysUntil, categoryProgress, type CategoryInfo } from './engine/scheduler'
  import { cardinalLesson } from './engine/numbers'
  import { studyMetrics, type StudyMetrics } from './engine/metrics'
  import { explanationRules, catalog } from './content'
  import Practice from './lib/Practice.svelte'
  import Summary from './lib/Summary.svelte'
  import ConjugationTable from './lib/ConjugationTable.svelte'
  import ProgressTree from './lib/ProgressTree.svelte'
  import AppHeader from './lib/AppHeader.svelte'
  import MobileTabBar from './lib/MobileTabBar.svelte'
  import SettingsDrawer from './lib/SettingsDrawer.svelte'
  import { topicLabel } from './lib/labels'

  let { items, store }: { items: Item[]; store: ProgressStore } = $props()

  // `items`/`store` are passed once at boot and never change — read them once.
  const session = untrack(() => new PracticeSession(items, store))
  const verbByInf = untrack(() => new Map(catalog.verbs.map((v) => [v.infinitive, v])))
  // Items grouped by topic — feeds the click-to-open reference (cheat-sheet) per subtopic.
  const itemsByTopic = untrack(() => {
    const m = new Map<string, Item[]>()
    for (const it of items) {
      const arr = m.get(it.topic)
      if (arr) arr.push(it)
      else m.set(it.topic, [it])
    }
    return m
  })
  const now = () => Date.now()

  // The 9 practice modes, in display order — owned here, passed to the settings drawer.
  const MODES: PracticeMode[] = ['mixed', 'verbs', 'articles', 'numbers', 'vocab', 'body', 'agreement', 'time', 'functional']

  // ── Shell navigation & responsive state ───────────────────────────────────
  // Mobile splits the UI into two screens (the tab bar toggles them); desktop shows both.
  let view = $state<'practicar' | 'progreso'>('practicar')
  let drawerOpen = $state(false)
  let isMobile = $state(false)
  // Truthful persistent metrics for the header. `items`/`store` are boot-once (see above),
  // so the initial read is untracked like `session`; sync() recomputes after every answer.
  let metrics = $state<StudyMetrics>(untrack(() => studyMetrics(items, store, now())))

  // ── Reactive view state ───────────────────────────────────────────────────
  let current = $state<Item | null>(null)
  let value = $state('')
  let result = $state<ValidationResult | null>(null)
  /** Whether the last submitted answer was an error (wrong / No sé / timeout) — lets the
   *  conjugation table surface on a miss even during interleaved review (not a lesson). */
  let lastAnswerError = $state(false)
  let phase = $state<'answering' | 'feedback'>('answering')
  let stats = $state<SessionStats>(session.stats())
  let mode = $state<PracticeMode>(session.mode)
  let currentMode = $state<PresentationMode>('type')
  let choices = $state<string[]>([])
  let choiceOptions = $state<ChoiceOption[]>([])
  let selected = $state<string | null>(null)
  let explanation = $state('')
  let stageClass = $state('')
  let summary = $state<SessionRecord | null>(null)
  // True between the round-completing answer and the summary overlay appearing.
  let endingRound = $state(false)
  let showGloss = $state(true)
  let showTonic = $state(session.settings.tonicStress)
  // Anchored correction banner (top of canvas, ~3s) shown on a miss / "No sé".
  let banner = $state<{ answer: string; before: string; after: string; meaning: string | null; status: 'wrong' | 'near' } | null>(null)
  let bannerTimer = 0

  // ── Scheduler-facing state (mirrored from the session) ─────────────────────
  let currentTopic = $state<string | null>(null)
  let isMiniLesson = $state(false)
  let focusTopic = $state<string | null>(null)
  let roundReason = $state<'remediation' | 'acquisition' | 'new' | 'review'>('review')
  let miniDone = $state(0)
  let miniTotal = $state(0)
  let miniPart = $state(0)
  let miniParts = $state(0)
  // Sidebar "Tu avance" tree: high-level categories + what the scheduler is drilling now.
  let categoryRows = $state<CategoryInfo[]>([])
  let nowReinforcing = $state<string[]>([])
  let examDate = $state<string | null>(session.settings.examDate)
  // One-shot mini-lesson completion beat ("¡Lección completa!").
  let miniLessonBeat = $state<string | null>(null)
  let beatTimer = 0

  /** The person being drilled on the current item (for the conjugation sidebar highlight). */
  function personOfCurrent(item: Item | null): Person | null {
    if (!item) return null
    if (item.prompt.person) return item.prompt.person
    const p = item.skills.find((s) => s.startsWith('person:'))
    return p ? (p.slice('person:'.length) as Person) : null
  }

  // The conjugation cheat-sheet to show in the sidebar, or null. Testing-effect rule:
  // visible during a verb's mini-lesson (acquisition, forms masked until answered); in
  // interleaved review it stays HIDDEN while answering and only appears in feedback if the
  // answer was an error (remediation) — a correct review answer needs no cheat-sheet.
  const verbTable = $derived.by(() => {
    if (!current || !currentTopic || !currentTopic.startsWith('verb:')) return null
    const show = isMiniLesson || (phase === 'feedback' && lastAnswerError)
    if (!show) return null
    const inf = currentTopic.slice('verb:'.length)
    const verb = verbByInf.get(inf)
    const table = verb?.tenses.presente
    if (!verb || !table) return null
    return {
      infinitive: verb.infinitive,
      gloss: verb.gloss,
      table,
      askedPerson: personOfCurrent(current),
      highlight: phase === 'feedback',
    }
  })

  const daysLeft = $derived(daysUntil(examDate, Date.now()))

  // Why the engine picked this round — shown under the "ahora reforzando" chips.
  const reinforceReason = $derived.by(() => {
    const map = {
      remediation: 'Repaso de errores',
      acquisition: 'Lección enfocada',
      new: 'Tema nuevo',
      review: 'Repaso intercalado',
    } as const
    const base = map[roundReason]
    return isMiniLesson && miniTotal > 0 ? `${base} · ${miniDone} de ${miniTotal}` : base
  })

  // ── Timer ─────────────────────────────────────────────────────────────────
  let timerScale = $state(1)
  let timerRaf = 0
  let timerStart = 0

  function clearTimer() {
    if (timerRaf) cancelAnimationFrame(timerRaf)
    timerRaf = 0
  }

  function startTimer() {
    clearTimer()
    timerScale = 1
    if (!session.settings.timerEnabled || !current || phase === 'feedback') return
    timerStart = now()
    const limit = Math.max(1, session.settings.timeLimit) * 1000
    const tick = () => {
      const elapsed = now() - timerStart
      timerScale = Math.max(0, 1 - elapsed / limit)
      if (timerScale <= 0) {
        onTimeout()
        return
      }
      timerRaf = requestAnimationFrame(tick)
    }
    timerRaf = requestAnimationFrame(tick)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function sync() {
    current = session.current
    stats = session.stats()
    mode = session.mode
    currentMode = session.currentMode
    choices = session.currentChoices
    choiceOptions = session.currentChoiceOptions
    showGloss = session.currentShowGloss
    showTonic = session.settings.tonicStress

    // Scheduler-facing state.
    currentTopic = session.currentTopic
    isMiniLesson = session.isMiniLesson
    focusTopic = session.focusTopic
    roundReason = session.roundReason
    miniTotal = session.miniLessonTotal
    miniDone = session.miniLessonDone()
    miniPart = session.miniLessonPart
    miniParts = session.miniLessonParts
    examDate = session.settings.examDate
    // High-level progress tree: categories rolled up from per-topic infos…
    categoryRows = categoryProgress(session.topicProgress(now()))
    // …and exactly what the scheduler is drilling this round (focus topic first).
    nowReinforcing = session.roundTopics().slice(0, 4).map(topicLabel)
    // Persistent header metrics (due/mastered/days-left) reflect the just-mutated store.
    metrics = studyMetrics(items, store, now())
  }

  function explanationFor(item: Item | null): string {
    if (!item) return ''
    // Numbers: teach the family decomposition (decena + unidad → palabra).
    if (typeof item.prompt.figure === 'number' && item.skills.includes('number:cardinal')) {
      const lesson = cardinalLesson(item.prompt.figure)
      if (lesson) return `Familia: ${lesson}`
    }
    const ruleTag = item.tags?.find((t) => t.startsWith('rule:'))
    if (ruleTag) {
      const rule = explanationRules[ruleTag.slice('rule:'.length)]
      if (rule) return `${rule.title}: ${rule.text}`
    }
    return ''
  }

  function flash(cls: string) {
    stageClass = ''
    if (!cls) return
    requestAnimationFrame(() => {
      stageClass = cls
    })
  }

  // ── Correction banner ─────────────────────────────────────────────────────
  function bannerContext(item: Item): { before: string; after: string } {
    const figure = item.prompt.figure
    if (typeof figure === 'number') {
      const ord = item.skills.includes('number:ordinal')
      return { before: `${figure}${ord ? '°' : ''} → `, after: '' }
    }
    const text = item.prompt.text
    const idx = text.indexOf(BLANK)
    if (idx !== -1) {
      // Multi-blank (agreement): the answer is the whole corrected phrase, so don't
      // wrap it in before/after context — show the corrected phrase alone.
      if (text.indexOf(BLANK, idx + BLANK.length) !== -1) return { before: '', after: '' }
      return { before: text.slice(0, idx), after: text.slice(idx + BLANK.length) }
    }
    if (text) return { before: `${text} → `, after: '' }
    return { before: '', after: '' }
  }

  function clearBanner() {
    if (bannerTimer) {
      clearTimeout(bannerTimer)
      bannerTimer = 0
    }
    banner = null
  }

  function setBanner(r: SubmitResult) {
    if (r.answerResult === 'correct') {
      clearBanner()
      return
    }
    if (bannerTimer) clearTimeout(bannerTimer)
    const ctx = bannerContext(r.item)
    banner = {
      answer: r.item.answer,
      before: ctx.before,
      after: ctx.after,
      meaning: r.item.gloss ?? null,
      status: r.answerResult === 'near' ? 'near' : 'wrong',
    }
    // Sticky: it stays until the learner advances to the next item (advance() clears
    // it) or dismisses it manually — no auto-timeout.
  }

  // ── Mini-lesson completion beat (the motivation half of the blend) ─────────
  function clearBeat() {
    if (beatTimer) {
      clearTimeout(beatTimer)
      beatTimer = 0
    }
    miniLessonBeat = null
  }

  function setBeat(topic: string) {
    if (beatTimer) clearTimeout(beatTimer)
    miniLessonBeat = topicLabel(topic)
    beatTimer = window.setTimeout(() => {
      miniLessonBeat = null
      beatTimer = 0
    }, 3200)
  }

  function applyResult(r: SubmitResult) {
    clearTimer()
    result = r.result
    lastAnswerError = r.answerResult !== 'correct' && r.answerResult !== 'near'
    phase = 'feedback'
    explanation = explanationFor(r.item)
    sync()
    flash(
      r.answerResult === 'correct'
        ? 'stage-flash'
        : r.answerResult === 'near'
          ? 'stage-flash-near'
          : 'stage-flash-wrong',
    )
    setBanner(r)
    if (r.miniLessonCompletedTopic) setBeat(r.miniLessonCompletedTopic)
    if (r.roundComplete) {
      endingRound = true
      window.setTimeout(() => {
        summary = session.finishRound(now())
      }, 750)
    }
  }

  function advance() {
    if (endingRound) return // round is wrapping up; wait for the summary
    clearBanner()
    value = ''
    result = null
    explanation = ''
    selected = null
    phase = 'answering'
    session.next(now())
    sync()
    flash('')
    startTimer()
  }

  // ── Event handlers (passed down to Practice / Summary) ─────────────────────
  function onSubmit() {
    if (phase === 'feedback') {
      if (!summary) advance()
      return
    }
    if (!current || !value.trim()) return
    applyResult(session.submit(value, now()))
  }

  function onChoose(v: string) {
    if (phase === 'feedback' || !current) return
    selected = v
    applyResult(session.submit(v, now()))
  }

  function onDontKnow() {
    if (phase === 'feedback' || !current) return
    applyResult(session.submitDontKnow(now()))
  }

  function onTimeout() {
    if (phase === 'feedback' || !current) return
    applyResult(session.submitTimeout(now()))
  }

  function onSkip() {
    if (phase === 'feedback') {
      advance()
      return
    }
    session.next(now())
    value = ''
    result = null
    selected = null
    phase = 'answering'
    sync()
    flash('')
    startTimer()
  }

  function onModeChange(m: PracticeMode) {
    summary = null
    endingRound = false
    clearBanner()
    clearBeat()
    session.setMode(m, now())
    value = ''
    result = null
    explanation = ''
    selected = null
    phase = 'answering'
    sync()
    flash('')
    startTimer()
  }

  function onToggleTimer(enabled: boolean) {
    session.setTimer(enabled)
    if (enabled && phase === 'answering') startTimer()
    else {
      clearTimer()
      timerScale = 1
    }
  }

  function onToggleAssist(enabled: boolean) {
    session.setAssist(enabled)
    sync() // re-evaluate the current item's presentation (choice ⇄ type)
  }

  function onToggleTonic(enabled: boolean) {
    session.setTonicStress(enabled)
    sync() // settings is a getter on the session — refresh the view
  }

  function onSetExamDate(date: string | null) {
    session.setExamDate(date)
    examDate = date // the ramp takes effect from the next composed round
  }

  function onExport() {
    const json = session.exportJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `articoli-progreso-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function onImport(json: string) {
    try {
      session.importJson(json, now())
    } catch {
      window.alert('Archivo de progreso inválido.')
      return
    }
    summary = null
    endingRound = false
    clearBanner()
    clearBeat()
    value = ''
    result = null
    explanation = ''
    selected = null
    phase = 'answering'
    sync()
    flash('')
    startTimer()
  }

  function onReset() {
    if (!window.confirm('¿Borrar todo tu progreso guardado en este navegador? No se puede deshacer.')) return
    summary = null
    endingRound = false
    clearBanner()
    clearBeat()
    session.resetProgress(now())
    value = ''
    result = null
    explanation = ''
    selected = null
    phase = 'answering'
    sync()
    flash('')
    startTimer()
  }

  function startNewRound() {
    summary = null
    endingRound = false
    clearBanner()
    clearBeat()
    session.startRound(now())
    value = ''
    result = null
    explanation = ''
    selected = null
    phase = 'answering'
    sync()
    flash('')
    startTimer()
  }

  // Keyboard for CHOICE mode only (type mode is handled by the input itself,
  // so there is no double-submit). Both Enter and Space advance from feedback —
  // Space is easy to reach with the right hand while the left works the 1–4 keys.
  function onKeydown(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey) return
    const isSpace = e.key === ' ' || e.code === 'Space'
    // Round summary: Enter or Space starts the next round (no mouse needed).
    if (summary) {
      if (!e.altKey && (e.key === 'Enter' || isSpace)) {
        e.preventDefault()
        startNewRound()
      }
      return
    }
    // Alt+n / Alt+s = No sé / Saltar from TYPE mode (Alt so they don't collide with typing).
    if (e.altKey) {
      if (current && phase !== 'feedback') {
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault()
          onDontKnow()
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault()
          onSkip()
        }
      }
      return
    }
    if (currentMode !== 'choice') return // type mode is handled by the input
    if (phase === 'feedback') {
      if (e.key === 'Enter' || isSpace) {
        e.preventDefault()
        if (!endingRound) advance()
      }
      return
    }
    // answering (choice mode): n = No sé, s = Saltar (bare, since options are picked by
    // digits and are multi-letter Italian words); digits pick an option.
    if (current && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault()
      onDontKnow()
      return
    }
    if (current && (e.key === 's' || e.key === 'S')) {
      e.preventDefault()
      onSkip()
      return
    }
    // swallow Space so it can't scroll the page.
    if (isSpace) {
      e.preventDefault()
      return
    }
    const n = Number(e.key)
    if (Number.isInteger(n) && n >= 1 && n <= choices.length) {
      e.preventDefault()
      onChoose(choices[n - 1])
    }
  }

  // matchMedia drives the mobile/desktop split (mirrors the ≤680px CSS breakpoint).
  let mql: MediaQueryList | null = null
  const onMqlChange = (e: MediaQueryListEvent) => {
    isMobile = e.matches
  }

  onMount(() => {
    mql = window.matchMedia('(max-width: 680px)')
    isMobile = mql.matches
    mql.addEventListener('change', onMqlChange)
    session.startRound(now())
    sync()
    startTimer()
  })

  onDestroy(() => {
    mql?.removeEventListener('change', onMqlChange)
    clearTimer()
    clearBanner()
    clearBeat()
  })
</script>

<svelte:window onkeydown={onKeydown} />

<main class="app-shell" data-view={view}>
  <section class="practice-panel">
    <AppHeader
      {mode}
      {metrics}
      streak={stats.streak}
      roundAnswered={stats.roundAnswered}
      roundSize={stats.roundSize}
      onOpenSettings={() => (drawerOpen = true)}
    />

    {#if !isMobile || view === 'practicar'}
      <!-- The verb cheat-sheet rides with Practicar on mobile (the desktop sidebar is hidden). -->
      {#if isMobile && verbTable}
        <ConjugationTable
          infinitive={verbTable.infinitive}
          gloss={verbTable.gloss}
          table={verbTable.table}
          askedPerson={verbTable.askedPerson}
          highlight={verbTable.highlight}
        />
      {/if}
      <Practice
        item={current}
        bind:value
        {result}
        {phase}
        settings={session.settings}
        {currentMode}
        {choices}
        {choiceOptions}
        {selected}
        {explanation}
        {stageClass}
        {timerScale}
        {showGloss}
        {showTonic}
        {banner}
        onDismissBanner={clearBanner}
        miniLesson={{
          active: isMiniLesson,
          label: focusTopic ? topicLabel(focusTopic) : null,
          done: miniDone,
          total: miniTotal,
          part: miniPart,
          parts: miniParts,
          reason: roundReason,
        }}
        beat={miniLessonBeat}
        {onSubmit}
        {onChoose}
        {onDontKnow}
        {onSkip}
      />
    {/if}

    {#if isMobile && view === 'progreso'}
      <ProgressTree
        {categoryRows}
        {nowReinforcing}
        {reinforceReason}
        {verbByInf}
        {itemsByTopic}
        activeTopic={currentTopic}
        activeAskedPerson={personOfCurrent(current)}
        activeRevealed={phase === 'feedback'}
      />
    {/if}
  </section>

  <aside class="insights-panel">
    {#if verbTable}
      <ConjugationTable
        infinitive={verbTable.infinitive}
        gloss={verbTable.gloss}
        table={verbTable.table}
        askedPerson={verbTable.askedPerson}
        highlight={verbTable.highlight}
      />
    {/if}

    <ProgressTree
      {categoryRows}
      {nowReinforcing}
      {reinforceReason}
      {verbByInf}
      {itemsByTopic}
      activeTopic={currentTopic}
      activeAskedPerson={personOfCurrent(current)}
      activeRevealed={phase === 'feedback'}
    />
  </aside>

  {#if isMobile}
    <MobileTabBar {view} onChange={(v) => (view = v)} />
  {/if}

  <SettingsDrawer
    open={drawerOpen}
    {mode}
    modes={MODES}
    settings={session.settings}
    {showTonic}
    {examDate}
    {daysLeft}
    onClose={() => (drawerOpen = false)}
    {onModeChange}
    {onToggleAssist}
    {onToggleTimer}
    {onToggleTonic}
    {onSetExamDate}
    {onExport}
    {onImport}
    {onReset}
  />

  {#if summary}
    <Summary record={summary} onNewRound={startNewRound} />
  {/if}
</main>

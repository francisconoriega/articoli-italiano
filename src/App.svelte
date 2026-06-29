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
  import { daysUntil, type TopicState, type TopicInfo } from './engine/scheduler'
  import { cardinalLesson } from './engine/numbers'
  import { explanationRules, catalog } from './content'
  import Practice from './lib/Practice.svelte'
  import Summary from './lib/Summary.svelte'
  import ConjugationTable from './lib/ConjugationTable.svelte'
  import { skillLabel, itemLabel, topicLabel } from './lib/labels'

  let { items, store }: { items: Item[]; store: ProgressStore } = $props()

  // `items`/`store` are passed once at boot and never change — read them once.
  const session = untrack(() => new PracticeSession(items, store))
  const itemIndex = untrack(() => new Map(items.map((i) => [i.id, i])))
  const verbByInf = untrack(() => new Map(catalog.verbs.map((v) => [v.infinitive, v])))
  const now = () => Date.now()

  // ── Reactive view state ───────────────────────────────────────────────────
  let current = $state<Item | null>(null)
  let value = $state('')
  let result = $state<ValidationResult | null>(null)
  let phase = $state<'answering' | 'feedback'>('answering')
  let stats = $state<SessionStats>(session.stats())
  let mode = $state<PracticeMode>(session.mode)
  let currentMode = $state<PresentationMode>('type')
  let choices = $state<string[]>([])
  let selected = $state<string | null>(null)
  let explanation = $state('')
  let stageClass = $state('')
  let summary = $state<SessionRecord | null>(null)
  // True between the round-completing answer and the summary overlay appearing.
  let endingRound = $state(false)
  let skillRows = $state<Array<{ skill: string; mastery: number }>>([])
  let weakItemRows = $state<Array<{ id: string; label: string; misses: number; mastery: number }>>([])
  let poolSize = $state(session.poolSize)
  let showGloss = $state(true)
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
  let topicRows = $state<TopicInfo[]>([])
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
  // visible during a verb's mini-lesson (acquisition) and in feedback; HIDDEN during an
  // interleaved review test so retrieval practice isn't short-circuited.
  const verbTable = $derived.by(() => {
    if (!current || !currentTopic || !currentTopic.startsWith('verb:')) return null
    const show = isMiniLesson || phase === 'feedback'
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

  // One-line summary that sits directly under the "A reforzar" heading so it never
  // reads as an empty/orphaned title.
  const reforzarSummary = $derived.by(() => {
    const parts: string[] = []
    if (weakItemRows.length) parts.push(`${weakItemRows.length} palabra${weakItemRows.length === 1 ? '' : 's'}`)
    if (skillRows.length) parts.push(`${skillRows.length} habilidad${skillRows.length === 1 ? '' : 'es'}`)
    return parts.length ? `${parts.join(' · ')} por mejorar` : ''
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
  const STATE_RANK: Record<TopicState, number> = {
    learning: 0,
    reviewing: 1,
    new: 2,
    mastered: 3,
    locked: 4,
  }

  const STATE_LABEL: Record<TopicState, string> = {
    learning: 'aprendiendo',
    reviewing: 'repasando',
    mastered: 'dominado',
    new: 'nuevo',
    locked: 'bloqueado',
  }

  function sync() {
    current = session.current
    stats = session.stats()
    mode = session.mode
    currentMode = session.currentMode
    choices = session.currentChoices
    showGloss = session.currentShowGloss
    poolSize = session.poolSize

    // Scheduler-facing state.
    currentTopic = session.currentTopic
    isMiniLesson = session.isMiniLesson
    focusTopic = session.focusTopic
    roundReason = session.roundReason
    miniTotal = session.miniLessonTotal
    miniDone = session.miniLessonDone()
    examDate = session.settings.examDate
    // Topics the learner has started, most-active first (learning → reviewing → mastered).
    topicRows = session
      .topicProgress(now())
      .filter((t) => t.seen > 0)
      .sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || b.seen / b.total - a.seen / a.total)
      .slice(0, 8)
    skillRows = Object.entries(session.store.skills)
      .filter(([, p]) => p.seen > 0)
      .map(([skill, p]) => ({ skill, mastery: p.mastery }))
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 6)

    // Concrete "weak words" — the specific items the learner is missing most.
    const weak: Array<{ id: string; label: string; misses: number; mastery: number }> = []
    for (const [id, p] of Object.entries(session.store.items)) {
      if (p.seen === 0 || p.wrong === 0) continue
      const it = itemIndex.get(id)
      if (it) weak.push({ id, label: itemLabel(it), misses: p.wrong, mastery: p.mastery })
    }
    weak.sort((a, b) => b.misses - a.misses || a.mastery - b.mastery)
    weakItemRows = weak.slice(0, 6)
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
    if (idx !== -1) return { before: text.slice(0, idx), after: text.slice(idx + BLANK.length) }
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
    // The answer stays visible ~3s, then the banner removes itself.
    bannerTimer = window.setTimeout(() => {
      banner = null
      bannerTimer = 0
    }, 3000)
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
    if (e.metaKey || e.ctrlKey || e.altKey) return
    const isSpace = e.key === ' ' || e.code === 'Space'
    // Round summary: Enter or Space starts the next round (no mouse needed).
    if (summary) {
      if (e.key === 'Enter' || isSpace) {
        e.preventDefault()
        startNewRound()
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
    // answering: digits pick an option; swallow Space so it can't scroll the page.
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

  onMount(() => {
    session.startRound(now())
    sync()
    startTimer()
  })

  onDestroy(() => {
    clearTimer()
    clearBanner()
    clearBeat()
  })
</script>

<svelte:window onkeydown={onKeydown} />

<main class="app-shell">
  <Practice
    item={current}
    bind:value
    {result}
    {phase}
    {stats}
    settings={session.settings}
    {mode}
    {currentMode}
    {choices}
    {selected}
    {explanation}
    {stageClass}
    {timerScale}
    {showGloss}
    {banner}
    {poolSize}
    miniLesson={{
      active: isMiniLesson,
      label: focusTopic ? topicLabel(focusTopic) : null,
      done: miniDone,
      total: miniTotal,
      reason: roundReason,
    }}
    beat={miniLessonBeat}
    {examDate}
    {daysLeft}
    {onSubmit}
    {onChoose}
    {onDontKnow}
    {onSkip}
    {onModeChange}
    {onToggleTimer}
    {onToggleAssist}
    {onSetExamDate}
    {onExport}
    {onImport}
    {onReset}
  />

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

    <section class="insight-section">
      <div class="section-head">
        <h2>A reforzar</h2>
        {#if weakItemRows.length || skillRows.length}
          <p class="section-summary">{reforzarSummary}</p>
        {/if}
      </div>

      {#if weakItemRows.length === 0 && skillRows.length === 0}
        <p class="muted">Responde algunas preguntas y aquí verás qué reforzar.</p>
      {:else}
        {#if weakItemRows.length}
          <div class="sub">
            <p class="eyebrow mini">Palabras</p>
            <ul class="weak-list">
              {#each weakItemRows as row (row.id)}
                <li>
                  <span>
                    <strong>{row.label}</strong>
                    <small>dominio {Math.round(row.mastery * 100)}%</small>
                  </span>
                  <small>{row.misses} error{row.misses === 1 ? '' : 'es'}</small>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
        {#if skillRows.length}
          <div class="sub">
            <p class="eyebrow mini">Habilidades</p>
            <ul class="weak-list">
              {#each skillRows as row}
                <li>
                  <span>
                    <strong>{skillLabel(row.skill)}</strong>
                    <small>dominio {Math.round(row.mastery * 100)}%</small>
                  </span>
                  <div class="mastery-bar" aria-hidden="true">
                    <div class="mastery-fill" style="width: {Math.round(row.mastery * 100)}%"></div>
                  </div>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      {/if}
    </section>

    {#if topicRows.length}
      <section class="insight-section">
        <div class="section-head">
          <h2>Temas</h2>
          <p class="section-summary">dónde vas en cada grupo</p>
        </div>
        <ul class="topic-list">
          {#each topicRows as t (t.topic)}
            <li>
              <span class="topic-name">{topicLabel(t.topic)}</span>
              <span class="topic-chip state-{t.state}">{STATE_LABEL[t.state]}</span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <div class="bank-note">
      <p class="muted small-copy">
        Lección enfocada + repaso intercalado. Lo que dominas (escribiéndolo) reaparece
        más espaciado; lo que fallas vuelve pronto. Tu progreso se guarda en este navegador.
      </p>
    </div>
  </aside>

  {#if summary}
    <Summary record={summary} onNewRound={startNewRound} />
  {/if}
</main>

<style>
  .mastery-bar {
    width: 96px;
    height: 8px;
    border-radius: 999px;
    background: var(--line);
    overflow: hidden;
    flex: 0 0 auto;
  }
  .mastery-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--red), #d1a03d 55%, var(--accent));
    border-radius: 999px;
  }
  .weak-list li {
    align-items: center;
  }
  .mini {
    margin: 14px 0 6px;
    font-size: 0.72rem;
  }
  /* A section = a heading-group that HUGS its content (tight internal gaps),
     while the panel's own 24px gap separates whole sections. Kills the
     orphaned-heading / "looks empty" effect. */
  .insight-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .section-head {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .section-summary {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--muted);
  }
  .sub {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .sub .mini {
    margin: 0;
  }
  .sub .weak-list {
    margin: 0;
  }
  .insight-section .topic-list {
    margin: 0;
  }
  .topic-list {
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .topic-list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .topic-name {
    font-weight: 700;
    font-size: 0.9rem;
    overflow-wrap: anywhere;
  }
  .topic-chip {
    flex: 0 0 auto;
    border-radius: 999px;
    padding: 2px 9px;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    border: 1px solid var(--line);
    color: var(--muted);
    background: var(--panel);
  }
  .topic-chip.state-learning {
    border-color: var(--amber);
    color: var(--amber-strong);
    background: var(--amber-soft);
  }
  .topic-chip.state-reviewing {
    border-color: var(--blue);
    color: var(--blue);
    background: rgba(2, 132, 199, 0.1);
  }
  .topic-chip.state-mastered {
    border-color: var(--accent);
    color: var(--accent-strong);
    background: var(--green-soft);
  }
</style>

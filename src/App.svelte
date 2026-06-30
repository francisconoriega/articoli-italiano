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
  import { daysUntil, categoryProgress, type TopicState, type TopicInfo, type CategoryInfo } from './engine/scheduler'
  import { cardinalLesson } from './engine/numbers'
  import { explanationRules, catalog } from './content'
  import Practice from './lib/Practice.svelte'
  import Summary from './lib/Summary.svelte'
  import ConjugationTable from './lib/ConjugationTable.svelte'
  import ReferenceCard from './lib/ReferenceCard.svelte'
  import { topicLabel, subtopicLabel, categoryLabel } from './lib/labels'

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
  let poolSize = $state(session.poolSize)
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
  // Which categories are expanded (explicit user toggles override the default-open one).
  let openCats = $state<Record<string, boolean>>({})
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

  // Category tree expand/collapse. The first active category is open by default until
  // the learner explicitly toggles something (then openCats wins).
  const defaultOpenKey = $derived(
    categoryRows.find((c) => c.state === 'active')?.key ?? categoryRows[0]?.key ?? null,
  )
  function isOpen(key: string): boolean {
    return openCats[key] ?? key === defaultOpenKey
  }
  function toggleCat(key: string): void {
    openCats = { ...openCats, [key]: !isOpen(key) }
  }

  // Click-to-open reference (cheat-sheet) for a subtopic: a verb's conjugation table,
  // or a cue→answer list (numbers, ordinales, la hora, vocab…). One open at a time.
  let openReference = $state<string | null>(null)
  function toggleReference(topic: string): void {
    openReference = openReference === topic ? null : topic
  }
  // Per-category "Dominados (N)" expand toggle (reveals the mastered subtopics).
  let openDominados = $state<Record<string, boolean>>({})
  function toggleDominados(key: string): void {
    openDominados = { ...openDominados, [key]: !openDominados[key] }
  }
  /** Catalog verb entry for a verb:* topic (null for non-verb topics). */
  function verbFor(topic: string) {
    return topic.startsWith('verb:') ? (verbByInf.get(topic.slice(5)) ?? null) : null
  }
  /** Reference rows (cue → answer) for a non-verb topic, derived from its items. */
  function referenceRows(topic: string): Array<{ cue: string; answer: string }> {
    const list = itemsByTopic.get(topic) ?? []
    const isOrdinal = topic.startsWith('num:ordinal')
    const hasFigures = list.length > 0 && list.every((it) => typeof it.prompt.figure === 'number')
    const sorted = hasFigures ? [...list].sort((a, b) => (a.prompt.figure ?? 0) - (b.prompt.figure ?? 0)) : list
    return sorted.map((it) => {
      let cue: string
      if (typeof it.prompt.figure === 'number') cue = isOrdinal ? `${it.prompt.figure}°` : String(it.prompt.figure)
      else if (it.kind === 'tell-time') cue = it.prompt.text
      else cue = it.gloss ?? it.prompt.text.replace(BLANK, '___').trim()
      return { cue, answer: it.answer }
    })
  }

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
    choiceOptions = session.currentChoiceOptions
    showGloss = session.currentShowGloss
    showTonic = session.settings.tonicStress
    poolSize = session.poolSize

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
    {choiceOptions}
    {selected}
    {explanation}
    {stageClass}
    {timerScale}
    {showGloss}
    {showTonic}
    {banner}
    onDismissBanner={clearBanner}
    {poolSize}
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
    {examDate}
    {daysLeft}
    {onSubmit}
    {onChoose}
    {onDontKnow}
    {onSkip}
    {onModeChange}
    {onToggleTimer}
    {onToggleAssist}
    {onToggleTonic}
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
      <div class="section-head avance-head">
        <h2>Tu avance</h2>
        <span class="legend">
          <span class="legend-item"><i class="dot cov" aria-hidden="true"></i>cobertura</span>
          <span class="legend-item"><i class="dot dom" aria-hidden="true"></i>dominio</span>
        </span>
      </div>

      {#if nowReinforcing.length}
        <div class="now-reinforcing">
          <p class="reinforce-title">Ahora reforzando</p>
          <div class="reinforce-chips">
            {#each nowReinforcing as label}
              <span class="reinforce-chip">{label}</span>
            {/each}
          </div>
          <p class="reinforce-reason">{reinforceReason}</p>
        </div>
      {/if}

      {#snippet subtopicRow(t: TopicInfo)}
        {@const refOpen = openReference === t.topic}
        <button
          type="button"
          class="subtopic"
          class:selected={refOpen}
          aria-expanded={refOpen}
          onclick={() => toggleReference(t.topic)}
        >
          <span class="subref-chev" class:open={refOpen} aria-hidden="true">▶</span>
          <span class="subtopic-name">{subtopicLabel(t.topic)}</span>
          <span class="topic-chip state-{t.state}">{STATE_LABEL[t.state]}</span>
          <span class="subtopic-dom">{Math.round(t.seenMastery * 100)}%</span>
        </button>
        {#if refOpen}
          {@const verb = verbFor(t.topic)}
          <div class="subtopic-ref">
            {#if verb && verb.tenses.presente}
              <ConjugationTable infinitive={verb.infinitive} gloss={verb.gloss} table={verb.tenses.presente} />
            {:else}
              {@const rows = referenceRows(t.topic)}
              {#if rows.length}
                <ReferenceCard title={topicLabel(t.topic)} rows={rows} />
              {:else}
                <p class="muted small-copy">Sin referencia para este tema.</p>
              {/if}
            {/if}
          </div>
        {/if}
      {/snippet}

      {#if categoryRows.length}
        <ul class="cat-list">
          {#each categoryRows as cat (cat.key)}
            {@const open = isOpen(cat.key)}
            <li class="cat" class:mastered={cat.state === 'mastered'}>
              <button class="cat-head" aria-expanded={open} onclick={() => toggleCat(cat.key)}>
                <span class="chev" class:open aria-hidden="true">▶</span>
                <span class="cat-name">{categoryLabel(cat.key)}</span>
                {#if cat.weakTopics > 0}
                  <span class="cat-flag weak">{cat.weakTopics} flojo{cat.weakTopics === 1 ? '' : 's'}</span>
                {:else if cat.seen > 0}
                  <span class="cat-flag ok" aria-label="al día">✓</span>
                {/if}
                <span class="cat-nums">
                  <b>{Math.round(cat.mastery * 100)}%</b>
                  <i>{Math.round(cat.coverage * 100)}%</i>
                </span>
              </button>
              <div class="bars" aria-hidden="true">
                <div class="bar-track"><div class="bar-fill cov" style="width: {Math.round(cat.coverage * 100)}%"></div></div>
                <div class="bar-track"><div class="bar-fill dom" style="width: {Math.round(cat.mastery * 100)}%"></div></div>
              </div>
              {#if open}
                {@const weakSubs = cat.topics.filter((t) => t.seen > 0 && t.state !== 'mastered')}
                {@const masteredSubs = cat.topics.filter((t) => t.state === 'mastered')}
                {@const domOpen = openDominados[cat.key] ?? false}
                <div class="cat-detail">
                  {#each weakSubs as t (t.topic)}
                    {@render subtopicRow(t)}
                  {/each}
                  {#if masteredSubs.length > 0}
                    <button
                      type="button"
                      class="dominados"
                      aria-expanded={domOpen}
                      onclick={() => toggleDominados(cat.key)}
                    >
                      <span class="subref-chev" class:open={domOpen} aria-hidden="true">▶</span>
                      <span class="dominados-check" aria-hidden="true">✓</span>
                      Dominados ({masteredSubs.length})
                    </button>
                    {#if domOpen}
                      <div class="dominados-children">
                        {#each masteredSubs as t (t.topic)}
                          {@render subtopicRow(t)}
                        {/each}
                      </div>
                    {/if}
                  {/if}
                  {#if weakSubs.length === 0 && masteredSubs.length === 0}
                    <p class="muted small-copy">Aún sin empezar.</p>
                  {/if}
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="muted">Responde algunas preguntas y aquí verás tu avance por categoría.</p>
      {/if}
    </section>

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
  /* A section = a heading-group that HUGS its content (tight internal gaps),
     while the panel's own 24px gap separates whole sections. Kills the
     orphaned-heading / "looks empty" effect. */
  .insight-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .section-head {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .avance-head {
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .legend {
    display: inline-flex;
    gap: 10px;
    font-size: 0.7rem;
    color: var(--muted);
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .dot {
    width: 14px;
    height: 4px;
    border-radius: 999px;
    display: inline-block;
  }
  .dot.cov {
    background: var(--amber);
  }
  .dot.dom {
    background: var(--accent);
  }

  /* "Ahora reforzando" — exactly what the scheduler is drilling this round. */
  .now-reinforcing {
    background: var(--green-soft);
    border: 1px solid #bfe0cd;
    border-radius: 10px;
    padding: 11px 12px;
  }
  .reinforce-title {
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent-strong);
    font-weight: 700;
    margin: 0 0 8px;
  }
  .reinforce-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }
  .reinforce-chip {
    background: var(--panel);
    border: 1px solid #bfe0cd;
    border-radius: 999px;
    padding: 3px 9px;
    font-size: 0.82rem;
    color: var(--accent-strong);
  }
  .reinforce-reason {
    font-size: 0.78rem;
    color: #3f6b58;
    margin: 0;
  }

  /* Category tree */
  .cat-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .cat {
    border-top: 1px solid var(--line);
    padding: 11px 2px;
  }
  .cat.mastered {
    opacity: 0.62;
  }
  .cat-head {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }
  .cat-head:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 4px;
  }
  .chev {
    font-size: 0.7rem;
    color: #9a948a;
    transition: transform 0.15s ease;
    display: inline-block;
  }
  .chev.open {
    transform: rotate(90deg);
  }
  .cat-name {
    flex: 1;
    font-size: 0.95rem;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .cat-flag {
    flex: 0 0 auto;
    border-radius: 999px;
    padding: 2px 7px;
    font-size: 0.7rem;
    font-weight: 700;
  }
  .cat-flag.weak {
    background: var(--red-soft);
    color: #9c372b;
  }
  .cat-flag.ok {
    color: var(--accent);
    background: none;
    padding: 0;
  }
  .cat-nums {
    flex: 0 0 auto;
    font-size: 0.74rem;
    min-width: 70px;
    text-align: right;
  }
  .cat-nums b {
    color: var(--accent);
    font-weight: 600;
  }
  .cat-nums i {
    color: var(--amber);
    font-style: normal;
  }
  .bars {
    margin-top: 9px;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .bar-track {
    height: 4px;
    border-radius: 999px;
    background: #ece5d7;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 999px;
  }
  .bar-fill.cov {
    background: var(--amber);
  }
  .bar-fill.dom {
    background: var(--accent);
  }
  .cat-detail {
    padding-left: 20px;
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .subtopic {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 2px;
    width: 100%;
    border-radius: 4px;
  }
  .subtopic:hover {
    background: rgba(37, 111, 91, 0.06);
  }
  .subtopic:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .subtopic.selected {
    background: var(--green-soft);
  }
  .subref-chev {
    flex: 0 0 auto;
    font-size: 0.6rem;
    color: #9a948a;
    transition: transform 0.15s ease;
  }
  .subref-chev.open {
    transform: rotate(90deg);
  }
  .subtopic-ref {
    margin: 4px 0 10px;
  }
  .subtopic-name {
    flex: 1;
    font-size: 0.82rem;
    color: #3a3833;
    overflow-wrap: anywhere;
  }
  .subtopic-dom {
    flex: 0 0 auto;
    font-size: 0.74rem;
    color: var(--accent);
    min-width: 30px;
    text-align: right;
  }
  .dominados {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 2px 4px;
    font-size: 0.76rem;
    color: var(--muted);
    width: 100%;
    border-radius: 4px;
  }
  .dominados:hover {
    background: rgba(37, 111, 91, 0.06);
  }
  .dominados:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .dominados-check {
    color: var(--accent);
  }
  /* Mastered subtopics sit visually inside the "Dominados" group. */
  .dominados-children {
    padding-left: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
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

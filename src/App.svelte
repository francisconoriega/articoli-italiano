<script lang="ts">
  import { onMount, onDestroy, untrack } from 'svelte'
  import type {
    Item,
    PracticeMode,
    PresentationMode,
    ProgressStore,
    SessionRecord,
    ValidationResult,
  } from './types'
  import { BLANK } from './types'
  import { PracticeSession, type SessionStats, type SubmitResult } from './engine/session'
  import { cardinalLesson } from './engine/numbers'
  import { explanationRules } from './content'
  import Practice from './lib/Practice.svelte'
  import Summary from './lib/Summary.svelte'
  import { skillLabel } from './lib/labels'

  let { items, store }: { items: Item[]; store: ProgressStore } = $props()

  // `items`/`store` are passed once at boot and never change — read them once.
  const session = untrack(() => new PracticeSession(items, store))
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
  let poolSize = $state(session.poolSize)
  let showGloss = $state(true)
  // Anchored correction banner (top of canvas, ~3s) shown on a miss / "No sé".
  let banner = $state<{ answer: string; before: string; after: string; meaning: string | null; status: 'wrong' | 'near' } | null>(null)
  let bannerTimer = 0

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
    showGloss = session.currentShowGloss
    poolSize = session.poolSize
    skillRows = Object.entries(session.store.skills)
      .filter(([, p]) => p.seen > 0)
      .map(([skill, p]) => ({ skill, mastery: p.mastery }))
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 6)
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

  function onReset() {
    if (!window.confirm('¿Borrar todo tu progreso guardado en este navegador? No se puede deshacer.')) return
    summary = null
    endingRound = false
    clearBanner()
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
  // so there is no double-submit).
  function onKeydown(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (currentMode !== 'choice') return
    if (phase === 'answering') {
      const n = Number(e.key)
      if (Number.isInteger(n) && n >= 1 && n <= choices.length) {
        e.preventDefault()
        onChoose(choices[n - 1])
      }
    } else if (phase === 'feedback' && e.key === 'Enter') {
      e.preventDefault()
      if (!summary && !endingRound) advance()
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
    {onSubmit}
    {onChoose}
    {onDontKnow}
    {onSkip}
    {onModeChange}
    {onToggleTimer}
    {onToggleAssist}
    {onReset}
  />

  <aside class="insights-panel">
    <div>
      <p class="eyebrow">Progreso</p>
      <h2>Áreas a reforzar</h2>
    </div>

    {#if skillRows.length === 0}
      <p class="muted">Responde algunas preguntas y aquí verás tus puntos débiles por habilidad.</p>
    {:else}
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
    {/if}

    <div class="bank-note">
      <p class="muted small-copy">
        Modo fácil (opción múltiple) al inicio; cuando dominas algo, pasa a escritura libre.
        Tu progreso se guarda en este navegador.
      </p>
    </div>
  </aside>

  {#if summary}
    <Summary record={summary} onNewRound={startNewRound} onContinue={startNewRound} />
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
</style>

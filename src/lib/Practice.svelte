<script lang="ts">
  import type { Item, PracticeMode, PresentationMode, Settings, ValidationResult } from '../types'
  import type { SessionStats } from '../engine/session'
  import type { ChoiceOption } from '../engine/choices'
  import TypeAnswer from './exercises/TypeAnswer.svelte'
  import AgreementAnswer from './exercises/AgreementAnswer.svelte'
  import Choice from './exercises/Choice.svelte'
  import Feedback from './Feedback.svelte'
  import CorrectionBanner from './CorrectionBanner.svelte'
  import { modeLabel } from './labels'

  type Banner = { answer: string; before: string; after: string; meaning: string | null; status: 'wrong' | 'near' }
  type MiniLesson = {
    active: boolean
    label: string | null
    done: number
    total: number
    /** "Parte N de M" when the topic spans several lessons; both 0 otherwise. */
    part: number
    parts: number
    reason: 'remediation' | 'acquisition' | 'new' | 'review'
  }

  let {
    item,
    value = $bindable(''),
    result,
    phase,
    stats,
    settings,
    mode,
    currentMode,
    choices,
    choiceOptions = null,
    selected = null,
    explanation = '',
    stageClass = '',
    timerScale = 1,
    showGloss = true,
    showTonic = true,
    banner = null,
    onDismissBanner,
    poolSize,
    miniLesson,
    beat = null,
    examDate = null,
    daysLeft = null,
    onSubmit,
    onChoose,
    onDontKnow,
    onSkip,
    onModeChange,
    onToggleTimer,
    onToggleAssist,
    onToggleTonic,
    onSetExamDate,
    onExport,
    onImport,
    onReset,
  }: {
    item: Item | null
    value?: string
    result: ValidationResult | null
    phase: 'answering' | 'feedback'
    stats: SessionStats
    settings: Settings
    mode: PracticeMode
    currentMode: PresentationMode
    choices: string[]
    choiceOptions?: ChoiceOption[] | null
    selected?: string | null
    explanation?: string
    stageClass?: string
    timerScale?: number
    showGloss?: boolean
    showTonic?: boolean
    banner?: Banner | null
    onDismissBanner?: () => void
    poolSize: number
    miniLesson: MiniLesson
    beat?: string | null
    examDate?: string | null
    daysLeft?: number | null
    onSubmit: () => void
    onChoose: (value: string) => void
    onDontKnow: () => void
    onSkip: () => void
    onModeChange: (mode: PracticeMode) => void
    onToggleTimer: (enabled: boolean) => void
    onToggleAssist: (enabled: boolean) => void
    onToggleTonic: (enabled: boolean) => void
    onSetExamDate: (date: string | null) => void
    onExport: () => void
    onImport: (json: string) => void
    onReset: () => void
  } = $props()

  const REASON_LABEL: Record<MiniLesson['reason'], string> = {
    remediation: 'repaso enfocado',
    acquisition: 'aprendiendo',
    new: 'tema nuevo',
    review: 'repaso',
  }

  async function handleImportFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const text = await file.text()
    onImport(text)
    input.value = '' // allow re-importing the same file
  }

  const MODES: PracticeMode[] = ['mixed', 'verbs', 'articles', 'numbers', 'vocab', 'body', 'agreement', 'time', 'functional']
</script>

<section class="practice-panel">
  {#if banner}
    <CorrectionBanner
      answer={banner.answer}
      before={banner.before}
      after={banner.after}
      meaning={banner.meaning}
      status={banner.status}
      onDismiss={onDismissBanner}
    />
  {/if}
  <header class="topbar">
    <div>
      <p class="eyebrow">Articoli Italiano</p>
      <h1>{modeLabel(mode)}</h1>
    </div>
    <div class="session-score" aria-label="Precisión de la sesión">
      <span>{stats.sessionAccuracy}%</span>
      <small>precisión</small>
    </div>
  </header>

  <div class="status-strip">
    <div><span>{stats.roundAnswered}/{stats.roundSize}</span><small>ronda</small></div>
    <div><span>{stats.streak}</span><small>racha</small></div>
    <div><span>{stats.correct}</span><small>aciertos</small></div>
  </div>

  <div class="mode-row">
    <div class="segmented-control" role="tablist" aria-label="Modo de práctica">
      {#each MODES as m}
        <button
          class="segment-button"
          class:active={mode === m}
          role="tab"
          aria-selected={mode === m}
          onclick={() => onModeChange(m)}
        >
          {modeLabel(m)}
        </button>
      {/each}
    </div>
    <div class="toggles">
      <label class="toggle-control">
        <input
          type="checkbox"
          checked={settings.assist}
          onchange={(e) => onToggleAssist(e.currentTarget.checked)}
        />
        Opción múltiple
      </label>
      <label class="toggle-control">
        <input
          type="checkbox"
          checked={settings.timerEnabled}
          onchange={(e) => onToggleTimer(e.currentTarget.checked)}
        />
        Cronómetro
      </label>
      <label class="toggle-control" title="Subraya la sílaba tónica de palabras de 3+ sílabas">
        <input
          type="checkbox"
          checked={showTonic}
          onchange={(e) => onToggleTonic(e.currentTarget.checked)}
        />
        Sílaba tónica
      </label>
      <label class="toggle-control exam-control">
        <span>Examen</span>
        <input
          type="date"
          aria-label="Fecha del examen (opcional)"
          value={examDate ?? ''}
          onchange={(e) => onSetExamDate(e.currentTarget.value || null)}
        />
        {#if daysLeft !== null}
          <small class="exam-days">{daysLeft === 0 ? 'hoy' : `en ${daysLeft} d`}</small>
        {/if}
      </label>
    </div>
  </div>

  {#if beat}
    <div class="mini-beat" role="status">¡Lección completa: {beat}! 🎉</div>
  {:else if item && miniLesson.active && miniLesson.label}
    <div class="mini-indicator" aria-label="Mini-lección en curso">
      <span class="mini-tag">Lección</span>
      <strong class="mini-name">{miniLesson.label}</strong>
      {#if miniLesson.parts > 1}
        <span class="mini-part">parte {miniLesson.part} de {miniLesson.parts}</span>
      {/if}
      <span class="mini-reason">{REASON_LABEL[miniLesson.reason]}</span>
      {#if miniLesson.total > 0}
        <span class="mini-dots" aria-hidden="true">
          {#each Array(miniLesson.total) as _, i}
            <span class="dot" class:done={i < miniLesson.done}></span>
          {/each}
        </span>
      {/if}
    </div>
  {/if}

  {#if item}
    {#if currentMode === 'choice'}
      <Choice
        {item}
        {choices}
        {choiceOptions}
        {selected}
        disabled={phase === 'feedback'}
        {showGloss}
        showTonic={showTonic}
        {stageClass}
        showTimer={settings.timerEnabled}
        {timerScale}
        {onChoose}
      />
    {:else if item.kind === 'agreement'}
      <!-- Multi-blank typing: one inline input per ending (Ex2). -->
      <AgreementAnswer
        {item}
        bind:value
        {result}
        disabled={phase === 'feedback'}
        {showGloss}
        showTonic={showTonic}
        {stageClass}
        showTimer={settings.timerEnabled}
        {timerScale}
        onsubmit={onSubmit}
      />
    {:else}
      <TypeAnswer
        {item}
        bind:value
        {result}
        disabled={phase === 'feedback'}
        {showGloss}
        showTonic={showTonic}
        {stageClass}
        showTimer={settings.timerEnabled}
        {timerScale}
        onsubmit={onSubmit}
      />
    {/if}
    <Feedback {result} {item} {explanation} />
  {:else}
    <div class="word-stage">
      <p class="translation">Sin elementos en este modo.</p>
      <p class="prompt-text">Cambia de modo para seguir practicando.</p>
    </div>
  {/if}

  <div class="controls-row">
    {#if phase === 'answering'}
      <button class="ghost-button" onclick={onDontKnow} disabled={!item}>No sé</button>
      <button class="ghost-button" onclick={onSkip} disabled={!item}>Saltar</button>
    {:else}
      <button class="ghost-button primary" onclick={onSubmit}>Siguiente →</button>
      <span class="hint">Presiona Enter para continuar</span>
    {/if}
    <span class="spacer"></span>
    <span class="hint">{poolSize} elementos</span>
    <button class="ghost-button" onclick={onExport}>Exportar</button>
    <label class="ghost-button import-btn">
      Importar
      <input type="file" accept="application/json,.json" onchange={handleImportFile} hidden />
    </label>
    <button class="ghost-button danger" onclick={onReset}>Reiniciar</button>
  </div>
</section>

<style>
  .session-score {
    width: 92px;
    aspect-ratio: 1;
    border-radius: 50%;
    border: 9px solid var(--green-soft);
    display: grid;
    place-items: center;
    text-align: center;
    flex: 0 0 auto;
  }
  .session-score span {
    display: block;
    font-size: 1.25rem;
    font-weight: 800;
  }
  .session-score small {
    color: var(--muted);
    font-size: 0.72rem;
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .mode-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .toggles {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .toggle-control {
    min-height: 44px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--panel);
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    cursor: pointer;
  }
  .toggle-control input {
    width: 18px;
    height: 18px;
    accent-color: var(--accent);
  }
  .controls-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }
  .spacer {
    flex: 1 1 auto;
  }
  /* The Importar <label> wraps a hidden file input but should look/behave like a button. */
  .import-btn {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
  }

  /* Exam-date knob (optional) */
  .exam-control {
    gap: 6px;
    font-weight: 700;
  }
  .exam-control input[type='date'] {
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--panel);
    padding: 2px 6px;
    font-size: 0.85rem;
  }
  .exam-days {
    color: var(--accent-strong);
    font-weight: 800;
  }

  /* Mini-lesson indicator */
  .mini-indicator {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    border: 1px solid var(--accent);
    background: rgba(37, 111, 91, 0.08);
    border-radius: var(--radius);
    padding: 8px 14px;
  }
  .mini-tag {
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #fffdf8;
    background: var(--accent);
    border-radius: 999px;
    padding: 2px 10px;
  }
  .mini-name {
    font-size: 1.05rem;
    font-weight: 800;
  }
  .mini-reason {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--muted);
    text-transform: lowercase;
  }
  .mini-part {
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    border-radius: 999px;
    padding: 2px 8px;
    text-transform: lowercase;
  }
  .mini-dots {
    margin-left: auto;
    display: inline-flex;
    gap: 5px;
  }
  .mini-dots .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 1.5px solid var(--accent);
    background: transparent;
  }
  .mini-dots .dot.done {
    background: var(--accent);
  }

  /* Mini-lesson completion beat */
  .mini-beat {
    border-radius: var(--radius);
    padding: 10px 16px;
    font-weight: 900;
    font-size: 1.05rem;
    color: var(--accent-strong);
    background: var(--green-soft);
    border: 1px solid var(--accent);
    text-align: center;
    animation: beatPop 320ms ease;
  }
  @keyframes beatPop {
    0% {
      transform: scale(0.96);
      opacity: 0;
    }
    60% {
      transform: scale(1.02);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>

<script lang="ts">
  import type { Item, PracticeMode, PresentationMode, Settings, ValidationResult } from '../types'
  import type { SessionStats } from '../engine/session'
  import TypeAnswer from './exercises/TypeAnswer.svelte'
  import Choice from './exercises/Choice.svelte'
  import Feedback from './Feedback.svelte'
  import CorrectionBanner from './CorrectionBanner.svelte'
  import { modeLabel } from './labels'

  type Banner = { answer: string; before: string; after: string; meaning: string | null; status: 'wrong' | 'near' }

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
    selected = null,
    explanation = '',
    stageClass = '',
    timerScale = 1,
    showGloss = true,
    banner = null,
    poolSize,
    onSubmit,
    onChoose,
    onDontKnow,
    onSkip,
    onModeChange,
    onToggleTimer,
    onToggleAssist,
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
    selected?: string | null
    explanation?: string
    stageClass?: string
    timerScale?: number
    showGloss?: boolean
    banner?: Banner | null
    poolSize: number
    onSubmit: () => void
    onChoose: (value: string) => void
    onDontKnow: () => void
    onSkip: () => void
    onModeChange: (mode: PracticeMode) => void
    onToggleTimer: (enabled: boolean) => void
    onToggleAssist: (enabled: boolean) => void
    onReset: () => void
  } = $props()

  const MODES: PracticeMode[] = ['mixed', 'verbs', 'articles', 'numbers', 'vocab']
</script>

<section class="practice-panel">
  {#if banner}
    <CorrectionBanner
      answer={banner.answer}
      before={banner.before}
      after={banner.after}
      meaning={banner.meaning}
      status={banner.status}
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
    </div>
  </div>

  {#if item}
    {#if currentMode === 'choice'}
      <Choice
        {item}
        {choices}
        {selected}
        disabled={phase === 'feedback'}
        {showGloss}
        {stageClass}
        showTimer={settings.timerEnabled}
        {timerScale}
        {onChoose}
      />
    {:else}
      <TypeAnswer
        {item}
        bind:value
        {result}
        disabled={phase === 'feedback'}
        {showGloss}
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
</style>

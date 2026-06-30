<script lang="ts">
  import type { Item, PresentationMode, Settings, ValidationResult } from '../types'
  import type { ChoiceOption } from '../engine/choices'
  import TypeAnswer from './exercises/TypeAnswer.svelte'
  import AgreementAnswer from './exercises/AgreementAnswer.svelte'
  import Choice from './exercises/Choice.svelte'
  import Feedback from './Feedback.svelte'
  import CorrectionBanner from './CorrectionBanner.svelte'

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
    settings,
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
    miniLesson,
    beat = null,
    onSubmit,
    onChoose,
    onDontKnow,
    onSkip,
  }: {
    item: Item | null
    value?: string
    result: ValidationResult | null
    phase: 'answering' | 'feedback'
    settings: Settings
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
    miniLesson: MiniLesson
    beat?: string | null
    onSubmit: () => void
    onChoose: (value: string) => void
    onDontKnow: () => void
    onSkip: () => void
  } = $props()

  const REASON_LABEL: Record<MiniLesson['reason'], string> = {
    remediation: 'repaso enfocado',
    acquisition: 'aprendiendo',
    new: 'tema nuevo',
    review: 'repaso',
  }
</script>

<!--
  Practice renders the answer-flow body only (banner → mini-lesson → exercise → feedback →
  primary controls). The surrounding .practice-panel chrome and the header/metrics now live
  in App.svelte (AppHeader); these elements are laid out by that panel's flex column.
-->
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
</div>

<style>
  .controls-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
  }
  .spacer {
    flex: 1 1 auto;
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
  @media (prefers-reduced-motion: reduce) {
    .mini-beat {
      animation: none;
    }
  }
</style>

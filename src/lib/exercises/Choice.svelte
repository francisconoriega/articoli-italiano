<script lang="ts">
  import type { Item } from '../../types'
  import type { ChoiceOption } from '../../engine/choices'
  import { promptView, lineSegments, badgeTitle } from '../promptView'

  let {
    item,
    choices,
    choiceOptions = null,
    selected = null,
    disabled = false,
    showGloss = true,
    showTonic = true,
    stageClass = '',
    showTimer = false,
    timerScale = 1,
    onChoose,
  }: {
    item: Item
    /** Plain string choices (legacy path — used when choiceOptions is not provided). */
    choices: string[]
    /**
     * Annotated choices with optional per-option helper notes (L0 scaffolding).
     * When provided, this takes precedence over `choices` for rendering.
     * The `note` on each option (e.g. the verb infinitive) is shown as small muted
     * text below the option value at L0; absent options have no note rendered.
     */
    choiceOptions?: ChoiceOption[] | null
    selected?: string | null
    disabled?: boolean
    showGloss?: boolean
    showTonic?: boolean
    stageClass?: string
    showTimer?: boolean
    timerScale?: number
    onChoose?: (value: string) => void
  } = $props()

  const pv = $derived(promptView(item))

  /** Resolved list of options — annotated when choiceOptions supplied, else plain strings. */
  const opts = $derived<ChoiceOption[]>(
    choiceOptions ?? choices.map((v) => ({ value: v })),
  )

  function choiceClass(value: string): string {
    if (!disabled) return 'choice-button'
    if (value === item.answer) return 'choice-button correct'
    if (value === selected) return 'choice-button wrong'
    return 'choice-button is-dim'
  }

  /** CSS class to tint a badge by grammar category. */
  function badgeClass(badge: string): string {
    if (badge === 'Singular') return 'badge grammar-singular'
    if (badge === 'Plural') return 'badge grammar-plural'
    if (badge === 'Excepción') return 'badge warn'
    return 'badge'
  }
</script>

<div class="word-stage {stageClass}">
  {#if showTimer}
    <div class="timer-shell"><div class="timer-bar" style="transform: scaleX({timerScale});"></div></div>
  {/if}

  {#if pv.badges.length}
    <div class="badge-row">
      {#each pv.badges as b}<span class={badgeClass(b)} title={badgeTitle(b)}>{b}</span>{/each}
    </div>
  {/if}

  <!-- HERO -->
  {#if pv.hero.isFigure}
    <div class="prompt-hero figure">{pv.hero.text}</div>
  {:else}
    <div class="prompt-hero">{@render line(pv.hero.text, pv.hero.tonic && showTonic)}</div>
  {/if}

  {#if showGloss && pv.meaning}
    <div class="prompt-meaning">{pv.meaning}</div>
  {/if}
  {#if showGloss && pv.translation}
    <div class="prompt-translation">{pv.translation}</div>
  {/if}

  {#if pv.task}
    <div class="prompt-task">{@render line(pv.task.text, pv.task.tonic && showTonic)}</div>
  {/if}

  {#if item.prompt.hint}<div class="hint">{item.prompt.hint}</div>{/if}

  <div class="choice-grid">
    {#each opts as opt, i (opt.value + i)}
      <button type="button" class={choiceClass(opt.value)} {disabled} onclick={() => onChoose?.(opt.value)}>
        <kbd>{i + 1}</kbd>
        <span class="opt-content">
          {#if opt.label}
            <span class="opt-value">{opt.label}</span>
          {:else}
            <span class="opt-value">{@render line(opt.value, showTonic)}</span>
          {/if}
          {#if opt.note}
            <span class="opt-note">{opt.note}</span>
          {/if}
        </span>
      </button>
    {/each}
  </div>
</div>

{#snippet line(text: string, tonic: boolean)}
  {#each lineSegments(text, tonic) as seg}{#if seg.t === 'blank'}{@const fill = !disabled
    ? ' '
    : item.prompt.blanks
      ? (item.prompt.blanks[seg.i] ?? ' ')
      : (selected ?? ' ')}<span
    class="blank-slot"
    class:filled={fill.trim().length > 0}>{fill}</span
  >{:else if seg.t === 'tonic'}<span class="tonic">{seg.v}</span>{:else}<span>{seg.v}</span>{/if}{/each}
{/snippet}

<style>
  .choice-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 4px;
  }
  .choice-button {
    min-height: 62px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--panel);
    color: var(--ink);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 16px;
    cursor: pointer;
    transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
  }
  .choice-button:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .choice-button:active:not(:disabled) {
    transform: translateY(1px);
  }
  /* opt-content stacks value + note vertically */
  .opt-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }
  .opt-value {
    font-size: 1.3rem;
    font-weight: 800;
  }
  .opt-note {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--muted);
    font-style: italic;
  }
  .choice-button.correct {
    border-color: var(--accent);
    background: var(--green-soft);
  }
  .choice-button.wrong {
    border-color: var(--red);
    background: var(--red-soft);
  }
  .choice-button.is-dim {
    opacity: 0.55;
  }
</style>

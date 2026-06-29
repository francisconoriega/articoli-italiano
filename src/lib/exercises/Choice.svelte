<script lang="ts">
  import type { Item } from '../../types'
  import { promptView, splitBlank, badgeTitle } from '../promptView'

  let {
    item,
    choices,
    selected = null,
    disabled = false,
    showGloss = true,
    stageClass = '',
    showTimer = false,
    timerScale = 1,
    onChoose,
  }: {
    item: Item
    choices: string[]
    selected?: string | null
    disabled?: boolean
    showGloss?: boolean
    stageClass?: string
    showTimer?: boolean
    timerScale?: number
    onChoose?: (value: string) => void
  } = $props()

  const pv = $derived(promptView(item))

  function choiceClass(opt: string): string {
    if (!disabled) return 'choice-button'
    if (opt === item.answer) return 'choice-button correct'
    if (opt === selected) return 'choice-button wrong'
    return 'choice-button is-dim'
  }
</script>

<div class="word-stage {stageClass}">
  {#if showTimer}
    <div class="timer-shell"><div class="timer-bar" style="transform: scaleX({timerScale});"></div></div>
  {/if}

  {#if pv.badges.length}
    <div class="badge-row">
      {#each pv.badges as b}<span class="badge" class:warn={b === 'Excepción'} title={badgeTitle(b)}>{b}</span>{/each}
    </div>
  {/if}

  <!-- HERO -->
  {#if pv.hero.isFigure}
    <div class="prompt-hero figure">{pv.hero.text}</div>
  {:else if pv.hero.hasBlank}
    <div class="prompt-hero">{@render inlineLine(pv.hero.text)}</div>
  {:else}
    <div class="prompt-hero">{pv.hero.text}</div>
  {/if}

  {#if showGloss && pv.meaning}
    <div class="prompt-meaning">{pv.meaning}</div>
  {/if}

  {#if pv.task}
    <div class="prompt-task">
      {#if pv.task.hasBlank}{@render inlineLine(pv.task.text)}{:else}{pv.task.text}{/if}
    </div>
  {/if}

  {#if item.prompt.hint}<div class="hint">{item.prompt.hint}</div>{/if}

  <div class="choice-grid">
    {#each choices as opt, i (opt + i)}
      <button type="button" class={choiceClass(opt)} {disabled} onclick={() => onChoose?.(opt)}>
        <kbd>{i + 1}</kbd>
        <span>{opt}</span>
      </button>
    {/each}
  </div>
</div>

{#snippet inlineLine(text: string)}
  {@const s = splitBlank(text)}<span>{s.before}</span><span
    class="blank-slot"
    class:filled={disabled && !!selected}>{disabled && selected ? selected : ' '}</span
  ><span>{s.after}</span>
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
  .choice-button span {
    font-size: 1.3rem;
    font-weight: 800;
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

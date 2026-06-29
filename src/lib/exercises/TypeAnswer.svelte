<script lang="ts">
  import type { Item, ValidationResult } from '../../types'
  import { promptView, splitBlank, badgeTitle } from '../promptView'

  let {
    item,
    value = $bindable(''),
    result = null,
    disabled = false,
    showGloss = true,
    stageClass = '',
    showTimer = false,
    timerScale = 1,
    onsubmit,
  }: {
    item: Item
    value?: string
    result?: ValidationResult | null
    disabled?: boolean
    showGloss?: boolean
    stageClass?: string
    showTimer?: boolean
    timerScale?: number
    onsubmit?: () => void
  } = $props()

  const pv = $derived(promptView(item))

  let inputRef = $state<HTMLInputElement | null>(null)

  const inputState = $derived(
    !result ? '' : result.status === 'correct' ? 'is-correct' : result.status === 'near' ? 'is-near' : 'is-wrong',
  )

  // Autofocus the input whenever the item changes (and not in feedback).
  $effect(() => {
    void item.id
    if (!disabled && inputRef) inputRef.focus()
  })

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onsubmit?.()
    } else if ((e.key === ' ' || e.code === 'Space') && disabled) {
      // In feedback the input is read-only, so Space advances too (it isn't typed).
      e.preventDefault()
      onsubmit?.()
    }
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

  <!-- MEANING (Spanish; stage 1) -->
  {#if showGloss && pv.meaning}
    <div class="prompt-meaning">{pv.meaning}</div>
  {/if}

  <!-- TASK (verb conjugation frame) -->
  {#if pv.task}
    <div class="prompt-task">
      {#if pv.task.hasBlank}{@render inlineLine(pv.task.text)}{:else}{pv.task.text}{/if}
    </div>
  {/if}

  <!-- ANSWER below (numbers / vocab) -->
  {#if pv.answerSlot === 'below'}
    <div class="type-answer">{@render answerInput(false)}</div>
  {/if}

  {#if item.prompt.hint}<div class="hint">{item.prompt.hint}</div>{/if}

  {#if !disabled}
    <div><button class="ghost-button primary" onclick={() => onsubmit?.()}>Comprobar</button></div>
  {/if}
</div>

{#snippet answerInput(inline: boolean)}
  <input
    bind:this={inputRef}
    bind:value
    class={`answer-input ${inline ? 'inline' : ''} ${inputState}`}
    type="text"
    aria-label="Respuesta"
    placeholder={item.prompt.placeholder ?? 'Escribe…'}
    autocapitalize="off"
    autocorrect="off"
    spellcheck={false}
    readonly={disabled}
    onkeydown={handleKeydown}
  />
{/snippet}

{#snippet inlineLine(text: string)}
  {@const s = splitBlank(text)}<span>{s.before}</span>{@render answerInput(true)}<span>{s.after}</span>
{/snippet}

<script lang="ts">
  import type { Item, ValidationResult } from '../../types'
  import { promptView, lineSegments, badgeTitle } from '../promptView'

  let {
    item,
    value = $bindable(''),
    result = null,
    disabled = false,
    showGloss = true,
    showTonic = true,
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
    showTonic?: boolean
    stageClass?: string
    showTimer?: boolean
    timerScale?: number
    onsubmit?: () => void
  } = $props()

  const pv = $derived(promptView(item))

  /** CSS class to tint a badge by grammar category. */
  function badgeClass(badge: string): string {
    if (badge === 'Singular') return 'badge grammar-singular'
    if (badge === 'Plural') return 'badge grammar-plural'
    if (badge === 'Excepción') return 'badge warn'
    return 'badge'
  }

  let inputRef = $state<HTMLInputElement | null>(null)

  const inputState = $derived(
    !result ? '' : result.status === 'correct' ? 'is-correct' : result.status === 'near' ? 'is-near' : 'is-wrong',
  )

  const placeholder = $derived(item.prompt.placeholder ?? 'Escribe…')

  // Autofocus the input whenever the item changes (and not in feedback).
  $effect(() => {
    void item.id
    if (!disabled && inputRef) inputRef.focus()
  })

  // Auto-width for the inline blank, measured in JS instead of CSS. Two earlier
  // CSS-only attempts both had real problems: `field-sizing:content` sizes to
  // the CURRENT value alone, so the box shrinks below the placeholder width as
  // soon as you type something shorter than it; a shared inline-grid "ghost"
  // cell (measuring via an auto-sized grid track) kept the placeholder as a
  // floor, but a grid box with several overlapping items doesn't reliably
  // synthesize a text baseline — it hung below the surrounding line's baseline
  // instead of sitting on it. These mirrors are `position:absolute` (entirely
  // out of flow, so they cannot affect the line's layout or baseline) and
  // mirror the input's exact border+padding box metrics, so the wider of the
  // two `offsetWidth`s IS the width the (plain, still-inline-block) input
  // should be — giving the placeholder-floor sizing without touching alignment.
  let placeholderMirrorRef = $state<HTMLSpanElement | null>(null)
  let valueMirrorRef = $state<HTMLSpanElement | null>(null)
  let inlineWidth = $state<number | null>(null)

  function measureInlineWidth() {
    if (placeholderMirrorRef && valueMirrorRef) {
      inlineWidth = Math.max(placeholderMirrorRef.offsetWidth, valueMirrorRef.offsetWidth)
    }
  }

  $effect(() => {
    void value
    void placeholder
    measureInlineWidth()
  })

  // The hero/task font-size uses clamp(), so it scales with viewport width —
  // re-measure on resize too, not just on text changes.
  $effect(() => {
    window.addEventListener('resize', measureInlineWidth)
    return () => window.removeEventListener('resize', measureInlineWidth)
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
      {#each pv.badges as b}<span class={badgeClass(b)} title={badgeTitle(b)}>{b}</span>{/each}
    </div>
  {/if}

  <!-- HERO -->
  {#if pv.hero.isFigure}
    <div class="prompt-hero figure">{pv.hero.text}</div>
  {:else}
    <div class="prompt-hero">{@render line(pv.hero.text, pv.hero.tonic && showTonic)}</div>
  {/if}

  <!-- MEANING (Spanish; stage 1) -->
  {#if showGloss && pv.meaning}
    <div class="prompt-meaning">{pv.meaning}</div>
  {/if}
  {#if showGloss && pv.translation}
    <div class="prompt-translation">{pv.translation}</div>
  {/if}

  <!-- TASK (verb conjugation frame) -->
  {#if pv.task}
    <div class="prompt-task">{@render line(pv.task.text, pv.task.tonic && showTonic)}</div>
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
    placeholder={placeholder}
    autocapitalize="off"
    autocorrect="off"
    spellcheck={false}
    readonly={disabled}
    onkeydown={handleKeydown}
    size={inline ? 1 : undefined}
    style={inline && inlineWidth != null ? `width:${inlineWidth}px` : undefined}
  />
  {#if inline}
    <span class="answer-measure-mirror" bind:this={placeholderMirrorRef} aria-hidden="true">{placeholder}</span>
    <span class="answer-measure-mirror" bind:this={valueMirrorRef} aria-hidden="true">{value}</span>
  {/if}
{/snippet}

{#snippet line(text: string, tonic: boolean)}
  {#each lineSegments(text, tonic) as seg}{#if seg.t === 'blank'}{@render answerInput(true)}{:else if seg.t === 'tonic'}<span
        class="tonic">{seg.v}</span>{:else}<span>{seg.v}</span>{/if}{/each}
{/snippet}

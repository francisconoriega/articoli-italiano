<script lang="ts">
  /**
   * AgreementAnswer — the L2 (typing) renderer for multi-blank agreement items (Ex2).
   *
   * It renders the phrase hero with one small inline input PER blank, interleaving
   * `item.prompt.parts` with the inputs. Focus auto-advances to the next blank as the
   * learner types; Enter submits. The joined endings ("a|a") are written into the bound
   * `value` so App.onSubmit → session.submit grades them per-blank (accent-tolerant).
   *
   * Mirrors TypeAnswer's contract (bind:value + onsubmit) so Practice.svelte can swap
   * it in for kind:'agreement' in type mode without touching the global keyboard flow.
   */
  import type { Item, ValidationResult } from '../../types'
  import { promptView, badgeTitle } from '../promptView'

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
    showTonic?: boolean
    stageClass?: string
    showTimer?: boolean
    timerScale?: number
    onsubmit?: () => void
  } = $props()

  const pv = $derived(promptView(item))
  const parts = $derived(item.prompt.parts ?? [item.prompt.text])
  const blankCount = $derived(item.prompt.blanks?.length ?? 0)

  /** CSS class to tint a badge by grammar category. */
  function badgeClass(badge: string): string {
    if (badge === 'Singular') return 'badge grammar-singular'
    if (badge === 'Plural') return 'badge grammar-plural'
    if (badge === 'Femenino' || badge === 'Masculino') return 'badge'
    return 'badge'
  }

  // One draft per blank; reset whenever the item changes.
  let drafts = $state<string[]>([])
  let inputs = $state<Array<HTMLInputElement | null>>([])

  $effect(() => {
    void item.id
    drafts = Array.from({ length: blankCount }, () => '')
    inputs = Array.from({ length: blankCount }, () => null)
    // Focus the first blank when a fresh item arrives (and not in feedback).
    if (!disabled) {
      requestAnimationFrame(() => inputs[0]?.focus())
    }
  })

  // Keep the bound value in sync so the parent submit reads the joined endings.
  $effect(() => {
    value = drafts.join('|')
  })

  const inputState = $derived(
    !result ? '' : result.status === 'correct' ? 'is-correct' : result.status === 'near' ? 'is-near' : 'is-wrong',
  )

  function onInput(index: number, e: Event) {
    const el = e.currentTarget as HTMLInputElement
    drafts[index] = el.value
    // Auto-advance once this blank has content (endings are 1–2 letters).
    if (el.value.trim() && index < blankCount - 1) {
      inputs[index + 1]?.focus()
    }
  }

  function handleKeydown(e: KeyboardEvent, index: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onsubmit?.()
      return
    }
    if (e.key === 'Backspace' && drafts[index] === '' && index > 0) {
      // Step back to the previous blank when erasing an empty one.
      e.preventDefault()
      inputs[index - 1]?.focus()
      return
    }
    if ((e.key === ' ' || e.code === 'Space') && disabled) {
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

  <!-- HERO: the phrase with one inline input per blank. -->
  <div class="prompt-hero agreement-hero">
    {#each parts as part, i}<span>{part}</span>{#if i < blankCount}<input
          bind:this={inputs[i]}
          bind:value={drafts[i]}
          class={`ending-input ${inputState}`}
          type="text"
          aria-label={`Terminación ${i + 1}`}
          maxlength="4"
          autocapitalize="off"
          autocorrect="off"
          spellcheck={false}
          readonly={disabled}
          oninput={(e) => onInput(i, e)}
          onkeydown={(e) => handleKeydown(e, i)}
        />{/if}{/each}
  </div>

  {#if showGloss && pv.meaning}
    <div class="prompt-meaning">{pv.meaning}</div>
  {/if}

  {#if item.prompt.hint}<div class="hint">{item.prompt.hint}</div>{/if}

  {#if !disabled}
    <div><button class="ghost-button primary" onclick={() => onsubmit?.()}>Comprobar</button></div>
  {/if}
</div>

<style>
  .agreement-hero {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 0;
    line-height: 1.5;
  }
  .ending-input {
    display: inline-block;
    width: 2.6ch;
    min-width: 2.6ch;
    text-align: center;
    font: inherit;
    font-weight: 900;
    color: var(--accent-strong);
    border: none;
    border-bottom: 3px solid var(--accent);
    background: var(--green-soft);
    border-radius: 4px 4px 0 0;
    padding: 0 2px;
    margin: 0 1px;
  }
  .ending-input:focus {
    outline: none;
    background: var(--panel);
    border-bottom-color: var(--accent-strong);
  }
  .ending-input.is-correct {
    color: var(--accent-strong);
    border-bottom-color: var(--accent);
  }
  .ending-input.is-near {
    color: var(--amber-strong);
    border-bottom-color: var(--amber);
  }
  .ending-input.is-wrong {
    color: var(--red);
    border-bottom-color: var(--red);
    background: var(--red-soft);
  }
</style>

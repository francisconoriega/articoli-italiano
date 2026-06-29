<script lang="ts">
  import type { Item, ValidationResult } from '../types'
  import { BLANK } from '../types'

  let {
    result = null,
    item,
    explanation = '',
  }: {
    result?: ValidationResult | null
    item: Item
    explanation?: string
  } = $props()

  const stateClass = $derived(() => {
    if (!result) return 'feedback neutral'
    if (result.status === 'correct') return 'feedback correct'
    if (result.status === 'near') return 'feedback near'
    return 'feedback wrong'
  })

  // The prompt sentence split around the blank, so we can show it filled-in.
  const filled = $derived(() => {
    const text = item.prompt.text
    const idx = text.indexOf(BLANK)
    if (idx === -1) return null
    return { before: text.slice(0, idx), after: text.slice(idx + BLANK.length) }
  })

  function parseBold(text: string): Array<{ text: string; bold: boolean }> {
    const segments: Array<{ text: string; bold: boolean }> = []
    const re = /\*\*(.+?)\*\*/g
    let last = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) segments.push({ text: text.slice(last, m.index), bold: false })
      segments.push({ text: m[1], bold: true })
      last = m.index + m[0].length
    }
    if (last < text.length) segments.push({ text: text.slice(last), bold: false })
    return segments
  }
  const explanationSegments = $derived(() => (explanation ? parseBold(explanation) : []))
</script>

<div class={stateClass()}>
  {#if !result}
    <span>Elige o escribe tu respuesta para continuar.</span>
  {:else if result.status === 'correct'}
    <span>¡Correcto!</span>
    <div class="feedback-answer">{item.answer}</div>
  {:else if result.status === 'near'}
    <span>Casi correcto · falta el acento</span>
    <div class="answer-xl">{result.expected}</div>
    {#if filled()}
      <div class="filled"><span>{filled()?.before}</span><strong>{result.expected}</strong><span>{filled()?.after}</span></div>
    {/if}
  {:else}
    <span class="lead">La respuesta correcta es:</span>
    <div class="answer-xl">{item.answer}</div>
    {#if filled()}
      <div class="filled"><span>{filled()?.before}</span><strong>{item.answer}</strong><span>{filled()?.after}</span></div>
    {/if}
    {#if result.message}
      <div class="hint">{result.message}</div>
    {/if}
  {/if}

  {#if result && item.gloss}
    <!-- When a full-sentence translation accompanies it, the gloss is an idiom/
         expression cue ("avere fame = tener hambre") → label it "expresión:".
         On its own, the gloss IS the full meaning → "significado:". -->
    <div class="meaning-line">{item.translation ? 'expresión' : 'significado'}: <strong>{item.gloss}</strong></div>
  {/if}

  {#if result && item.translation}
    <div class="meaning-line">traducción: <strong>{item.translation}</strong></div>
  {/if}

  {#if explanation}
    <div class="feedback-rule">
      {#each explanationSegments() as seg}
        {#if seg.bold}<strong>{seg.text}</strong>{:else}{seg.text}{/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .lead {
    font-size: 0.95rem;
    color: var(--muted);
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .answer-xl {
    font-size: clamp(2rem, 6vw, 3.2rem);
    font-weight: 900;
    line-height: 1;
    color: var(--red);
  }
  :global(.feedback.near) .answer-xl {
    color: var(--amber-strong);
  }
  .filled {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--ink);
    opacity: 0.85;
  }
  .filled strong {
    color: var(--red);
    font-weight: 900;
  }
  :global(.feedback.near) .filled strong {
    color: var(--amber-strong);
  }
  .meaning-line {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--muted);
  }
  .meaning-line strong {
    color: var(--ink);
    font-style: italic;
  }
</style>

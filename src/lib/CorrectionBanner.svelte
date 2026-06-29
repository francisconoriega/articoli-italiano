<script lang="ts">
  // Anchored correction banner — shown at the top of the practice canvas when the
  // learner misses or says "No sé". Big, persistent (~3s, auto-dismissed by the parent),
  // with the answer in context and (for verbs) its meaning.
  let {
    answer,
    before = '',
    after = '',
    meaning = null,
    status = 'wrong',
  }: {
    answer: string
    before?: string
    after?: string
    meaning?: string | null
    status?: 'wrong' | 'near'
  } = $props()
</script>

<div class="correction-banner {status}" role="status" aria-live="polite">
  <div class="cb-label">{status === 'near' ? 'Casi — la forma con acento es' : 'La respuesta correcta es'}</div>
  <div class="cb-answer">{answer}</div>
  {#if before || after}
    <div class="cb-context"><span>{before}</span><strong>{answer}</strong><span>{after}</span></div>
  {/if}
  {#if meaning}<div class="cb-meaning">{meaning}</div>{/if}
</div>

<style>
  .correction-banner {
    position: sticky;
    top: 8px;
    z-index: 40;
    border-radius: var(--radius);
    padding: 12px 18px;
    border: 2px solid var(--red);
    background: var(--red-soft);
    box-shadow: 0 14px 30px rgba(44, 39, 31, 0.16);
    animation: bannerIn 220ms ease;
  }
  .correction-banner.near {
    border-color: var(--amber);
    background: var(--amber-soft);
  }
  .cb-label {
    font-size: 0.78rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--muted);
  }
  .cb-answer {
    font-size: clamp(1.8rem, 5vw, 2.8rem);
    font-weight: 900;
    line-height: 1.05;
    color: var(--red);
  }
  .near .cb-answer {
    color: var(--amber-strong);
  }
  .cb-context {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--ink);
    opacity: 0.9;
  }
  .cb-context strong {
    color: var(--red);
    font-weight: 900;
  }
  .near .cb-context strong {
    color: var(--amber-strong);
  }
  .cb-meaning {
    margin-top: 2px;
    font-size: 1rem;
    font-style: italic;
    font-weight: 700;
    color: var(--muted);
  }
  @keyframes bannerIn {
    from {
      transform: translateY(-8px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>

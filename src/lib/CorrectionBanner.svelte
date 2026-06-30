<script lang="ts">
  // Floating correction banner — shown sticky at the top of the practice canvas on
  // NARROW screens when the learner misses or says "No sé" (on wide screens the inline
  // Feedback box is used instead). Compact; stays until the learner advances or dismisses.
  let {
    answer,
    before = '',
    after = '',
    meaning = null,
    status = 'wrong',
    onDismiss,
  }: {
    answer: string
    before?: string
    after?: string
    meaning?: string | null
    status?: 'wrong' | 'near'
    onDismiss?: () => void
  } = $props()
</script>

<div class="correction-banner {status}" role="status" aria-live="polite">
  {#if onDismiss}
    <button type="button" class="cb-dismiss" onclick={onDismiss} aria-label="Cerrar">×</button>
  {/if}
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
    padding: 10px 40px 10px 16px;
    border: 2px solid var(--red);
    background: var(--red-soft);
    box-shadow: 0 14px 30px rgba(44, 39, 31, 0.16);
    animation: bannerIn 220ms ease;
  }
  /* The floating banner is for NARROW screens only; wide screens use the inline
     Feedback box (which carries the same answer plus the rule). */
  @media (min-width: 681px) {
    .correction-banner {
      display: none;
    }
  }
  .cb-dismiss {
    position: absolute;
    top: 6px;
    right: 8px;
    width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    border: none;
    background: transparent;
    color: var(--muted);
    font-size: 1.4rem;
    line-height: 1;
    cursor: pointer;
    border-radius: 6px;
  }
  .cb-dismiss:hover {
    background: rgba(44, 39, 31, 0.08);
    color: var(--ink);
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
    font-size: clamp(1.2rem, 4.5vw, 1.6rem);
    font-weight: 900;
    line-height: 1.1;
    color: var(--red);
  }
  .near .cb-answer {
    color: var(--amber-strong);
  }
  .cb-context {
    font-size: 0.95rem;
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

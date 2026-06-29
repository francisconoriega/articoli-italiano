<script lang="ts">
  import type { SessionRecord } from '../types'
  import { skillLabel } from './labels'

  let {
    record,
    onNewRound,
  }: {
    record: SessionRecord
    onNewRound: () => void
  } = $props()

  const accuracy = $derived(record.answered === 0 ? 0 : Math.round((record.correct / record.answered) * 100))
  const mistakes = $derived(
    Object.entries(record.mistakesBySkill)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6),
  )
</script>

<div class="summary-overlay is-visible" role="dialog" aria-modal="true" aria-label="Resumen de la ronda">
  <div class="summary-dialog">
    <div style="display:flex; align-items:center; gap:16px;">
      <div class="session-score" aria-hidden="true">
        <span>{accuracy}%</span>
      </div>
      <div>
        <p class="eyebrow">Ronda terminada</p>
        <h2>{record.correct}/{record.answered} correctas</h2>
        {#if record.near > 0}
          <p class="muted">{record.near} «casi» (acento)</p>
        {/if}
      </div>
    </div>

    <div class="summary-grid">
      <div><strong>{record.answered}</strong><small>respondidas</small></div>
      <div><strong>{record.correct}</strong><small>correctas</small></div>
      <div><strong>{record.answered - record.correct}</strong><small>errores</small></div>
    </div>

    <div>
      <h3 style="margin:0 0 8px; font-size:0.95rem;">A reforzar</h3>
      {#if mistakes.length === 0}
        <p class="muted">Sin errores en esta ronda. ¡Bien hecho!</p>
      {:else}
        <ul class="weak-list">
          {#each mistakes as [skill, count]}
            <li>
              <strong>{skillLabel(skill)}</strong>
              <small>{count} error{count === 1 ? '' : 'es'}</small>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <div class="summary-actions" style="display:flex; gap:12px; align-items:center; justify-content:flex-end;">
      <span class="hint">Enter o Espacio para seguir</span>
      <button class="ghost-button primary" onclick={onNewRound}>Otra ronda →</button>
    </div>
  </div>
</div>

<style>
  .session-score {
    width: 84px;
    aspect-ratio: 1;
    border-radius: 50%;
    border: 8px solid var(--green-soft);
    display: grid;
    place-items: center;
    flex: 0 0 auto;
  }
  .session-score span {
    font-size: 1.2rem;
    font-weight: 800;
  }
  .summary-grid div {
    text-align: center;
  }
  .summary-grid strong {
    display: block;
    font-size: 1.5rem;
  }
  .summary-grid small {
    color: var(--muted);
  }
</style>

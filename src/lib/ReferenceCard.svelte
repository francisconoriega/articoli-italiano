<script lang="ts">
  // A cheat-sheet card styled like ConjugationTable, but for non-verb topics:
  // a list of cue → answer rows (e.g. "11 → undici", "12:00 → è mezzogiorno", "3° → terzo").
  let {
    title,
    eyebrow = 'Referencia',
    rows,
  }: {
    title: string
    eyebrow?: string
    rows: Array<{ cue: string; answer: string }>
  } = $props()
</script>

<div class="reference-card">
  <p class="eyebrow card-eyebrow">{eyebrow}</p>

  <div class="card-heading">
    <span class="ref-title">{title}</span>
  </div>

  <ul class="ref-rows" role="list">
    {#each rows as r}
      <li class="ref-row">
        <span class="ref-cue">{r.cue}</span>
        <span class="ref-answer">{r.answer}</span>
      </li>
    {/each}
  </ul>
</div>

<style>
  .reference-card {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--panel);
    padding: 14px 16px 16px;
  }

  .card-eyebrow {
    margin: 0 0 6px;
    color: var(--accent);
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .card-heading {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 12px;
  }

  .ref-title {
    font-size: 1.05rem;
    font-weight: 900;
    color: var(--ink);
    letter-spacing: 0.01em;
  }

  .ref-rows {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .ref-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 8px;
    border-radius: calc(var(--radius) - 2px);
  }

  .ref-row:nth-child(even) {
    background: rgba(44, 39, 31, 0.03);
  }

  .ref-cue {
    flex: 1;
    min-width: 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--muted);
    overflow-wrap: anywhere;
  }

  .ref-answer {
    flex: 0 0 auto;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--ink);
    text-align: right;
    overflow-wrap: anywhere;
  }
</style>

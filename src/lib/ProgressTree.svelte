<script lang="ts">
  import type { Item, Person, VerbEntry } from '../types'
  import { BLANK } from '../types'
  import type { TopicState, TopicInfo, CategoryInfo } from '../engine/scheduler'
  import { topicLabel, subtopicLabel, categoryLabel } from './labels'
  import ConjugationTable from './ConjugationTable.svelte'
  import ReferenceCard from './ReferenceCard.svelte'

  let {
    categoryRows,
    nowReinforcing,
    reinforceReason,
    verbByInf,
    itemsByTopic,
    activeTopic,
    activeAskedPerson,
    activeRevealed,
  }: {
    categoryRows: CategoryInfo[]
    nowReinforcing: string[]
    reinforceReason: string
    verbByInf: Map<string, VerbEntry>
    itemsByTopic: Map<string, Item[]>
    // Identifies the verb currently being drilled in the exercise above, so its
    // reference card here stays masked in sync rather than leaking the answer.
    activeTopic: string | null
    activeAskedPerson: Person | null
    activeRevealed: boolean
  } = $props()

  const STATE_LABEL: Record<TopicState, string> = {
    learning: 'aprendiendo',
    reviewing: 'repasando',
    mastered: 'dominado',
    new: 'nuevo',
    locked: 'bloqueado',
  }

  // Category tree expand/collapse. The first active category is open by default until
  // the learner explicitly toggles something (then openCats wins).
  const defaultOpenKey = $derived(
    categoryRows.find((c) => c.state === 'active')?.key ?? categoryRows[0]?.key ?? null,
  )
  let openCats = $state<Record<string, boolean>>({})
  function isOpen(key: string): boolean {
    return openCats[key] ?? key === defaultOpenKey
  }
  function toggleCat(key: string): void {
    openCats = { ...openCats, [key]: !isOpen(key) }
  }

  // Click-to-open reference (cheat-sheet) for a subtopic: a verb's conjugation table,
  // or a cue→answer list (numbers, ordinales, la hora, vocab…). One open at a time.
  let openReference = $state<string | null>(null)
  function toggleReference(topic: string): void {
    openReference = openReference === topic ? null : topic
  }
  // Per-category "Dominados (N)" expand toggle (reveals the mastered subtopics).
  let openDominados = $state<Record<string, boolean>>({})
  function toggleDominados(key: string): void {
    openDominados = { ...openDominados, [key]: !openDominados[key] }
  }
  /** Catalog verb entry for a verb:* topic (null for non-verb topics). */
  function verbFor(topic: string) {
    return topic.startsWith('verb:') ? (verbByInf.get(topic.slice(5)) ?? null) : null
  }
  /** Reference rows (cue → answer) for a non-verb topic, derived from its items. */
  function referenceRows(topic: string): Array<{ cue: string; answer: string }> {
    const list = itemsByTopic.get(topic) ?? []
    const isOrdinal = topic.startsWith('num:ordinal')
    const hasFigures = list.length > 0 && list.every((it) => typeof it.prompt.figure === 'number')
    const sorted = hasFigures ? [...list].sort((a, b) => (a.prompt.figure ?? 0) - (b.prompt.figure ?? 0)) : list
    return sorted.map((it) => {
      let cue: string
      if (typeof it.prompt.figure === 'number') cue = isOrdinal ? `${it.prompt.figure}°` : String(it.prompt.figure)
      else if (it.kind === 'tell-time') cue = it.prompt.text
      else cue = it.gloss ?? it.prompt.text.replace(BLANK, '___').trim()
      return { cue, answer: it.answer }
    })
  }
</script>

<section class="insight-section">
  <div class="section-head avance-head">
    <h2>Tu avance</h2>
    <span class="legend">
      <span class="legend-item"><i class="dot cov" aria-hidden="true"></i>cobertura</span>
      <span class="legend-item"><i class="dot dom" aria-hidden="true"></i>dominio</span>
    </span>
  </div>

  {#if nowReinforcing.length}
    <div class="now-reinforcing">
      <p class="reinforce-title">Ahora reforzando</p>
      <div class="reinforce-chips">
        {#each nowReinforcing as label}
          <span class="reinforce-chip">{label}</span>
        {/each}
      </div>
      <p class="reinforce-reason">{reinforceReason}</p>
    </div>
  {/if}

  {#snippet subtopicRow(t: TopicInfo)}
    {@const refOpen = openReference === t.topic}
    <button
      type="button"
      class="subtopic"
      class:selected={refOpen}
      aria-expanded={refOpen}
      onclick={() => toggleReference(t.topic)}
    >
      <span class="subref-chev" class:open={refOpen} aria-hidden="true">▶</span>
      <span class="subtopic-name">{subtopicLabel(t.topic)}</span>
      <span class="topic-chip state-{t.state}">{STATE_LABEL[t.state]}</span>
      <span class="subtopic-dom">{Math.round(t.seenMastery * 100)}%</span>
    </button>
    {#if refOpen}
      {@const verb = verbFor(t.topic)}
      {@const isActive = t.topic === activeTopic}
      <div class="subtopic-ref">
        {#if verb && verb.tenses.presente}
          <ConjugationTable
            infinitive={verb.infinitive}
            gloss={verb.gloss}
            table={verb.tenses.presente}
            askedPerson={isActive ? activeAskedPerson : null}
            highlight={!isActive || activeRevealed}
          />
        {:else}
          {@const rows = referenceRows(t.topic)}
          {#if rows.length}
            <ReferenceCard title={topicLabel(t.topic)} rows={rows} />
          {:else}
            <p class="muted small-copy">Sin referencia para este tema.</p>
          {/if}
        {/if}
      </div>
    {/if}
  {/snippet}

  {#if categoryRows.length}
    <ul class="cat-list">
      {#each categoryRows as cat (cat.key)}
        {@const open = isOpen(cat.key)}
        <li class="cat" class:mastered={cat.state === 'mastered'}>
          <button class="cat-head" aria-expanded={open} onclick={() => toggleCat(cat.key)}>
            <span class="chev" class:open aria-hidden="true">▶</span>
            <span class="cat-name">{categoryLabel(cat.key)}</span>
            {#if cat.weakTopics > 0}
              <span class="cat-flag weak">{cat.weakTopics} flojo{cat.weakTopics === 1 ? '' : 's'}</span>
            {:else if cat.seen > 0}
              <span class="cat-flag ok" aria-label="al día">✓</span>
            {/if}
            <span class="cat-nums">
              <b>{Math.round(cat.mastery * 100)}%</b>
              <i>{Math.round(cat.coverage * 100)}%</i>
            </span>
          </button>
          <div class="bars" aria-hidden="true">
            <div class="bar-track"><div class="bar-fill cov" style="width: {Math.round(cat.coverage * 100)}%"></div></div>
            <div class="bar-track"><div class="bar-fill dom" style="width: {Math.round(cat.mastery * 100)}%"></div></div>
          </div>
          {#if open}
            {@const weakSubs = cat.topics.filter((t) => t.seen > 0 && t.state !== 'mastered')}
            {@const masteredSubs = cat.topics.filter((t) => t.state === 'mastered')}
            {@const domOpen = openDominados[cat.key] ?? false}
            <div class="cat-detail">
              {#each weakSubs as t (t.topic)}
                {@render subtopicRow(t)}
              {/each}
              {#if masteredSubs.length > 0}
                <button
                  type="button"
                  class="dominados"
                  aria-expanded={domOpen}
                  onclick={() => toggleDominados(cat.key)}
                >
                  <span class="subref-chev" class:open={domOpen} aria-hidden="true">▶</span>
                  <span class="dominados-check" aria-hidden="true">✓</span>
                  Dominados ({masteredSubs.length})
                </button>
                {#if domOpen}
                  <div class="dominados-children">
                    {#each masteredSubs as t (t.topic)}
                      {@render subtopicRow(t)}
                    {/each}
                  </div>
                {/if}
              {/if}
              {#if weakSubs.length === 0 && masteredSubs.length === 0}
                <p class="muted small-copy">Aún sin empezar.</p>
              {/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="muted">Responde algunas preguntas y aquí verás tu avance por categoría.</p>
  {/if}
</section>

<div class="bank-note">
  <p class="muted small-copy">
    Lección enfocada + repaso intercalado. Lo que dominas (escribiéndolo) reaparece
    más espaciado; lo que fallas vuelve pronto. Tu progreso se guarda en este navegador.
  </p>
</div>

<style>
  /* A section = a heading-group that HUGS its content (tight internal gaps),
     while the panel's own 24px gap separates whole sections. Kills the
     orphaned-heading / "looks empty" effect. */
  .insight-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .section-head {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .avance-head {
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }
  .legend {
    display: inline-flex;
    gap: 10px;
    font-size: 0.78rem;
    color: var(--muted);
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .dot {
    width: 14px;
    height: 4px;
    border-radius: 999px;
    display: inline-block;
  }
  .dot.cov {
    background: var(--amber-strong);
  }
  .dot.dom {
    background: var(--accent);
  }

  /* "Ahora reforzando" — exactly what the scheduler is drilling this round. */
  .now-reinforcing {
    background: var(--green-soft);
    border: 1px solid #bfe0cd;
    border-radius: 10px;
    padding: 11px 12px;
  }
  .reinforce-title {
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent-strong);
    font-weight: 700;
    margin: 0 0 8px;
  }
  .reinforce-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }
  .reinforce-chip {
    background: var(--panel);
    border: 1px solid #bfe0cd;
    border-radius: 999px;
    padding: 3px 9px;
    font-size: 0.82rem;
    color: var(--accent-strong);
  }
  .reinforce-reason {
    font-size: 0.8rem;
    color: #355d4c;
    margin: 0;
  }

  /* Category tree */
  .cat-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .cat {
    border-top: 1px solid var(--line);
    padding: 11px 2px;
  }
  .cat.mastered {
    opacity: 0.62;
  }
  .cat-head {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
  }
  .cat-head:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
    border-radius: 4px;
  }
  .chev {
    font-size: 0.7rem;
    color: #9a948a;
    transition: transform 0.15s ease;
    display: inline-block;
  }
  .chev.open {
    transform: rotate(90deg);
  }
  .cat-name {
    flex: 1;
    font-size: 0.95rem;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .cat-flag {
    flex: 0 0 auto;
    border-radius: 999px;
    padding: 2px 7px;
    font-size: 0.74rem;
    font-weight: 700;
  }
  .cat-flag.weak {
    background: var(--red-soft);
    color: #9c372b;
  }
  .cat-flag.ok {
    color: var(--accent);
    background: none;
    padding: 0;
  }
  .cat-nums {
    flex: 0 0 auto;
    font-size: 0.82rem;
    min-width: 76px;
    text-align: right;
  }
  .cat-nums b {
    color: var(--accent-strong);
    font-weight: 700;
  }
  .cat-nums i {
    color: var(--amber-strong);
    font-style: normal;
  }
  .bars {
    margin-top: 9px;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .bar-track {
    height: 4px;
    border-radius: 999px;
    background: #ece5d7;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 999px;
  }
  .bar-fill.cov {
    background: var(--amber-strong);
  }
  .bar-fill.dom {
    background: var(--accent);
  }
  .cat-detail {
    padding-left: 20px;
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .subtopic {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 2px;
    width: 100%;
    border-radius: 4px;
  }
  .subtopic:hover {
    background: rgba(37, 111, 91, 0.06);
  }
  .subtopic:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .subtopic.selected {
    background: var(--green-soft);
  }
  .subref-chev {
    flex: 0 0 auto;
    font-size: 0.6rem;
    color: #9a948a;
    transition: transform 0.15s ease;
  }
  .subref-chev.open {
    transform: rotate(90deg);
  }
  .subtopic-ref {
    margin: 4px 0 10px;
  }
  .subtopic-name {
    flex: 1;
    font-size: 0.85rem;
    color: #34322d;
    overflow-wrap: anywhere;
  }
  .subtopic-dom {
    flex: 0 0 auto;
    font-size: 0.8rem;
    color: var(--accent-strong);
    min-width: 34px;
    text-align: right;
  }
  .dominados {
    all: unset;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 2px 4px;
    font-size: 0.8rem;
    color: var(--muted);
    width: 100%;
    border-radius: 4px;
  }
  .dominados:hover {
    background: rgba(37, 111, 91, 0.06);
  }
  .dominados:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .dominados-check {
    color: var(--accent);
  }
  /* Mastered subtopics sit visually inside the "Dominados" group. */
  .dominados-children {
    padding-left: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .topic-chip {
    flex: 0 0 auto;
    border-radius: 999px;
    padding: 2px 9px;
    font-size: 0.74rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    border: 1px solid var(--line);
    color: var(--muted);
    background: var(--panel);
  }
  .topic-chip.state-learning {
    border-color: var(--amber);
    color: var(--amber-strong);
    background: var(--amber-soft);
  }
  .topic-chip.state-reviewing {
    border-color: var(--blue);
    color: var(--blue);
    background: rgba(2, 132, 199, 0.1);
  }
  .topic-chip.state-mastered {
    border-color: var(--accent);
    color: var(--accent-strong);
    background: var(--green-soft);
  }
</style>

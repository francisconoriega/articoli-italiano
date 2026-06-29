<script lang="ts">
  import type { Person } from '../types'
  import { PERSONS } from '../types'
  import { stressSplit } from '../engine/stress'

  let {
    infinitive,
    gloss = null,
    table,
    askedPerson = null,
    highlight = false,
  }: {
    infinitive: string
    gloss?: string | null
    table: Record<Person, string>
    askedPerson?: Person | null
    highlight?: boolean
  } = $props()

  /** Display label for each person slot */
  const LABELS: Record<Person, string> = {
    io: 'io',
    tu: 'tu',
    lui: 'lui/lei',
    noi: 'noi',
    voi: 'voi',
    loro: 'loro',
  }

  const upperInfinitive = $derived(infinitive.toUpperCase())
</script>

<div class="conjugation-card">
  <p class="eyebrow card-eyebrow">Conjugación · presente</p>

  <div class="card-heading">
    <span class="verb-infinitive">{upperInfinitive}</span>
    {#if gloss}
      <em class="verb-gloss">{gloss}</em>
    {/if}
  </div>

  <ul class="person-list" role="list">
    {#each PERSONS as person}
      {@const isAsked = person === askedPerson}
      {@const stress = stressSplit(infinitive, person, table[person])}
      <li
        class="person-row"
        class:is-asked={isAsked}
        class:is-highlight={isAsked && highlight}
        aria-current={isAsked ? 'true' : undefined}
      >
        <span class="pronoun">{LABELS[person]}</span>
        <span class="form" class:form-highlight={isAsked && highlight}>
          {#if stress}{stress.pre}<span class="stress">{stress.vowel}</span>{stress.post}{:else}{table[
              person
            ]}{/if}
        </span>
      </li>
    {/each}
  </ul>
</div>

<style>
  .conjugation-card {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--panel);
    padding: 14px 16px 16px;
  }

  .card-eyebrow {
    /* inherits global .eyebrow styles; override margin to tighten the card */
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

  .verb-infinitive {
    font-size: 1.15rem;
    font-weight: 900;
    color: var(--ink);
    letter-spacing: 0.02em;
  }

  .verb-gloss {
    font-size: 0.88rem;
    font-weight: 600;
    font-style: italic;
    color: var(--muted);
  }

  .person-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .person-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 8px;
    border-radius: calc(var(--radius) - 2px);
    border-left: 3px solid transparent;
    transition: background 100ms ease, border-color 100ms ease;
  }

  /* Gently mark the asked row without revealing the answer */
  .person-row.is-asked {
    border-left-color: var(--accent);
    background: var(--green-soft);
  }

  /* In feedback/highlight mode, make the answer form stand out */
  .person-row.is-highlight {
    background: var(--green-soft);
    border-left-color: var(--accent-strong);
  }

  .pronoun {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--muted);
    min-width: 52px;
    flex-shrink: 0;
  }

  /* Highlight the pronoun label too when row is asked */
  .person-row.is-asked .pronoun {
    color: var(--accent-strong);
  }

  .form {
    font-size: 0.97rem;
    font-weight: 700;
    color: var(--ink);
    text-align: right;
  }

  /* Emphasize the conjugated form in highlight (answer-in-context) state */
  .form.form-highlight {
    font-weight: 900;
    color: var(--accent-strong);
  }

  /* Sílaba tónica — underline the stressed vowel (pronunciation aid). */
  .stress {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 2px;
    text-decoration-color: var(--accent);
  }
</style>

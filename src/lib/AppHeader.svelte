<script lang="ts">
  /*
   * AppHeader — one component, two layouts (mobile slim bar ⇄ desktop title+metrics),
   * switched purely via @media (max-width: 680px). It surfaces the TRUTHFUL persistent
   * metrics (studyMetrics) instead of the session-scoped 0%-on-load counters: what's due,
   * what's mastered, days to the exam. The in-round "racha" stays alongside as motivation.
   * The mode chip and the gear both open the settings drawer (where the mode picker lives).
   */
  import type { PracticeMode } from '../types'
  import type { StudyMetrics } from '../engine/metrics'
  import { modeLabel } from './labels'

  let {
    mode,
    metrics,
    streak,
    roundAnswered,
    roundSize,
    onOpenSettings,
  }: {
    mode: PracticeMode
    metrics: StudyMetrics
    streak: number
    roundAnswered: number
    roundSize: number
    onOpenSettings: () => void
  } = $props()

  // "al día ✓" once everything due is cleared (but only for a learner who has seen
  // something — a brand-new user legitimately shows 0 due).
  const allCaughtUp = $derived(metrics.dueCount === 0 && metrics.seenItems > 0)
  // Round progress for the hairline under the mobile bar (guard against /0).
  const roundPct = $derived(roundSize > 0 ? Math.min(100, (roundAnswered / roundSize) * 100) : 0)
</script>

<!-- MOBILE: sticky slim bar -->
<header class="slim">
  <button class="modechip" onclick={onOpenSettings} aria-label="Cambiar modo de práctica">
    {modeLabel(mode)} <span class="car" aria-hidden="true">▾</span>
  </button>
  <span class="spacer"></span>
  <span class="pill due" aria-label={allCaughtUp ? 'Al día' : `${metrics.dueCount} por repasar`}>
    {#if allCaughtUp}al día ✓{:else}↻ {metrics.dueCount}{/if}
  </span>
  {#if streak > 0}
    <span class="pill streak" aria-label="{streak} de racha">🔥 {streak}</span>
  {/if}
  <button class="gear" onclick={onOpenSettings} aria-label="Ajustes">⚙︎</button>
  <span class="round-progress" style="width:{roundPct}%" aria-hidden="true"></span>
</header>

<!-- DESKTOP: title + metrics row -->
<header class="full">
  <div class="title-row">
    <div class="titles">
      <p class="eyebrow">Articoli Italiano</p>
      <h1>{modeLabel(mode)}</h1>
    </div>
    <button class="modechip wide" onclick={onOpenSettings}>Cambiar modo <span aria-hidden="true">▾</span></button>
    <button class="gear" onclick={onOpenSettings} aria-label="Ajustes">⚙︎</button>
  </div>
  <div class="metrics-row">
    <div class="metric">
      <b>{#if allCaughtUp}✓{:else}{metrics.dueCount}{/if}</b>
      <small>{allCaughtUp ? 'al día' : 'por repasar'}</small>
    </div>
    <div class="metric">
      <b>{metrics.masteredItems}</b>
      <small>dominados</small>
    </div>
    <div class="metric" class:dim={streak === 0}>
      <b>{#if streak > 0}🔥 {/if}{streak}</b>
      <small>racha</small>
    </div>
    {#if metrics.daysLeft !== null}
      <div class="metric exam">
        <b>{metrics.daysLeft} d</b>
        <small>para el examen</small>
      </div>
    {/if}
  </div>
</header>

<style>
  /* Default (desktop / wide) — the slim bar is hidden until the mobile breakpoint. */
  .slim {
    display: none;
  }

  .full {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .title-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .titles {
    flex: 1;
    min-width: 0;
  }
  .metrics-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .metric {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--panel);
    padding: 10px 14px;
    min-width: 118px;
  }
  .metric b {
    display: block;
    font-size: 1.4rem;
    font-weight: 900;
    line-height: 1.1;
  }
  .metric small {
    color: var(--muted);
    font-size: 0.82rem; /* ≥13px: AA-safe for muted copy */
    font-weight: 700;
  }
  .metric.exam b {
    color: var(--accent-strong);
  }
  /* A 0 streak reads as inactive (muted) rather than a bold, demotivating "0". */
  .metric.dim b {
    color: var(--muted);
  }

  /* Mode chip — pill button reused at both sizes. */
  .modechip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    border: 1px solid var(--line);
    background: var(--panel);
    border-radius: 999px;
    padding: 0 16px;
    font-weight: 800;
    color: var(--ink);
    cursor: pointer;
    white-space: nowrap;
    transition: border-color 120ms ease;
  }
  .modechip:hover {
    border-color: var(--accent);
  }
  .modechip .car {
    color: var(--muted);
    font-size: 0.78rem;
  }

  /* Gear — square icon button (≥44px tap target). */
  .gear {
    flex: 0 0 auto;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: var(--panel);
    color: var(--ink);
    display: grid;
    place-items: center;
    font-size: 1.15rem;
    cursor: pointer;
    transition: border-color 120ms ease;
  }
  .gear:hover {
    border-color: var(--accent);
  }

  @media (max-width: 680px) {
    .full {
      display: none;
    }
    .slim {
      display: flex;
      align-items: center;
      gap: 8px;
      position: sticky;
      top: 0;
      z-index: 5;
      min-height: 54px;
      margin: -16px -16px 0; /* bleed to the panel edges (panel pads 16px on mobile) */
      padding: 8px 12px;
      background: rgba(255, 253, 248, 0.86);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--line);
      border-top-left-radius: var(--radius);
      border-top-right-radius: var(--radius);
    }
    .spacer {
      flex: 1;
    }
    /* The mobile chip is smaller/denser than the 44px desktop pill but still tappable. */
    .slim .modechip {
      min-height: 38px;
      padding: 0 12px;
      font-size: 0.9rem;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 38px;
      border-radius: 999px;
      padding: 0 11px;
      font-weight: 800;
      font-size: 0.85rem;
      border: 1px solid transparent;
      white-space: nowrap;
    }
    .pill.due {
      background: var(--panel);
      border-color: var(--line);
      color: var(--ink);
    }
    .pill.streak {
      background: var(--green-soft);
      color: var(--accent-strong);
    }
    .slim .gear {
      width: 40px;
      height: 40px;
    }
    /* 2px accent round-progress bar pinned to the bar's bottom edge. */
    .round-progress {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 2px;
      background: var(--accent);
      transition: width 200ms ease;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .round-progress {
      transition: none;
    }
  }
</style>

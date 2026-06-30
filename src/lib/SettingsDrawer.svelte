<script lang="ts">
  /*
   * SettingsDrawer — bottom-sheet (mobile) / right-anchored dialog (desktop) housing
   * the relocated, low-frequency controls: Modo (mode picker), Ejercicio (toggles),
   * Examen (date), Datos (export/import/reset).
   *
   * Prop contract (C5) is FROZEN — App.svelte mounts against it. Markup, styles, and
   * the handleImportFile helper are free to change; the $props() signature is not.
   */
  import type { PracticeMode, Settings } from '../types'
  import { modeLabel } from './labels'

  let {
    open,
    mode,
    modes,
    settings,
    showTonic,
    examDate,
    daysLeft,
    onClose,
    onModeChange,
    onToggleAssist,
    onToggleTimer,
    onToggleTonic,
    onSetExamDate,
    onExport,
    onImport,
    onReset,
  }: {
    open: boolean
    mode: PracticeMode
    modes: PracticeMode[]
    settings: Settings
    showTonic: boolean
    examDate: string | null
    daysLeft: number | null
    onClose: () => void
    onModeChange: (mode: PracticeMode) => void
    onToggleAssist: (enabled: boolean) => void
    onToggleTimer: (enabled: boolean) => void
    onToggleTonic: (enabled: boolean) => void
    onSetExamDate: (date: string | null) => void
    onExport: () => void
    onImport: (json: string) => void
    onReset: () => void
  } = $props()

  let sheetEl = $state<HTMLDivElement | null>(null)

  async function handleImportFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const text = await file.text()
    onImport(text)
    input.value = '' // allow re-importing the same file
  }

  function pickMode(m: PracticeMode) {
    onModeChange(m)
    onClose()
  }

  // Focusable elements inside the sheet, for the focus trap.
  function focusables(root: HTMLElement): HTMLElement[] {
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement)
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open) return
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (e.key === 'Tab' && sheetEl) {
      const items = focusables(sheetEl)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && (active === first || !sheetEl.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  // Manage focus + global key listener whenever the sheet opens/closes.
  $effect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    window.addEventListener('keydown', onKeydown, true)
    // Move focus into the sheet after it mounts.
    const id = requestAnimationFrame(() => {
      if (!sheetEl) return
      const items = focusables(sheetEl)
      ;(items[0] ?? sheetEl).focus()
    })
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('keydown', onKeydown, true)
      previouslyFocused?.focus?.()
    }
  })
</script>

{#if open}
  <div class="drawer-scrim" role="presentation" onclick={onClose}></div>
  <div
    class="drawer-sheet"
    role="dialog"
    aria-modal="true"
    aria-label="Ajustes"
    tabindex="-1"
    bind:this={sheetEl}
  >
    <div class="grip" aria-hidden="true"></div>
    <header class="drawer-head">
      <strong>Ajustes</strong>
      <button class="ghost-button done" onclick={onClose}>Listo</button>
    </header>

    <section class="drawer-section">
      <h3>Modo</h3>
      <div class="mode-grid">
        {#each modes as m}
          <button class="mode-chip" class:on={mode === m} aria-pressed={mode === m} onclick={() => pickMode(m)}>
            {modeLabel(m)}
          </button>
        {/each}
      </div>
    </section>

    <section class="drawer-section">
      <h3>Ejercicio</h3>
      <label class="toggle-row">
        <span>Opción múltiple</span>
        <input
          type="checkbox"
          class="sw-input"
          role="switch"
          checked={settings.assist}
          aria-checked={settings.assist}
          onchange={(e) => onToggleAssist(e.currentTarget.checked)}
        />
        <span class="sw" aria-hidden="true"></span>
      </label>
      <label class="toggle-row">
        <span>Cronómetro</span>
        <input
          type="checkbox"
          class="sw-input"
          role="switch"
          checked={settings.timerEnabled}
          aria-checked={settings.timerEnabled}
          onchange={(e) => onToggleTimer(e.currentTarget.checked)}
        />
        <span class="sw" aria-hidden="true"></span>
      </label>
      <label class="toggle-row">
        <span>Sílaba tónica</span>
        <input
          type="checkbox"
          class="sw-input"
          role="switch"
          checked={showTonic}
          aria-checked={showTonic}
          onchange={(e) => onToggleTonic(e.currentTarget.checked)}
        />
        <span class="sw" aria-hidden="true"></span>
      </label>
    </section>

    <section class="drawer-section">
      <h3>Examen</h3>
      <div class="exam-row">
        <label class="exam-field">
          <span class="exam-label">Fecha del examen</span>
          <input
            type="date"
            class="exam-date"
            value={examDate ?? ''}
            onchange={(e) => onSetExamDate(e.currentTarget.value || null)}
          />
        </label>
        {#if daysLeft !== null}
          <span class="exam-days">{daysLeft === 0 ? 'hoy' : `en ${daysLeft} d`}</span>
        {/if}
      </div>
    </section>

    <section class="drawer-section">
      <h3>Datos</h3>
      <div class="data-row">
        <button class="ghost-button" onclick={onExport}>Exportar</button>
        <label class="ghost-button import-btn">
          Importar
          <input type="file" accept="application/json,.json" onchange={handleImportFile} hidden />
        </label>
      </div>
      <button class="ghost-button reset-btn" onclick={onReset}>Reiniciar progreso</button>
    </section>
  </div>
{/if}

<style>
  /* ── Scrim ─────────────────────────────────────────────────────────────── */
  .drawer-scrim {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: rgba(34, 33, 31, 0.42);
  }

  /* ── Sheet (mobile bottom-sheet) ───────────────────────────────────────── */
  .drawer-sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 61;
    max-height: 86vh;
    overflow-y: auto;
    background: var(--panel);
    border-top-left-radius: 18px;
    border-top-right-radius: 18px;
    box-shadow: 0 -16px 50px rgba(34, 33, 31, 0.22);
    padding: 8px 16px calc(18px + env(safe-area-inset-bottom, 0px));
    display: flex;
    flex-direction: column;
    gap: 16px;
    outline: none;
  }

  .grip {
    width: 42px;
    height: 5px;
    border-radius: 999px;
    background: #d8d2c6;
    margin: 6px auto 0;
    flex: 0 0 auto;
  }

  .drawer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .drawer-head strong {
    font-size: 1.15rem;
  }
  .ghost-button.done {
    min-height: 44px;
    color: var(--accent-strong);
    border-color: var(--line);
  }

  .drawer-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* Section headers — bold so 0.72rem stays legible (uppercase eyebrows). */
  h3 {
    font-size: 0.72rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
  }

  /* ── Modo: pill chips ──────────────────────────────────────────────────── */
  .mode-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .mode-chip {
    min-height: 44px;
    border: 1px solid var(--line);
    background: var(--panel);
    color: var(--ink);
    border-radius: 999px;
    padding: 8px 15px;
    font-size: 0.9rem;
    font-weight: 800;
    cursor: pointer;
    transition: border-color 120ms ease, background 120ms ease, color 120ms ease;
  }
  .mode-chip:hover {
    border-color: var(--accent);
  }
  .mode-chip.on {
    background: var(--accent);
    border-color: var(--accent);
    color: #fffdf8;
  }

  /* ── Ejercicio: iOS-style switch rows ──────────────────────────────────── */
  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--panel);
    padding: 12px 14px;
    min-height: 52px;
    font-weight: 800;
    cursor: pointer;
  }
  /* The real checkbox drives state + keyboard; the .sw element is the visual. */
  .sw-input {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .sw {
    flex: 0 0 auto;
    width: 44px;
    height: 26px;
    border-radius: 999px;
    background: #cfc9bd;
    position: relative;
    transition: background 140ms ease;
  }
  .sw::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 2px rgba(34, 33, 31, 0.3);
    transition: transform 140ms ease;
  }
  .sw-input:checked ~ .sw {
    background: var(--accent);
  }
  .sw-input:checked ~ .sw::after {
    transform: translateX(18px);
  }
  /* Keyboard focus ring on the visual switch (input is visually hidden). */
  .sw-input:focus-visible ~ .sw {
    outline: 2px solid var(--accent-strong);
    outline-offset: 2px;
  }

  /* ── Examen ────────────────────────────────────────────────────────────── */
  .exam-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--panel);
    padding: 12px 14px;
    min-height: 52px;
  }
  .exam-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .exam-label {
    font-size: 0.78rem;
    font-weight: 800;
    color: var(--muted);
  }
  .exam-date {
    min-height: 36px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--panel);
    color: var(--ink);
    padding: 4px 9px;
    font-size: 0.95rem;
    font-weight: 700;
  }
  .exam-date:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
    border-color: var(--accent);
  }
  .exam-days {
    flex: 0 0 auto;
    color: var(--accent-strong);
    font-weight: 900;
    font-size: 0.95rem;
  }

  /* ── Datos ─────────────────────────────────────────────────────────────── */
  .data-row {
    display: flex;
    gap: 10px;
  }
  .data-row .ghost-button {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .import-btn {
    cursor: pointer;
  }
  /* Reiniciar — destructive, visually separated below the export/import pair. */
  .reset-btn {
    width: 100%;
    color: var(--red);
    border-color: rgba(179, 66, 53, 0.4);
  }
  .reset-btn:hover {
    border-color: var(--red);
  }

  /* ── Motion: slide-up + scrim fade (respects reduced-motion) ───────────── */
  @media (prefers-reduced-motion: no-preference) {
    .drawer-scrim {
      animation: scrim-in 200ms ease both;
    }
    .drawer-sheet {
      animation: sheet-up 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes scrim-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    @keyframes sheet-up {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }
  }

  /* ── Desktop: right-anchored dialog card ───────────────────────────────── */
  @media (min-width: 681px) {
    .drawer-sheet {
      left: auto;
      top: 0;
      bottom: 0;
      width: min(420px, 100%);
      max-height: 100vh;
      border-radius: 0;
      box-shadow: var(--shadow);
      padding: 20px 22px calc(22px + env(safe-area-inset-bottom, 0px));
      gap: 18px;
    }
    .grip {
      display: none;
    }
    @media (prefers-reduced-motion: no-preference) {
      .drawer-sheet {
        animation: sheet-in-right 240ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      @keyframes sheet-in-right {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }
    }
  }
</style>

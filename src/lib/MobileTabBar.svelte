<script lang="ts">
  /*
   * MobileTabBar — fixed bottom navigation (≤680px only) toggling the two mobile
   * screens: Practicar (the exercise) and Progreso (the "Tu avance" tree). The active
   * tab is --accent-strong; inactive is --muted. The reserve space so it doesn't cover
   * content is handled by the app.css mobile bottom padding on .app-shell.
   */
  type View = 'practicar' | 'progreso'

  let { view, onChange }: { view: View; onChange: (v: View) => void } = $props()
</script>

<nav class="tabbar" aria-label="Navegación">
  <button class="tab" class:active={view === 'practicar'} aria-current={view === 'practicar'} onclick={() => onChange('practicar')}>
    <span class="ic" aria-hidden="true">✎</span>
    Practicar
  </button>
  <button class="tab" class:active={view === 'progreso'} aria-current={view === 'progreso'} onclick={() => onChange('progreso')}>
    <span class="ic" aria-hidden="true">▤</span>
    Progreso
  </button>
</nav>

<style>
  .tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 40;
    height: 56px;
    display: flex;
    border-top: 1px solid var(--line);
    background: rgba(255, 253, 248, 0.92);
    backdrop-filter: blur(10px);
    padding-bottom: env(safe-area-inset-bottom, 0);
  }
  .tab {
    flex: 1;
    border: 0;
    background: transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 0.82rem; /* ≥13px floor; inactive uses --muted (AA on panel) */
    font-weight: 800;
    color: var(--muted);
    cursor: pointer;
  }
  .tab .ic {
    font-size: 1.1rem;
    line-height: 1;
  }
  .tab.active {
    color: var(--accent-strong);
  }
</style>

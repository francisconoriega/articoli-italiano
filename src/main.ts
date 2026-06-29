import { mount } from 'svelte'
import './styles/app.css'
import App from './App.svelte'
import { catalog } from './content'
import { buildItems } from './engine/items'
import { loadStoreAsync } from './engine/storage'
import { isTestMode, isTestReset } from './engine/testMode'

const target = document.getElementById('app')
if (!target) {
  throw new Error('Root element #app not found in index.html')
}

// Make isolated automated-testing mode (`?claude-test`) unmistakable: progress is
// isolated to a test key and the shared dev file is never touched (see testMode.ts).
if (isTestMode()) {
  console.warn(
    `[articoli] TEST MODE — isolated progress, real study file untouched` +
      (isTestReset() ? ' (clean slate)' : ''),
  )
  document.documentElement.dataset.claudeTest = isTestReset() ? 'reset' : 'on'
  // Sticky (not fixed) so it reserves space and pushes the app down instead of
  // covering the header — and stays pinned while scrolling. Prepended before #app.
  const banner = document.createElement('div')
  banner.setAttribute('role', 'alert')
  banner.textContent = '🧪 MODO PRUEBA — NO estás practicando de verdad · tu progreso NO se guarda'
  banner.style.cssText =
    'position:sticky;top:0;z-index:9999;padding:10px 14px;' +
    'font:700 14px/1.4 system-ui,sans-serif;text-align:center;' +
    'background:#b91c1c;color:#fff;letter-spacing:.02em;' +
    'box-shadow:0 2px 10px rgba(0,0,0,.3)'
  document.body.insertBefore(banner, document.body.firstChild)
}

// content → atomic practice items (one-time at boot), and the persisted progress store.
// loadStoreAsync awaits the dev cross-port sync (with a hard timeout + localStorage
// fallback); in a production build it resolves to localStorage immediately.
const items = buildItems(catalog)
const store = await loadStoreAsync()

const app = mount(App, { target, props: { items, store } })

export default app

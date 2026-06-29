import { mount } from 'svelte'
import './styles/app.css'
import App from './App.svelte'
import { catalog } from './content'
import { buildItems } from './engine/items'
import { loadStoreAsync } from './engine/storage'

const target = document.getElementById('app')
if (!target) {
  throw new Error('Root element #app not found in index.html')
}

// content → atomic practice items (one-time at boot), and the persisted progress store.
// loadStoreAsync awaits the dev cross-port sync (with a hard timeout + localStorage
// fallback); in a production build it resolves to localStorage immediately.
const items = buildItems(catalog)
const store = await loadStoreAsync()

const app = mount(App, { target, props: { items, store } })

export default app

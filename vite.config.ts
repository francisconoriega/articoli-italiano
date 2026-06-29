import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Environment-dependent base:
//  - dev (`npm run dev`)   -> '/'                    (frictionless http://localhost:5173/)
//  - prod (`npm run build`) -> '/articoli-italiano/' (assets resolve under the GitHub Pages subpath)
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/articoli-italiano/' : '/',
  plugins: [svelte()],
}))

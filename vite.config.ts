import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// Environment-dependent base:
//  - dev (`npm run dev`)   -> '/'                    (frictionless http://localhost:5173/)
//  - prod (`npm run build`) -> '/articoli-italiano/' (assets resolve under the GitHub Pages subpath)
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/articoli-italiano/' : '/',
  // Expose the dev server on the LAN (accessible via the machine's IP, e.g. for phone testing).
  // Honor a PORT env var (preview tooling assigns one) but default to vite's 5173.
  server: { host: true, port: Number(process.env.PORT) || 5173 },
  plugins: [svelte()],
}))

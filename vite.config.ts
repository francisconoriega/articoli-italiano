import { defineConfig, type PluginOption } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { mergeProgress } from './scripts/dev-progress-merge.mjs'

/**
 * DEV-ONLY cross-port progress sync (the "broker", see STORAGE.md).
 * Two `npm run dev` instances on different ports are different ORIGINS and can't
 * share localStorage. This middleware persists ONE shared JSON file on disk; the app
 * GET/POSTs it at /__progress so studying is unified across ports. `apply: 'serve'`
 * keeps it entirely OUT of the production build (GitHub Pages → plain localStorage).
 */
function devProgressSync(): PluginOption {
  const file = join(homedir(), '.articoli-progreso-dev.json')
  return {
    name: 'articoli-dev-progress-sync',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__progress', (req, res) => {
        if (req.method === 'GET') {
          let body = '{}'
          try {
            if (existsSync(file)) body = readFileSync(file, 'utf8') || '{}'
          } catch {
            /* no shared file yet → empty */
          }
          res.setHeader('content-type', 'application/json')
          res.end(body)
          return
        }
        if (req.method === 'POST') {
          const chunks: Buffer[] = []
          req.on('data', (c: Buffer) => chunks.push(c))
          req.on('end', () => {
            try {
              const incoming = JSON.parse(Buffer.concat(chunks).toString('utf8'))
              let current: unknown = null
              try {
                if (existsSync(file)) current = JSON.parse(readFileSync(file, 'utf8'))
              } catch {
                current = null
              }
              // Merge-on-write (by recency) so two active dev instances never clobber.
              writeFileSync(file, JSON.stringify(mergeProgress(current, incoming)))
            } catch {
              /* bad body / read-write error → keep the current file untouched */
            }
            res.statusCode = 204
            res.end()
          })
          return
        }
        res.statusCode = 405
        res.end()
      })
    },
  }
}

// Whole-instance test mode (`VITE_CLAUDE_TEST=1 npm run dev:test`): the client already
// isolates itself (engine/testMode.ts reads VITE_CLAUDE_TEST), but we ALSO drop the
// `/__progress` broker so this server physically CANNOT read or write the user's real
// shared file — defence in depth, immune to any URL/reload mishap.
const TEST_INSTANCE = process.env.VITE_CLAUDE_TEST === '1' || process.env.VITE_CLAUDE_TEST === 'true'

// Environment-dependent base:
//  - dev (`npm run dev`)   -> '/'                    (frictionless http://localhost:5173/)
//  - prod (`npm run build`) -> '/articoli-italiano/' (assets resolve under the GitHub Pages subpath)
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/articoli-italiano/' : '/',
  // Expose the dev server on the LAN (accessible via the machine's IP, e.g. for phone testing).
  // Honor a PORT env var (preview tooling assigns one) but default to vite's 5173.
  server: { host: true, port: Number(process.env.PORT) || 5173 },
  plugins: [svelte(), ...(TEST_INSTANCE ? [] : [devProgressSync()])],
}))

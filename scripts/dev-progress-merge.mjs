/**
 * dev-progress-merge.mjs — recency merge for the DEV cross-port progress sync.
 *
 * Used by the vite middleware in vite.config.ts (merge-on-write, so two active dev
 * instances never clobber each other) and verified by dev-progress-merge-harness.mjs.
 * Plain JS so both the vite config loader and a bare `node` harness can import it.
 *
 * Merge rules (same as engine/storage.ts mergeStores, kept in sync intentionally):
 *  - per item id: keep the side with the more recent `lastSeen`;
 *  - per skill: keep the side with more exposures (`seen`);
 *  - history: concatenate, de-dupe, keep the most recent 50 rounds;
 *  - other top-level fields: take `incoming` (the latest writer).
 */
export function mergeProgress(current, incoming) {
  if (!incoming || typeof incoming !== 'object') return current ?? null
  if (!current || typeof current !== 'object') return incoming

  const items = { ...(current.items || {}) }
  for (const [id, ip] of Object.entries(incoming.items || {})) {
    const cp = items[id]
    if (!cp) {
      items[id] = ip
      continue
    }
    items[id] = (ip?.lastSeen ?? -1) >= (cp?.lastSeen ?? -1) ? ip : cp
  }

  const skills = { ...(current.skills || {}) }
  for (const [id, isk] of Object.entries(incoming.skills || {})) {
    const csk = skills[id]
    skills[id] = !csk || (isk?.seen ?? 0) >= (csk?.seen ?? 0) ? isk : csk
  }

  const seen = new Set()
  const history = [...(current.history || []), ...(incoming.history || [])]
    .filter((h) => {
      const key = `${h?.endedAt ?? ''}:${h?.answered ?? ''}:${h?.correct ?? ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => (a?.endedAt ?? 0) - (b?.endedAt ?? 0))
    .slice(-50)

  return { ...current, ...incoming, items, skills, history }
}

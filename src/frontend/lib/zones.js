// Loads map shapes for alerts whose own geometry is null (zone-based alerts): fetches
// each affected zone once (cached), at most 4 at a time and at most 25 per render.

const zoneCache = new Map(); // url → Promise<geometry|null>
const MAX_ZONES = 25;
const CONCURRENCY = 4;

function fetchZone(url, fetchImpl) {
  if (!zoneCache.has(url)) {
    const p = fetchImpl(url, { headers: { Accept: 'application/geo+json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((f) => f?.geometry ?? null)
      .catch(() => null);
    zoneCache.set(url, p);
    // Do not keep failures cached forever
    p.then((g) => { if (!g) zoneCache.delete(url); });
  }
  return zoneCache.get(url);
}

/**
 * Returns [{ alertId, geometry }] for each alert, using the alert's own geometry when present.
 * @param {object[]} alerts normalised alerts, most important first
 */
export async function loadAlertShapes(alerts, { fetchImpl = globalThis.fetch } = {}) {
  const shapes = [];
  const jobs = [];
  for (const a of alerts) {
    if (a.geometry) shapes.push({ alertId: a.id, geometry: a.geometry });
    else for (const z of a.zones) jobs.push({ alertId: a.id, url: z });
  }
  const queue = jobs.slice(0, MAX_ZONES);
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const job = queue.shift();
      const geometry = await fetchZone(job.url, fetchImpl);
      if (geometry) shapes.push({ alertId: job.alertId, geometry });
    }
  });
  await Promise.all(workers);
  return { shapes, truncated: jobs.length > MAX_ZONES };
}

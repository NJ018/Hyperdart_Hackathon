// Fetches active alerts from the NWS API (or, for Canada, Environment Canada — same
// GeoJSON FeatureCollection shape). 8 s timeout, one retry for network errors, 5xx and
// 429, a 60 s in-memory cache. Never throws: always resolves to
// { ok, features, fetchedAt, error: null | { type, status, detail } }.

import { ecccUrl } from './eccc.js';

export const NWS_BASE = 'https://api.weather.gov';
const TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 800;
const CACHE_TTL_MS = 60_000;

const cache = new Map(); // url → { at, result }

/** Builds the alerts URL for { point:[lat,lon] } | { area:'TX' } | { national:true }. */
export function alertsUrl({ point, area, national, severity } = {}) {
  const params = new URLSearchParams({ status: 'actual', message_type: 'alert,update' });
  if (point) params.set('point', `${point[0]},${point[1]}`);
  else if (area) params.set('area', area);
  else if (!national) throw new Error('alertsUrl needs point, area or national');
  if (severity) params.set('severity', severity);
  return `${NWS_BASE}/alerts/active?${params.toString().replace(/%2C/g, ',')}`;
}

/** Maps an HTTP status / problem+json body to one of our error types. */
export function classifyHttpError(status, body) {
  const detail = body?.detail || body?.title || `HTTP ${status}`;
  if (status === 400 && /out of bounds|not supported|invalid parameter/i.test(detail)) return { type: 'outOfBounds', status, detail };
  if (status === 404) return { type: 'outOfBounds', status, detail };
  if (status === 429 || status >= 500) return { type: 'server', status, detail };
  return { type: 'unknown', status, detail };
}

const sleep = (ms, signal) =>
  new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener?.('abort', () => { clearTimeout(t); resolve(); }, { once: true });
  });

async function attempt(url, fetchImpl, outerSignal) {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  outerSignal?.addEventListener?.('abort', onAbort, { once: true });
  const timer = setTimeout(() => ctrl.abort('timeout'), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { headers: { Accept: 'application/geo+json' }, signal: ctrl.signal });
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    if (!res.ok) return { ok: false, retryable: res.status === 429 || res.status >= 500, error: classifyHttpError(res.status, body) };
    if (!body || !Array.isArray(body.features)) {
      return { ok: false, retryable: true, error: { type: 'server', status: res.status, detail: 'Unexpected response from NWS' } };
    }
    return { ok: true, features: body.features };
  } catch (e) {
    if (outerSignal?.aborted) return { ok: false, retryable: false, aborted: true, error: { type: 'unknown', status: 0, detail: 'aborted' } };
    const timedOut = ctrl.signal.aborted;
    return { ok: false, retryable: true, error: { type: timedOut ? 'timeout' : 'network', status: 0, detail: String(e?.message || e) } };
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener?.('abort', onAbort);
  }
}

/**
 * @param {object} request { point } | { area } | { national }, plus optional severity
 * @param {{ signal?: AbortSignal, fetchImpl?: typeof fetch, force?: boolean, cache?: boolean, now?: () => number }} [opts]
 */
export async function fetchActiveAlerts(request, { signal, fetchImpl = globalThis.fetch, force = false, cache: useCache = true, now = Date.now } = {}) {
  const url = request.source === 'eccc' ? ecccUrl(request) : alertsUrl(request);
  const hit = useCache && cache.get(url);
  if (!force && hit && now() - hit.at < CACHE_TTL_MS) return hit.result;

  let r = await attempt(url, fetchImpl, signal);
  if (!r.ok && r.retryable && !signal?.aborted) {
    await sleep(RETRY_DELAY_MS, signal);
    if (!signal?.aborted) r = await attempt(url, fetchImpl, signal);
  }

  const result = r.ok
    ? { ok: true, features: r.features, fetchedAt: now(), error: null, url }
    : { ok: false, features: [], fetchedAt: now(), error: r.error, url, aborted: Boolean(r.aborted) };
  if (result.ok && useCache) cache.set(url, { at: result.fetchedAt, result });
  return result;
}

export const clearAlertCache = () => cache.clear();

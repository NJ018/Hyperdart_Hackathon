// Loads alerts for a request and keeps them fresh: auto-refresh every 120 s while the
// page is visible, manual refresh, and a failed *refresh* keeps the last good result
// (flagged as stale) instead of replacing it with an error or an empty list.
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchActiveAlerts } from '../lib/nwsClient.js';

const REFRESH_MS = 120_000;

/**
 * @param {object|null} request { point } | { area } | { national, severity }; null = nothing to fetch
 * @returns {{ status:'idle'|'loading'|'ready'|'error', features:object[], fetchedAt:number|null,
 *            error:object|null, refreshing:boolean, staleSince:number|null, refresh:()=>void }}
 */
export function useAlerts(request, { fetchImpl } = {}) {
  const key = request ? JSON.stringify(request) : null;
  const [state, setState] = useState({ status: 'idle', features: [], fetchedAt: null, error: null, refreshing: false, staleSince: null });
  const ctrlRef = useRef(null);
  const hasDataRef = useRef(false);

  const load = useCallback(
    async ({ force = false } = {}) => {
      if (!key) return;
      ctrlRef.current?.abort();
      const ctrl = new AbortController();
      ctrlRef.current = ctrl;
      const background = hasDataRef.current;
      setState((s) => (background ? { ...s, refreshing: true } : { ...s, status: 'loading', error: null }));

      const opts = { signal: ctrl.signal, force };
      if (fetchImpl) Object.assign(opts, { fetchImpl, cache: false }); // demo data never enters the real cache
      const r = await fetchActiveAlerts(JSON.parse(key), opts);
      if (ctrl.signal.aborted || r.aborted) return;

      if (r.ok) {
        hasDataRef.current = true;
        setState({ status: 'ready', features: r.features, fetchedAt: r.fetchedAt, error: null, refreshing: false, staleSince: null });
      } else if (background) {
        setState((s) => ({ ...s, refreshing: false, staleSince: s.staleSince ?? r.fetchedAt, error: r.error }));
      } else {
        setState({ status: 'error', features: [], fetchedAt: r.fetchedAt, error: r.error, refreshing: false, staleSince: null });
      }
    },
    [key, fetchImpl],
  );

  // New request → start over
  useEffect(() => {
    hasDataRef.current = false;
    if (!key) {
      setState({ status: 'idle', features: [], fetchedAt: null, error: null, refreshing: false, staleSince: null });
      return undefined;
    }
    load();
    return () => ctrlRef.current?.abort();
  }, [key, load]);

  // Auto-refresh only while visible
  useEffect(() => {
    if (!key) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load({ force: true });
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [key, load]);

  const refresh = useCallback(() => load({ force: true }), [load]);
  return { ...state, refresh };
}

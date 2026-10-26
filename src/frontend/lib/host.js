// Small helpers for talking to the hyperDart host. The docs spell the handler object
// both `messageHandlers` and `messageHandler`, so we accept either.

export const getHandlers = (props) => props?.messageHandlers ?? props?.messageHandler ?? {};

/** Starts a new search in the host (follow-up chips). */
export const runSearch = (props, query) => getHandlers(props).searchQuery?.(query);

/** Calls componentLoaded() once per mount; `ref` is a React ref owned by the top-level component. */
export function signalLoadedOnce(ref, props) {
  if (ref.current) return;
  ref.current = true;
  getHandlers(props).componentLoaded?.();
}

// Resolves sandbox demo mode (see demo/fixtureMode.js). Returns { status: 'off' } in
// production and whenever no ?fixture= is requested.
import { useEffect, useState } from 'react';
import { loadScenario, requestedFixture } from '../demo/fixtureMode.js';

export function useDemoFixture(UIOptions) {
  const name = requestedFixture(UIOptions);
  const [state, setState] = useState(() => (name ? { status: 'loading', name } : { status: 'off' }));

  useEffect(() => {
    if (!name) {
      setState({ status: 'off' });
      return undefined;
    }
    let cancelled = false;
    setState({ status: 'loading', name });
    loadScenario(name).then((scenario) => {
      if (cancelled) return;
      setState(scenario ? { status: 'on', ...scenario } : { status: 'off', unknown: name });
    });
    return () => { cancelled = true; };
  }, [name]);

  return state;
}

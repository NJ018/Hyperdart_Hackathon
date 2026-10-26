// The official live alert sources we can query, and which country each covers.
// Everything else gets the honest "outside coverage" answer with official links.

import { NWS_COUNTRIES } from './states.js';

export const SOURCES = {
  nws: {
    key: 'nws', name: 'National Weather Service', the: 'the National Weather Service', short: 'NWS',
    home: 'https://www.weather.gov/', homeLabel: 'weather.gov', recordHost: 'api.weather.gov',
  },
  eccc: {
    key: 'eccc', name: 'Environment and Climate Change Canada', the: 'Environment Canada', short: 'Environment Canada',
    home: 'https://weather.gc.ca/?layers=alert', homeLabel: 'weather.gc.ca', recordHost: 'api.weather.gc.ca',
  },
};

/** 'nws' | 'eccc' | null for a country code. */
export function liveSourceFor(countryCode) {
  const cc = String(countryCode || '').toUpperCase();
  if (NWS_COUNTRIES.includes(cc)) return 'nws';
  if (cc === 'CA') return 'eccc';
  return null;
}

export const sourceInfo = (key) => SOURCES[key] ?? SOURCES.nws;

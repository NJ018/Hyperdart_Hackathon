// Test helper: loads the recorded fixtures from /fixtures (Node only, used by *.test.js).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../fixtures/', import.meta.url));

export const sd = (name) => JSON.parse(readFileSync(`${root}searchData/${name}.json`, 'utf8'));
export const nws = (name) => JSON.parse(readFileSync(`${root}nws/${name}.json`, 'utf8'));

/** A feature in the NWS shape, for hand-made edge cases. */
export function feature(props = {}, extra = {}) {
  const id = props.id ?? `urn:oid:test.${Math.random().toString(36).slice(2)}`;
  return {
    id: `https://api.weather.gov/alerts/${id}`,
    type: 'Feature',
    geometry: null,
    ...extra,
    properties: {
      id,
      '@id': `https://api.weather.gov/alerts/${id}`,
      event: 'Flood Warning',
      severity: 'Severe',
      urgency: 'Immediate',
      certainty: 'Observed',
      areaDesc: 'Harris, TX',
      geocode: { UGC: ['TXC201'] },
      affectedZones: ['https://api.weather.gov/zones/county/TXC201'],
      references: [],
      messageType: 'Alert',
      sent: '2026-10-26T01:00:00-05:00',
      effective: '2026-10-26T01:00:00-05:00',
      onset: '2026-10-26T01:00:00-05:00',
      ends: '2026-10-26T09:00:00-05:00',
      expires: '2026-10-26T09:00:00-05:00',
      parameters: {},
      ...props,
    },
  };
}

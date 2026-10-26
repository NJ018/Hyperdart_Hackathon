// Environment Canada adapter: query planning, merging per-area features, wording.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ecccUrl, normalizeEcccFeatures } from './eccc.js';
import { parseQuery, planRequest } from './parseQuery.js';
import { prepareAlerts } from './pipeline.js';
import { applyQuery } from './filterHazard.js';
import { buildVerdict } from './verdict.js';
import { parseDescription } from './bulletin.js';
import { provinceCodeFor } from './states.js';
import { formatTime } from './time.js';
import { sd } from './testFixtures.js';

const eccc = (name) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../../fixtures/eccc/${name}.json`, import.meta.url)), 'utf8'));
const NOW = Date.parse('2026-10-26T07:55:00Z');

describe('Environment Canada', () => {
  it('Canadian places are queried live instead of "outside coverage"', () => {
    expect(planRequest(parseQuery(sd('sd-toronto')))).toEqual({ type: 'fetch', request: { source: 'eccc', point: [43.7001, -79.4163] } });
    expect(planRequest(parseQuery(sd('sd-quebec')))).toEqual({ type: 'fetch', request: { source: 'eccc', province: 'QC' } });
    expect(planRequest(parseQuery(sd('sd-canada')))).toEqual({ type: 'fetch', request: { source: 'eccc', national: true } });
    expect(provinceCodeFor('Québec')).toBe('QC');
  });

  it('builds bbox / province URLs', () => {
    expect(ecccUrl({ point: [43.7, -79.4] })).toBe('https://api.weather.gc.ca/collections/weather-alerts/items?f=json&lang=en&limit=500&bbox=-79.4200,43.6800,-79.3800,43.7200');
    expect(ecccUrl({ province: 'QC' })).toContain('province=QC');
  });

  it('merges one-feature-per-area into one alert per warning', () => {
    const alerts = normalizeEcccFeatures(eccc('quebec').body.features);
    expect(alerts).toHaveLength(2); // 5 wind-warning areas + 2 blizzard-warning areas
    const wind = alerts.find((a) => a.event === 'Wind Warning');
    expect(wind).toMatchObject({ source: 'eccc', tier: 'warning', severity: 'Moderate', hazard: 'wind' });
    expect(wind.areas).toHaveLength(5);
    expect(wind.geometry.type).toBe('GeometryCollection');
    expect(wind.ends).toBe('2026-10-27T10:00:00.000Z'); // event end, not the message expiry
    expect(wind.expires).toBe('2026-10-26T19:03:34.279Z');
  });

  it('shows UTC stamps in the place time zone, not as "local time"', () => {
    expect(formatTime('2026-10-27T10:00:00.000Z', { tz: 'America/Toronto', now: NOW })).toBe('tomorrow 6:00 AM EDT');
  });

  it('wording names Environment Canada, never the NWS', () => {
    const parsed = parseQuery(sd('sd-toronto'));
    const split = applyQuery(prepareAlerts(eccc('empty').body.features, NOW, 'eccc'), parsed);
    const v = buildVerdict({ phase: 'ready', parsed, split, fetchedAt: NOW, now: NOW, tz: 'America/Toronto', source: 'eccc' });
    expect(v.headline).toBe('No active Environment Canada alerts for Toronto as of 3:55 AM EDT.');
    expect(v.detail).toContain('Environment and Climate Change Canada alerts only');
    const err = buildVerdict({ phase: 'error', parsed, source: 'eccc' });
    expect(err.headline).toBe("Couldn't reach Environment Canada, so we can't confirm whether alerts are active.");
  });

  it('splits ECCC bulletin text into its own sections', () => {
    const text = eccc('quebec').body.features[0].properties.alert_text_en;
    expect(parseDescription(text).map((s) => s.label)).toEqual(['What', 'When', 'Additional information']);
  });
});

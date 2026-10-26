import { beforeEach, describe, expect, it, vi } from 'vitest';
import { alertsUrl, classifyHttpError, clearAlertCache, fetchActiveAlerts } from './nwsClient.js';
import { nws } from './testFixtures.js';

const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const fixtureRes = (name) => { const f = nws(name); return res(f.status, f.body); };

beforeEach(() => clearAlertCache());

describe('nwsClient', () => {
  it('builds the documented URLs', () => {
    expect(alertsUrl({ point: [29.7633, -95.3633] })).toBe(
      'https://api.weather.gov/alerts/active?status=actual&message_type=alert,update&point=29.7633,-95.3633');
    expect(alertsUrl({ area: 'CO' })).toContain('area=CO');
    expect(alertsUrl({ national: true, severity: 'Extreme,Severe' })).toContain('severity=Extreme,Severe');
  });

  it('returns features on success and caches for 60 s', async () => {
    const fetchImpl = vi.fn(async () => fixtureRes('state-colorado'));
    const r = await fetchActiveAlerts({ area: 'CO' }, { fetchImpl });
    expect(r.ok).toBe(true);
    expect(r.features).toHaveLength(5);
    await fetchActiveAlerts({ area: 'CO' }, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await fetchActiveAlerts({ area: 'CO' }, { fetchImpl, force: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries once after a 500, then succeeds', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(fixtureRes('error-500'))
      .mockResolvedValueOnce(fixtureRes('empty'));
    const r = await fetchActiveAlerts({ area: 'TX' }, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(r).toMatchObject({ ok: true, features: [] });
  });

  it('two 500s → a typed server error, never an empty "no alerts" success', async () => {
    const fetchImpl = vi.fn(async () => fixtureRes('error-500'));
    const r = await fetchActiveAlerts({ area: 'TX' }, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(r.ok).toBe(false);
    expect(r.error.type).toBe('server');
  });

  it('out-of-bounds 400 → outOfBounds, no retry', async () => {
    const fetchImpl = vi.fn(async () => fixtureRes('out-of-bounds-400'));
    const r = await fetchActiveAlerts({ point: [28.652, 77.2315] }, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(r.error.type).toBe('outOfBounds');
  });

  it('network failure → retried, then a network error', async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError('Failed to fetch'); });
    const r = await fetchActiveAlerts({ area: 'TX' }, { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(r.error.type).toBe('network');
  });

  it('classifies HTTP problems', () => {
    expect(classifyHttpError(429, null).type).toBe('server');
    expect(classifyHttpError(404, null).type).toBe('outOfBounds');
    expect(classifyHttpError(403, { detail: 'forbidden' }).type).toBe('unknown');
  });
});

// normalizeAlert, dedupe, rank, group, filterHazard and the pipeline, on real fixtures.
import { describe, expect, it } from 'vitest';
import { alertStatus, normalizeAlert, tierOf } from './normalizeAlert.js';
import { dedupe, vtecKey } from './dedupe.js';
import { rank, worstSeverity } from './rank.js';
import { groupByEvent, countByState } from './group.js';
import { applyQuery } from './filterHazard.js';
import { prepareAlerts, splitMarine } from './pipeline.js';
import { classifyEvent } from './hazards.js';
import { feature, nws } from './testFixtures.js';

const CAPTURED = Date.parse('2026-10-26T07:10:00Z');
const prep = (name) => prepareAlerts(nws(name).body.features, CAPTURED);

describe('normalizeAlert', () => {
  const texas = nws('state-texas').body.features.map(normalizeAlert);
  const coastal = texas.find((a) => a.event === 'Coastal Flood Advisory');

  it('uses the alert URL for links and the URN for dedupe', () => {
    expect(coastal.id).toMatch(/^https:\/\/api\.weather\.gov\/alerts\/urn:oid:/);
    expect(coastal.urn).toMatch(/^urn:oid:/);
  });

  it('keeps ends (hazard end) separate from expires (message end)', () => {
    expect(coastal.ends).toBe('2026-10-27T00:00:00-05:00');
    expect(coastal.expires).toBe('2026-10-26T08:15:00-05:00');
  });

  it('marks an alert whose onset is later as upcoming', () => {
    expect(alertStatus(coastal, CAPTURED)).toBe('upcoming');
  });

  it('splits areaDesc into areas', () => {
    const fl = nws('state-florida').body.features.map(normalizeAlert).find((a) => a.event === 'Flood Warning' && !a.ends);
    expect(fl.areas).toEqual(['Lake, FL', 'Volusia, FL']);
  });

  it('derives the tier and hazard from the event name', () => {
    expect(tierOf('Flash Flood Warning')).toBe('warning');
    expect(tierOf('Winter Storm Watch')).toBe('watch');
    expect(tierOf('Air Quality Alert')).toBe('advisory');
    expect(tierOf('Special Weather Statement')).toBe('statement');
    expect(classifyEvent('Winter Storm Warning')).toBe('winter');
    expect(classifyEvent('Storm Surge Warning')).toBe('hurricane');
    expect(classifyEvent('Hurricane Force Wind Warning')).toBe('wind');
    expect(classifyEvent('Dust Storm Warning')).toBe('airQuality');
    expect(classifyEvent('Small Craft Advisory')).toBe('coastal');
  });

  it('flags marine-only alerts', () => {
    const marine = normalizeAlert(feature({ event: 'Gale Warning', geocode: { UGC: ['PKZ411', 'GMZ555'] } }));
    const land = normalizeAlert(feature({ geocode: { UGC: ['TXC201', 'GMZ555'] } }));
    expect(marine.marine).toBe(true);
    expect(land.marine).toBe(false);
  });

  it('computes ending soon / ended', () => {
    const a = normalizeAlert(feature({ onset: '2026-10-26T06:00:00Z', ends: '2026-10-26T07:40:00Z' }));
    expect(alertStatus(a, CAPTURED)).toBe('endingSoon');
    expect(alertStatus(a, Date.parse('2026-10-26T08:00:00Z'))).toBe('ended');
  });
});

describe('dedupe', () => {
  it('drops an alert that a newer message references, and cancellations', () => {
    const old = feature({ id: 'urn:oid:old' });
    const update = feature({ id: 'urn:oid:new', messageType: 'Update', references: [{ '@id': 'x', identifier: 'urn:oid:old', sender: 's', sent: 't' }] });
    const cancel = feature({ id: 'urn:oid:cx', messageType: 'Cancel' });
    const out = dedupe([old, update, cancel].map(normalizeAlert));
    expect(out.map((a) => a.urn)).toEqual(['urn:oid:new']);
  });

  it('keeps the newest message of the same VTEC event for the same areas', () => {
    const vtec = ['/O.EXT.KEPZ.FF.W.0237.000000T0000Z-261026T0945Z/'];
    const a = feature({ id: 'urn:oid:a', sent: '2026-10-26T00:10:00-06:00', parameters: { VTEC: vtec } });
    const b = feature({ id: 'urn:oid:b', sent: '2026-10-26T00:40:00-06:00', parameters: { VTEC: vtec } });
    expect(dedupe([a, b].map(normalizeAlert)).map((x) => x.urn)).toEqual(['urn:oid:b']);
    expect(vtecKey(vtec[0])).toBe('KEPZ.FF.W.0237');
  });

  it('keeps distinct warnings (El Paso had three separate Flash Flood Warnings)', () => {
    const ffw = prep('state-texas').filter((a) => a.event === 'Flash Flood Warning');
    expect(ffw).toHaveLength(3);
  });
});

describe('rank', () => {
  it('orders by severity, then tier, then in-effect before upcoming', () => {
    const list = [
      feature({ event: 'Wind Advisory', severity: 'Moderate' }),
      feature({ event: 'Flood Watch', severity: 'Severe' }),
      feature({ event: 'Flood Warning', severity: 'Severe', onset: '2026-10-27T00:00:00Z' }),
      feature({ event: 'Flash Flood Warning', severity: 'Severe' }),
      feature({ event: 'Tornado Warning', severity: 'Extreme' }),
    ].map(normalizeAlert);
    expect(rank(list, CAPTURED).map((a) => a.event)).toEqual([
      'Tornado Warning', 'Flash Flood Warning', 'Flood Warning', 'Flood Watch', 'Wind Advisory',
    ]);
    expect(worstSeverity(list)).toBe('Extreme');
    expect(worstSeverity([])).toBeNull();
  });

  it('puts the Coastal Flood Warning first for Miami', () => {
    expect(prep('city-miami')[0].event).toBe('Coastal Flood Warning');
  });
});

describe('applyQuery (hazard / severe filters)', () => {
  const asHeat = { hazard: 'heat', hazardTerm: 'heat', tier: 'advisory' };

  it('flood warnings in Colorado: all 5 Flood Warnings match', () => {
    const { matched, others } = applyQuery(prep('state-colorado'), { hazard: 'flood', hazardTerm: 'flood', tier: 'warning' });
    expect(matched).toHaveLength(5);
    expect(others).toHaveLength(0);
  });

  it('heat advisory asked, Extreme Heat Warning active → no match, but a related (more serious) alert', () => {
    const alerts = [normalizeAlert(feature({ event: 'Extreme Heat Warning', severity: 'Extreme' }))];
    const { matched, related } = applyQuery(alerts, asHeat);
    expect(matched).toHaveLength(0);
    expect(related.map((a) => a.event)).toEqual(['Extreme Heat Warning']);
  });

  it('"hurricane warning" does not count a Tropical Storm Warning as a match', () => {
    const alerts = [normalizeAlert(feature({ event: 'Tropical Storm Warning' }))];
    const r = applyQuery(alerts, { hazard: 'hurricane', hazardTerm: 'hurricane', tier: 'warning' });
    expect(r.matched).toHaveLength(0);
    expect(r.related).toHaveLength(1);
  });

  it('a colloquial word keeps the whole family ("wildfire" → Red Flag Warning)', () => {
    const alerts = [normalizeAlert(feature({ event: 'Red Flag Warning' }))];
    expect(applyQuery(alerts, { hazard: 'fire', hazardTerm: 'wildfire', tier: 'warning' }).matched).toHaveLength(1);
  });

  it('severe only: Alaska keeps Severe/Extreme, the rest stay available', () => {
    const all = prep('state-alaska');
    const { matched, others } = applyQuery(all, { severeOnly: true });
    expect(matched.every((a) => ['Severe', 'Extreme'].includes(a.severity))).toBe(true);
    expect(matched.length + others.length).toBe(all.length);
    expect(matched.length).toBeGreaterThan(0);
  });

  it('unfiltered query matches everything', () => {
    const all = prep('city-daytona');
    expect(applyQuery(all, {})).toMatchObject({ matched: all, related: [], others: [], filtered: false });
  });
});

describe('grouping', () => {
  it('groups Colorado into one "Flood Warning × 5" row with merged areas', () => {
    const [g] = groupByEvent(prep('state-colorado'));
    expect(g).toMatchObject({ event: 'Flood Warning', count: 5 });
    expect(g.areas.length).toBeGreaterThanOrEqual(1);
  });

  it('an open-ended alert makes the group open-ended', () => {
    const flood = groupByEvent(prep('state-florida')).find((g) => g.event === 'Flood Warning');
    expect(flood.ends).toBeNull();
  });

  it('national view: counts land alerts by state and separates marine ones', () => {
    const { land, marine } = splitMarine(prep('national-severe'));
    expect(marine.length).toBeGreaterThan(0);
    expect(land.every((a) => !a.marine)).toBe(true);
    const states = countByState(land);
    expect(states[0].count).toBeGreaterThanOrEqual(states[states.length - 1].count);
  });
});

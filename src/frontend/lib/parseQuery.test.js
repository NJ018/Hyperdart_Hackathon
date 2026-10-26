import { describe, expect, it } from 'vitest';
import { findTier, normalizeSearchData, parseQuery, planRequest } from './parseQuery.js';
import { sd } from './testFixtures.js';

const run = (name) => {
  const parsed = parseQuery(sd(name));
  return { parsed, plan: planRequest(parsed) };
};

describe('parseQuery + planRequest on real hyperDart searchData', () => {
  it('weather alerts in Houston → point query in Houston, TX with its time zone', () => {
    const { parsed, plan } = run('sd-houston');
    expect(parsed.kind).toBe('point');
    expect(parsed.place).toMatchObject({ label: 'Houston', context: 'TX', stateAbb: 'TX', tz: 'America/Chicago' });
    expect(parsed.hazard).toBeNull();
    expect(plan).toEqual({ type: 'fetch', request: { point: [29.7633, -95.3633] } });
  });

  it('accepts searchData as a single object (production shape)', () => {
    const { parsed, plan } = run('sd-object-shape');
    expect(parsed.place.label).toBe('Houston');
    expect(plan.request.point).toEqual([29.7633, -95.3633]);
  });

  it('flood warnings in Colorado → state area CO, hazard flood, tier warning', () => {
    const { parsed, plan } = run('sd-colorado-flood');
    expect(parsed).toMatchObject({ kind: 'state', hazard: 'flood', hazardTerm: 'flood', tier: 'warning', severeOnly: false });
    expect(plan).toEqual({ type: 'fetch', request: { area: 'CO' } });
  });

  it('severe weather alerts in Alaska → area AK, severe only', () => {
    const { parsed, plan } = run('sd-alaska-severe');
    expect(parsed).toMatchObject({ kind: 'state', severeOnly: true, hazard: null });
    expect(plan.request).toEqual({ area: 'AK' });
  });

  it('is there a heat advisory in Phoenix → yes/no, heat, advisory', () => {
    const { parsed } = run('sd-phoenix-heat');
    expect(parsed).toMatchObject({ kind: 'point', yesNo: true, hazard: 'heat', tier: 'advisory' });
  });

  it('weather alerts in Delhi → outside coverage, no network call', () => {
    const { parsed, plan } = run('sd-delhi');
    expect(parsed.place).toMatchObject({ label: 'Delhi', context: 'India', stateAbb: null });
    expect(plan).toMatchObject({ type: 'outside', countryCode: 'IN', countryName: 'India' });
  });

  it('"San Juan" resolves to Argentina → outside coverage, named with its country', () => {
    const { parsed, plan } = run('sd-san-juan-ambiguous');
    expect(parsed.place.context).toBe('Argentina');
    expect(plan.type).toBe('outside');
  });

  it('near me with a US IP → point at the user location, marked approximate', () => {
    const { parsed, plan } = run('sd-near-me-us');
    expect(parsed.kind).toBe('nearMe');
    expect(parsed.place).toMatchObject({ approximate: true, countryCode: 'US' });
    expect(plan.request.point).toEqual([25.7743, -80.1937]);
  });

  it('near me with an India IP → outside coverage for the user', () => {
    expect(run('sd-near-me-in').plan).toMatchObject({ type: 'outside', countryCode: 'IN' });
  });

  it('near me with no userLocation (local sandbox) → ask for location', () => {
    expect(run('sd-near-me-unknown').plan).toEqual({ type: 'needLocation', reason: 'noUserLocation' });
  });

  it('"tornado warning near me": ignores the town of Tornado, WV the NLU found', () => {
    const { parsed, plan } = run('sd-tornado-near-me');
    expect(parsed).toMatchObject({ kind: 'nearMe', hazard: 'tornado', tier: 'warning' });
    expect(plan.request.point).toEqual([25.7743, -80.1937]);
  });

  it('ZIP code without coordinates → asks to try the city, with a hint', () => {
    const { parsed, plan } = run('sd-zip');
    expect(plan).toEqual({ type: 'needLocation', reason: 'noCoordinates' });
    expect(parsed.place.hint).toBe('Houston');
  });

  it('no place and no location → needLocation', () => {
    expect(run('sd-no-location').plan).toEqual({ type: 'needLocation', reason: 'noPlace' });
  });

  it('United States → national query; Guam / Puerto Rico → territory area', () => {
    expect(run('sd-us-national').plan).toEqual({ type: 'fetch', request: { national: true } });
    expect(run('sd-guam').plan).toEqual({ type: 'fetch', request: { area: 'GU' } });
  });

  it('San Juan, Puerto Rico: territory name is not repeated', () => {
    const { parsed, plan } = run('sd-sanjuan-pr-heat');
    expect(parsed.place.context).toBe('Puerto Rico');
    expect(plan.request.point).toEqual([18.4663, -66.1057]);
  });

  it('Toronto is labelled with province and country (and queried via Environment Canada)', () => {
    const { parsed, plan } = run('sd-toronto');
    expect(parsed.place.context).toBe('Ontario, Canada');
    expect(plan.request.source).toBe('eccc');
  });

  it('London → outside coverage (no live source), with its country', () => {
    expect(run('sd-london').plan).toMatchObject({ type: 'outside', countryCode: 'GB', countryName: 'United Kingdom' });
  });
});

describe('query wording', () => {
  const q = (query, entities = []) => parseQuery({ query, entities });

  it('detects tiers', () => {
    expect(findTier('flood warnings in X')).toBe('warning');
    expect(findTier('tornado watch')).toBe('watch');
    expect(findTier('heat advisories')).toBe('advisory');
    expect(findTier('weather alerts')).toBeNull();
  });

  it('prefers the longest hazard term: flash flood over flood, winter storm over storm', () => {
    expect(q('flash flood warning near me').hazardTerm).toBe('flash flood');
    expect(q('winter storm warning near me').hazard).toBe('winter');
  });

  it('"severe thunderstorm" is a hazard, not the severe-only filter', () => {
    expect(q('severe thunderstorm warning near me')).toMatchObject({ hazard: 'storm', severeOnly: false });
  });

  it('ignores hazard words inside the place name', () => {
    const entities = [{ word: 'Storm Lake', collectionName: 'CITIES', collectionType: 'HD_LOCATION',
      entityInfo: { geo: { lat: 42.64, long: -95.2, countryCode: 'US', stateAbb: 'IA', city: 'Storm Lake' } } }];
    expect(q('weather alerts in Storm Lake', entities).hazard).toBeNull();
  });

  it('normalises missing searchData safely', () => {
    expect(normalizeSearchData(undefined)).toEqual({});
    expect(normalizeSearchData([])).toEqual({});
    expect(parseQuery(null).kind).toBe('none');
  });
});

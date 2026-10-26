// The wording rules: answer first, the "No — but…" case, and no false reassurance.
import { describe, expect, it } from 'vitest';
import { buildVerdict, COVERAGE_CAVEAT, untilPhrase } from './verdict.js';
import { parseQuery, planRequest } from './parseQuery.js';
import { applyQuery } from './filterHazard.js';
import { normalizeAlert } from './normalizeAlert.js';
import { prepareAlerts } from './pipeline.js';
import { feature, nws, sd } from './testFixtures.js';

const NOW = Date.parse('2026-10-26T07:10:00Z');
const FORBIDDEN = /\bsafe\b|all clear|nothing to worry|you'?re fine|no danger/i;

function verdictFor(sdName, features, extra = {}) {
  const parsed = parseQuery(sd(sdName));
  const alerts = prepareAlerts(features, NOW);
  return buildVerdict({ phase: 'ready', parsed, split: applyQuery(alerts, parsed), fetchedAt: NOW, now: NOW, tz: parsed.place?.tz, ...extra });
}

describe('buildVerdict', () => {
  it('no alerts: says so with the check time and always adds the caveat', () => {
    const v = verdictFor('sd-houston', []);
    expect(v.headline).toBe('No active NWS alerts for Houston as of 2:10 AM CDT.');
    expect(v.detail).toBe(COVERAGE_CAVEAT);
    expect(v.severity).toBeNull();
  });

  it('flood warnings in Colorado: Yes, named and counted', () => {
    const v = verdictFor('sd-colorado-flood', nws('state-colorado').body.features);
    expect(v).toMatchObject({ state: 'active', answer: 'Yes', headline: '5 Flood Warnings in Colorado' });
  });

  it('is there a heat advisory in Phoenix — none at all → a direct No', () => {
    const v = verdictFor('sd-phoenix-heat', []);
    expect(v.answer).toBe('No');
    expect(v.headline).toBe('No heat advisory for Phoenix — and no other active NWS alerts as of 12:10 AM MST.');
  });

  it('heat advisory asked while an Extreme Heat Warning is active → No, but more serious', () => {
    const v = verdictFor('sd-phoenix-heat', [feature({ event: 'Extreme Heat Warning', severity: 'Extreme' })]);
    expect(v.answer).toBe('No');
    expect(v.headline).toBe('No heat advisory for Phoenix right now.');
    expect(v.detail).toBe('But an Extreme Heat Warning is in effect, which is more serious.');
    expect(v.severity).toBe('Extreme');
  });

  it('no match but other alerts → never stops at "No"', () => {
    const v = verdictFor('sd-colorado-flood', [feature({ event: 'Winter Storm Warning' }), feature({ event: 'Wind Advisory', severity: 'Moderate' })]);
    expect(v.headline).toBe('No flood warnings in Colorado right now.');
    expect(v.detail).toBe('But 2 other alerts are active.');
  });

  it('severe only with nothing severe → says how many less serious alerts exist', () => {
    const v = verdictFor('sd-alaska-severe', [feature({ event: 'Wind Advisory', severity: 'Moderate' })]);
    expect(v.headline).toBe('No severe alerts in Alaska right now.');
    expect(v.detail).toBe('But 1 less serious alert is active.');
  });

  it('single alert answers until when; open-ended says until further notice', () => {
    const v = verdictFor('sd-sanjuan-pr-heat', nws('city-sanjuan-pr').body.features);
    expect(v.answer).toBe('Yes');
    expect(v.headline).toBe('Heat Advisory for San Juan');
    // Captured at 3:10 AM AST, before the advisory's 9 AM onset
    expect(v.detail).toBe('Starts 9:00 AM AST, until 5:00 PM AST.');
    const later = verdictFor('sd-sanjuan-pr-heat', nws('city-sanjuan-pr').body.features, { now: Date.parse('2026-10-26T15:00:00Z') });
    expect(later.detail).toBe('Until 5:00 PM AST.');
    const open = normalizeAlert(feature({ ends: null }));
    expect(untilPhrase(open, { now: NOW })).toBe('until further notice');
  });

  it('outside coverage names the place and denies nothing', () => {
    const parsed = parseQuery(sd('sd-delhi'));
    const v = buildVerdict({ phase: 'outside', parsed, plan: planRequest(parsed) });
    expect(v.headline).toBe("We can't check alerts for Delhi, India here.");
    expect(v.detail).toContain('does not mean there are no alerts in Delhi');
  });

  it('API failure never looks like "no alerts"', () => {
    const v = buildVerdict({ phase: 'error', parsed: parseQuery(sd('sd-houston')) });
    expect(v.state).toBe('error');
    expect(v.headline).toMatch(/can't confirm/);
    expect(v.headline).not.toMatch(/no active/i);
  });

  it('never uses reassuring words in any state', () => {
    const texts = [];
    for (const name of ['sd-houston', 'sd-colorado-flood', 'sd-alaska-severe', 'sd-phoenix-heat', 'sd-near-me-us']) {
      const parsed = parseQuery(sd(name));
      for (const phase of ['loading', 'needLocation', 'outside', 'error']) {
        const v = buildVerdict({ phase, parsed, plan: planRequest(parsed) });
        texts.push(v.headline, v.detail);
      }
      for (const fx of ['empty', 'city-miami', 'state-alaska', 'state-colorado']) {
        const v = verdictFor(name, nws(fx).body.features);
        texts.push(v.headline, v.detail);
      }
    }
    for (const t of texts.filter(Boolean)) expect(t).not.toMatch(FORBIDDEN);
  });
});

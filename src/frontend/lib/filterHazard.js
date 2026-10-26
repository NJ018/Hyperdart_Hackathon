// Splits alerts into what the user asked about (`matched`), close relatives of it
// (`related`: same hazard, different kind — e.g. an Extreme Heat Warning when they asked
// for a heat advisory) and everything else (`others`). Nothing is ever thrown away, so
// the UI can say "No flood warnings — but 3 other alerts are active".

import { HAZARDS } from './hazards.js';
import { isEventTerm } from '../data/nwsEventTypes.js';

const SEVERE = ['Extreme', 'Severe'];

/**
 * @param {object[]} alerts normalised, ranked alerts
 * @param {{ hazard?: string|null, hazardTerm?: string|null, tier?: string|null, severeOnly?: boolean }} q
 */
export function applyQuery(alerts, { hazard = null, hazardTerm = null, tier = null, severeOnly = false } = {}) {
  let family = alerts;
  let pool = alerts;

  if (hazard && HAZARDS[hazard]) {
    family = alerts.filter((a) => HAZARDS[hazard].eventMatch.test(a.event));
    // A word that is part of an official event name narrows the answer ("hurricane" ≠
    // "Tropical Storm"); a colloquial word ("wildfire", "snow" aside) keeps the family.
    const term = String(hazardTerm || '').toLowerCase();
    pool = term && isEventTerm(term) ? family.filter((a) => a.event.toLowerCase().includes(term)) : family;
  }

  let matched = tier ? pool.filter((a) => a.tier === tier) : pool;
  if (severeOnly) matched = matched.filter((a) => SEVERE.includes(a.severity));

  const related = hazard ? family.filter((a) => !matched.includes(a)) : [];
  const others = alerts.filter((a) => !matched.includes(a) && !related.includes(a));

  return { matched, related, others, filtered: Boolean(hazard || severeOnly) };
}

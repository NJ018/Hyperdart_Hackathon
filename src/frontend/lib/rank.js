// Orders alerts most-serious first: severity → tier → in effect before upcoming →
// urgency → soonest start. The first alert after sorting is the "hero".

import { alertStatus } from './normalizeAlert.js';

export const SEVERITY_ORDER = ['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown'];
export const TIER_ORDER = ['warning', 'watch', 'advisory', 'statement', 'other'];
const URGENCY_ORDER = ['Immediate', 'Expected', 'Future', 'Unknown', 'Past'];

const idx = (list, v) => {
  const i = list.indexOf(v);
  return i === -1 ? list.length : i;
};

export const severityRank = (s) => idx(SEVERITY_ORDER, s);
export const tierRank = (t) => idx(TIER_ORDER, t);

export function compareAlerts(a, b, now = Date.now()) {
  const upcoming = (x) => (alertStatus(x, now) === 'upcoming' ? 1 : 0);
  return (
    severityRank(a.severity) - severityRank(b.severity) ||
    tierRank(a.tier) - tierRank(b.tier) ||
    upcoming(a) - upcoming(b) ||
    idx(URGENCY_ORDER, a.urgency) - idx(URGENCY_ORDER, b.urgency) ||
    (Date.parse(a.onset) || 0) - (Date.parse(b.onset) || 0)
  );
}

export const rank = (alerts, now = Date.now()) => [...alerts].sort((a, b) => compareAlerts(a, b, now));

/** The most serious severity in a list, or null when empty. */
export function worstSeverity(alerts) {
  if (!alerts.length) return null;
  return SEVERITY_ORDER[Math.min(...alerts.map((a) => severityRank(a.severity)))] ?? 'Unknown';
}

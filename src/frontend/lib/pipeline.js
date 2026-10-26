// Raw features → the ranked list the UI shows: normalise (NWS or Environment Canada),
// drop superseded and cancelled messages, drop alerts whose `ends` has already passed, rank.

import { normalizeAlert, alertStatus } from './normalizeAlert.js';
import { normalizeEcccFeatures } from './eccc.js';
import { dedupe } from './dedupe.js';
import { rank } from './rank.js';

export function prepareAlerts(features, now = Date.now(), source = 'nws') {
  const normalized = source === 'eccc' ? normalizeEcccFeatures(features) : (features ?? []).map(normalizeAlert);
  const alerts = dedupe(normalized);
  return rank(alerts.filter((a) => alertStatus(a, now) !== 'ended'), now);
}

/** National view: land alerts in the main answer, marine-only alerts counted separately. */
export function splitMarine(alerts) {
  return { land: alerts.filter((a) => !a.marine), marine: alerts.filter((a) => a.marine) };
}

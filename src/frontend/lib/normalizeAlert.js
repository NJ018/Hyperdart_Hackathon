// Flattens one NWS GeoJSON feature into the object the UI uses, and works out an
// alert's status at a given moment. "Until when" is `ends`; `expires` is only when
// this *message* lapses (NWS may re-issue it), so it is never shown as the end.

import { classifyEvent } from './hazards.js';
import { toMs } from './time.js';

// Marine zone prefixes, from the NWS API's own `area` enumeration.
const MARINE_PREFIXES = ['AM', 'AN', 'GM', 'LC', 'LE', 'LH', 'LM', 'LO', 'LS', 'PH', 'PK', 'PM', 'PS', 'PZ', 'SL'];

/** warning > watch > advisory > statement, from the event name. */
export function tierOf(event) {
  const e = String(event || '').toLowerCase();
  if (/warning|emergency|evacuation|shelter in place/.test(e)) return 'warning';
  if (/watch/.test(e)) return 'watch';
  if (/advisory|alert/.test(e)) return 'advisory';
  if (/statement|outlook|message|forecast/.test(e)) return 'statement';
  return 'other';
}

const isMarineZone = (ugc) => MARINE_PREFIXES.includes(ugc.slice(0, 2)) && ugc[2] === 'Z';

export function normalizeAlert(feature) {
  const p = feature?.properties ?? {};
  const ugc = p.geocode?.UGC ?? [];
  return {
    source: 'nws',
    id: feature?.id || p['@id'] || p.id, // URL — used for links
    urn: p.id, // urn:oid:… — used for dedupe
    event: p.event || 'Alert',
    hazard: classifyEvent(p.event),
    tier: tierOf(p.event),
    severity: p.severity || 'Unknown',
    urgency: p.urgency || 'Unknown',
    certainty: p.certainty || 'Unknown',
    headline: p.headline || null,
    nwsHeadline: p.parameters?.NWSheadline?.[0] || null,
    description: p.description || null,
    instruction: p.instruction || null,
    areaDesc: p.areaDesc || '',
    areas: String(p.areaDesc || '').split(';').map((s) => s.trim()).filter(Boolean),
    onset: p.onset || p.effective || p.sent || null,
    ends: p.ends || null,
    expires: p.expires || null,
    sent: p.sent || null,
    sender: p.senderName || p.sender || 'National Weather Service',
    messageType: p.messageType || 'Alert',
    references: (p.references ?? []).map((r) => (typeof r === 'string' ? r : r?.identifier)).filter(Boolean),
    vtec: p.parameters?.VTEC?.[0] || null,
    zones: p.affectedZones ?? [],
    ugc,
    marine: ugc.length > 0 && ugc.every(isMarineZone),
    geometry: feature?.geometry ?? null,
    web: p.web || null,
  };
}

/**
 * 'upcoming' (onset in the future), 'endingSoon' (ends within the hour), 'ended'
 * (ends already passed but still listed) or 'active'.
 */
export function alertStatus(alert, now = Date.now()) {
  const onset = toMs(alert.onset);
  const ends = toMs(alert.ends);
  if (!Number.isNaN(onset) && onset > now) return 'upcoming';
  if (!Number.isNaN(ends) && ends <= now) return 'ended';
  if (!Number.isNaN(ends) && ends - now <= 60 * 60_000) return 'endingSoon';
  return 'active';
}

export const isInEffect = (alert, now) => ['active', 'endingSoon'].includes(alertStatus(alert, now));

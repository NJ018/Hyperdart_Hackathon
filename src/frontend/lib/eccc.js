// Environment and Climate Change Canada (MSC GeoMet OGC API) → the same alert shape
// normalizeAlert() produces for the NWS. ECCC returns one feature per area, so features
// of the same alert (id "<alertId>_<areaId>") are merged into one alert with many areas.
// ECCC has no CAP severity: we map its official risk colour (yellow / orange / red) onto
// our seriousness scale and always show the colour, impact and confidence verbatim too.

import { classifyEvent } from './hazards.js';
import { tierOf } from './normalizeAlert.js';

export const ECCC_BASE = 'https://api.weather.gc.ca/collections/weather-alerts/items';
const RISK_TO_SEVERITY = { yellow: 'Moderate', orange: 'Severe', red: 'Extreme' };
const DROP_STATUS = ['ended', 'cancelled', 'expired'];

/** { point:[lat,lon] } | { province:'QC' } | { national:true } → items URL. */
export function ecccUrl({ point, province } = {}) {
  const params = new URLSearchParams({ f: 'json', lang: 'en', limit: '500' });
  if (point) {
    const [lat, lon] = point;
    const d = 0.02; // ~2 km box around the place: alerts whose area touches it
    params.set('bbox', [lon - d, lat - d, lon + d, lat + d].map((n) => n.toFixed(4)).join(','));
  } else if (province) {
    params.set('province', province);
  }
  return `${ECCC_BASE}?${params.toString().replace(/%2C/g, ',')}`;
}

const titleCase = (s) => String(s || '').replace(/\b\w/g, (c) => c.toUpperCase());

export function normalizeEcccFeatures(features) {
  const byAlert = new Map();
  for (const f of features ?? []) {
    const p = f?.properties ?? {};
    if (DROP_STATUS.includes(String(p.status_en).toLowerCase())) continue;
    const alertId = String(f.id ?? '').split('_')[0] || `${p.alert_code}-${p.publication_datetime}`;
    let a = byAlert.get(alertId);
    if (!a) {
      const event = titleCase(p.alert_name_en) || 'Alert';
      a = {
        source: 'eccc',
        id: `${ECCC_BASE}/${encodeURIComponent(f.id)}`, // official record of the first area
        urn: alertId,
        event,
        hazard: classifyEvent(event),
        tier: ['warning', 'watch', 'advisory', 'statement'].includes(p.alert_type) ? p.alert_type : tierOf(event),
        severity: RISK_TO_SEVERITY[String(p.risk_colour_en).toLowerCase()] ?? 'Unknown',
        urgency: 'Unknown',
        certainty: 'Unknown',
        eccc: { riskColour: p.risk_colour_en || null, impact: p.impact_en || null, confidence: p.confidence_en || null, status: p.status_en || null },
        headline: null,
        nwsHeadline: null,
        description: p.alert_text_en || null,
        instruction: null, // ECCC puts its advice inside the bulletin text
        areas: [],
        onset: p.validity_datetime || p.publication_datetime || null,
        ends: p.event_end_datetime || null,
        expires: p.expiration_datetime || null,
        sent: p.publication_datetime || null,
        sender: 'Environment and Climate Change Canada',
        messageType: 'Alert',
        references: [],
        vtec: null,
        zones: [],
        ugc: [],
        marine: false,
        shapes: [],
        web: 'https://weather.gc.ca/?layers=alert',
      };
      byAlert.set(alertId, a);
    }
    if (p.feature_name_en && !a.areas.includes(p.feature_name_en)) a.areas.push(p.feature_name_en);
    if (f.geometry) a.shapes.push(f.geometry);
  }
  return [...byAlert.values()].map(({ shapes, ...a }) => ({
    ...a,
    areaDesc: a.areas.join('; '),
    geometry: shapes.length === 1 ? shapes[0] : shapes.length ? { type: 'GeometryCollection', geometries: shapes } : null,
  }));
}

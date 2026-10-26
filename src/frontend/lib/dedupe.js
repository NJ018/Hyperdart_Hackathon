// Removes alerts that a newer message has replaced, plus cancellations, so one hazard
// is never counted twice. Works on normalised alerts (see normalizeAlert.js).

// "/O.EXT.KEPZ.FF.W.0237.000000T0000Z-261026T0945Z/" → "KEPZ.FF.W.0237" (office.phenomenon.significance.event#)
export function vtecKey(vtec) {
  const parts = String(vtec || '').replace(/^\//, '').split('.');
  return parts.length >= 6 ? parts.slice(2, 6).join('.') : null;
}

export function dedupe(alerts) {
  const superseded = new Set(alerts.flatMap((a) => a.references));
  const seen = new Set();
  const byEvent = new Map();

  for (const a of alerts) {
    if (a.messageType === 'Cancel') continue;
    if (a.urn && superseded.has(a.urn)) continue; // a later update references it
    if (seen.has(a.urn || a.id)) continue;
    seen.add(a.urn || a.id);

    // Same VTEC event for the same areas sent twice → keep the newest message
    const key = vtecKey(a.vtec);
    const k = key ? `${key}|${a.areaDesc}` : `${a.urn || a.id}`;
    const prev = byEvent.get(k);
    if (!prev || Date.parse(a.sent) > Date.parse(prev.sent)) byEvent.set(k, a);
  }
  return [...byEvent.values()];
}

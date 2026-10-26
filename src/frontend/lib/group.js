// Groups alerts by event name for state and national views ("Flood Warning × 5"),
// merging their areas and time spans. Input should already be ranked.

import { toMs } from './time.js';

export function groupByEvent(alerts) {
  const groups = new Map();
  for (const a of alerts) {
    let g = groups.get(a.event);
    if (!g) {
      g = { key: a.event, event: a.event, hazard: a.hazard, tier: a.tier, severity: a.severity, alerts: [], areas: [] };
      groups.set(a.event, g);
    }
    g.alerts.push(a);
    for (const area of a.areas) if (!g.areas.includes(area)) g.areas.push(area);
  }
  return [...groups.values()].map((g) => {
    const onsets = g.alerts.map((a) => toMs(a.onset));
    const ends = g.alerts.map((a) => toMs(a.ends));
    const valid = onsets.filter((n) => !Number.isNaN(n));
    return {
      ...g,
      count: g.alerts.length,
      // Keep the original NWS string so its UTC offset survives
      onset: valid.length ? g.alerts[onsets.indexOf(Math.min(...valid))].onset : null,
      // One open-ended alert makes the whole group open-ended
      ends: ends.some(Number.isNaN) ? null : g.alerts[ends.indexOf(Math.max(...ends))].ends,
      top: g.alerts[0],
    };
  });
}

/** Counts by state for the national view, from UGC codes ("TXC141" → "TX"). */
export function countByState(alerts) {
  const counts = new Map();
  for (const a of alerts) {
    if (a.marine) continue;
    const states = new Set(a.ugc.map((u) => u.slice(0, 2)));
    for (const s of states) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  return [...counts.entries()].sort((x, y) => y[1] - x[1]).map(([state, count]) => ({ state, count }));
}

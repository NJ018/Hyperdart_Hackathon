// Writes every sentence the verdict shows, from the query and the alerts. Pure text,
// so the wording rules are unit-tested: answer first, never imply safety, never show
// "no alerts" when we could not check.

import { alertStatus, isInEffect } from './normalizeAlert.js';
import { formatInstant, formatTime } from './time.js';
import { tierRank, worstSeverity } from './rank.js';
import { sourceInfo } from './sources.js';

export const coverageCaveat = (source = 'nws') =>
  `This covers official ${sourceInfo(source).name} alerts only. Conditions can change quickly — if you see danger, act on it and follow local officials.`;
export const COVERAGE_CAVEAT = coverageCaveat('nws');

const TIER_WORDS = {
  warning: ['warning', 'warnings'],
  watch: ['watch', 'watches'],
  advisory: ['advisory', 'advisories'],
  statement: ['statement', 'statements'],
};

const article = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');
const plural = (n, one, many) => (n === 1 ? one : many);
const pluralEvent = (event) => event.replace(/(Watch)$/, '$1es').replace(/(Advisory)$/, 'Advisories').replace(/(Warning|Statement|Alert|Outlook|Message)$/, '$1s');

/** "for Houston" / "in Colorado" / "across the US" / "near you". */
export function placePhrase(parsed) {
  const label = parsed.place?.label ?? 'this place';
  if (parsed.kind === 'nearMe') return 'near you';
  if (parsed.kind === 'country' && parsed.place?.countryCode === 'US') return 'across the US';
  if (parsed.kind === 'state' || parsed.kind === 'country') return `in ${label}`;
  return `for ${label}`;
}

/** What the user asked for, in their words: "flood warnings", "heat advisory", "severe alerts". */
export function askedPhrase(parsed) {
  const many = !parsed.yesNo || /\b(any|are)\b/i.test(parsed.rawQuery);
  const tierWord = parsed.tier ? TIER_WORDS[parsed.tier][many ? 1 : 0] : many ? 'alerts' : 'alert';
  const severe = parsed.severeOnly ? 'severe ' : '';
  return parsed.hazardTerm ? `${severe}${parsed.hazardTerm} ${tierWord}` : `${severe}${tierWord}`;
}

/** "until 9:45 PM CDT" / "until further notice" / "starts 9:00 AM AST, until 5:00 PM AST". */
export function untilPhrase(alert, { tz = null, now = Date.now() } = {}) {
  const until = alert.ends ? `until ${formatTime(alert.ends, { tz, now })}` : 'until further notice';
  if (alertStatus(alert, now) === 'upcoming') return `starts ${formatTime(alert.onset, { tz, now })}, ${until}`;
  return until;
}

function countPhrase(list, now) {
  const n = list.length;
  const inEffect = list.filter((a) => isInEffect(a, now)).length;
  if (inEffect === n) return `${n} ${plural(n, 'alert', 'alerts')} in effect`;
  if (inEffect === 0) return `${n} upcoming ${plural(n, 'alert', 'alerts')}`;
  return `${n} alerts (${inEffect} in effect, ${n - inEffect} upcoming)`;
}

/** Names a set of alerts compactly: "5 Flood Warnings" or "3 flood alerts". */
function namePhrase(list, parsed) {
  const events = [...new Set(list.map((a) => a.event))];
  if (events.length === 1) return list.length === 1 ? events[0] : `${list.length} ${pluralEvent(events[0])}`;
  return `${list.length} ${askedPhrase({ ...parsed, yesNo: false, tier: null })}`;
}

/**
 * @param {object} p
 * @param {'loading'|'needLocation'|'outside'|'error'|'ready'} p.phase
 * @param {object} p.parsed  from parseQuery
 * @param {object} [p.plan]   from planRequest
 * @param {{matched:object[], related:object[], others:object[], filtered:boolean}} [p.split] from applyQuery
 * @returns {{ state:string, answer:'Yes'|'No'|null, headline:string, detail:string|null, severity:string|null }}
 */
export function buildVerdict({ phase, parsed, plan = null, split = null, fetchedAt = null, now = Date.now(), tz = null, source = 'nws' }) {
  const src = sourceInfo(source);
  const where = placePhrase(parsed);
  const asksYesNo = parsed.yesNo || Boolean(parsed.hazard) || parsed.severeOnly;

  if (phase === 'loading') {
    return { state: 'loading', answer: null, headline: 'Checking official alerts…', detail: null, severity: null };
  }

  if (phase === 'needLocation') {
    if (plan?.reason === 'noUserLocation') {
      return { state: 'needLocation', answer: null, headline: "We don't know where you are yet.",
        detail: 'Share your location to check official weather alerts near you, or pick a place.', severity: null };
    }
    if (plan?.reason === 'noCoordinates' && parsed.place) {
      return { state: 'needLocation', answer: null, headline: `We couldn't pin down ${parsed.place.label} on the map.`,
        detail: parsed.place.hint ? `Try searching for ${parsed.place.hint} instead.` : 'Try a city or state name instead.', severity: null };
    }
    return { state: 'needLocation', answer: null, headline: 'Which place should we check?',
      detail: 'Pick a place below, or search for one — for example "weather alerts in Houston".', severity: null };
  }

  if (phase === 'outside') {
    const name = parsed.place ? [parsed.place.label, parsed.place.context].filter(Boolean).join(', ') : 'your location';
    const short = parsed.kind === 'nearMe' ? 'your area' : parsed.place?.label ?? 'this place';
    return {
      state: 'outside', answer: null,
      headline: parsed.kind === 'nearMe' ? `We can't check alerts for your area (${plan?.countryName ?? 'outside the US'}) here.` : `We can't check alerts for ${name} here.`,
      detail: `Our live sources are the US National Weather Service (US and territories) and Environment Canada. No result here does not mean there are no alerts in ${short}.`,
      severity: null,
    };
  }

  if (phase === 'error') {
    return { state: 'error', answer: null,
      headline: `Couldn't reach ${src.the}, so we can't confirm whether alerts are active.`,
      detail: `Try again in a moment, or check ${src.homeLabel} directly.`, severity: null };
  }

  // phase === 'ready'
  const { matched, related, others, filtered } = split;
  const all = [...matched, ...related, ...others];
  const severity = worstSeverity(all);
  const asOf = fetchedAt ? ` as of ${formatInstant(fetchedAt, { tz })}` : '';

  // National view: the request only asked NWS for Severe + Extreme alerts, so say exactly that.
  if (parsed.kind === 'country' && parsed.place?.countryCode === 'US' && !parsed.hazard) {
    const n = matched.length;
    if (!n) return { state: 'none', answer: null, headline: `No severe or extreme NWS alerts across the US${asOf}.`, detail: coverageCaveat(source), severity: null };
    return { state: 'active', answer: null,
      headline: `${n} severe or extreme ${plural(n, 'alert', 'alerts')} active across the US`,
      detail: 'Pick a state or city to see every alert there, including less serious ones.', severity: worstSeverity(matched) };
  }

  if (matched.length) {
    const single = matched.length === 1 ? matched[0] : null;
    const headline = filtered
      ? `${namePhrase(matched, parsed)} ${where}`
      : single
        ? `${single.event} ${where}`
        : `${countPhrase(matched, now)} ${where}`;
    const detail = single ? capitalise(untilPhrase(single, { tz, now })) + '.' : null;
    return { state: 'active', answer: asksYesNo ? 'Yes' : null, headline, detail, severity: worstSeverity(matched) };
  }

  if (!all.length) {
    const headline = filtered
      ? `No ${askedPhrase(parsed)} ${where} — and no other active ${src.short} alerts${asOf}.`
      : `No active ${src.short} alerts ${where}${asOf}.`;
    return { state: 'none', answer: asksYesNo ? 'No' : null, headline, detail: coverageCaveat(source), severity: null };
  }

  // Filtered query with no direct match, but something else is active: never stop at "No".
  const headline = `No ${askedPhrase(parsed)} ${where} right now.`;
  let detail;
  if (related.length) {
    const r = related[0];
    const verb = alertStatus(r, now) === 'upcoming' ? `is due to start ${formatTime(r.onset, { tz, now })}` : 'is in effect';
    let note = '';
    if (parsed.tier && tierRank(r.tier) < tierRank(parsed.tier)) note = ', which is more serious';
    else if (parsed.tier && tierRank(r.tier) > tierRank(parsed.tier)) note = ', which is less serious';
    const extra = related.length > 1 ? ` (+${related.length - 1} more related)` : '';
    detail = `But ${article(r.event)} ${r.event} ${verb}${note}${extra}.`;
  } else {
    const n = others.length;
    const kind = parsed.severeOnly && !parsed.hazard ? 'less serious' : 'other';
    detail = `But ${n} ${kind} ${plural(n, 'alert is', 'alerts are')} active.`;
  }
  return { state: 'noMatch', answer: 'No', headline, detail, severity };
}

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

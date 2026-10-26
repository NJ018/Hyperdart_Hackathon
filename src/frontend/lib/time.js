// Time formatting in the *place's* local time. With an IANA zone (from searchData geo.tz)
// we print its abbreviation ("CDT"); otherwise we use the UTC offset already in the NWS
// timestamp and say "local time". Also relative text ("in 2 h 10 m").

const MIN = 60_000;
const HOUR = 60 * MIN;

export const toMs = (iso) => (iso ? Date.parse(iso) : NaN);

/** UTC offset in minutes from an ISO string like "2026-10-26T03:45:00-06:00"; null if absent. */
export function isoOffsetMinutes(iso) {
  const m = /([+-])(\d{2}):?(\d{2})$/.exec(String(iso || ''));
  if (m) return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
  return /Z$/i.test(String(iso || '')) ? 0 : null;
}

/** Offset (minutes) of an IANA zone at a given instant, e.g. America/Chicago in October → -300. */
export function zoneOffsetMinutes(tz, ms) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(new Date(ms));
    const get = (t) => Number(parts.find((p) => p.type === t)?.value);
    const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
    return Math.round((asUTC - Math.floor(ms / 1000) * 1000) / MIN);
  } catch {
    return null;
  }
}

/**
 * Decides how to display an instant: in the place's zone when the timestamp's own offset
 * agrees with it, otherwise in the timestamp's own offset (e.g. an El Paso alert, on Mountain
 * time, shown for a Texas query whose zone is Central).
 */
function displayZone(iso, tz) {
  const ms = toMs(iso);
  const own = isoOffsetMinutes(iso);
  // UTC "Z" stamps (Environment Canada) carry no local intent: show them in the place's
  // zone, or the viewer's own zone when we don't know the place's.
  if (/Z$/i.test(String(iso))) return { tz: tz || undefined };
  if (tz && (own === null || zoneOffsetMinutes(tz, ms) === own)) return { tz };
  if (own !== null) return { offset: own };
  return { tz: tz || undefined };
}

function parts(ms, zone, opts) {
  if (zone.tz !== undefined || zone.offset === undefined) {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone.tz, ...opts }).formatToParts(new Date(ms));
  }
  // Shift by the fixed offset and format as UTC → wall-clock time at that offset.
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...opts }).formatToParts(new Date(ms + zone.offset * MIN));
}

const pick = (ps, type) => ps.find((p) => p.type === type)?.value ?? '';

function dayKey(ms, zone) {
  const ps = parts(ms, zone, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${pick(ps, 'year')}-${pick(ps, 'month')}-${pick(ps, 'day')}`;
}

/**
 * "9:45 PM CDT", "tomorrow 3:00 AM CDT", "Wed 2:00 PM local time".
 * @param {string|number} iso NWS timestamp, or a plain instant in ms (then shown in `tz`, else at `offset`)
 * @param {{ tz?: string|null, now?: number, withDay?: boolean, offset?: number|null }} o
 */
export function formatTime(iso, { tz = null, now = Date.now(), withDay = true, offset = null } = {}) {
  const instant = typeof iso === 'number';
  const ms = instant ? iso : toMs(iso);
  if (Number.isNaN(ms)) return '';
  const zone = !instant ? displayZone(iso, tz) : tz ? { tz } : offset !== null ? { offset } : { tz: undefined };
  const ps = parts(ms, zone, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  const clock = `${pick(ps, 'hour')}:${pick(ps, 'minute')} ${pick(ps, 'dayPeriod')}`;
  const label = zone.offset !== undefined ? 'local time' : pick(ps, 'timeZoneName');
  let day = '';
  if (withDay) {
    const d = dayKey(ms, zone);
    const today = dayKey(now, zone);
    const tomorrow = dayKey(now + 24 * HOUR, zone);
    const yesterday = dayKey(now - 24 * HOUR, zone);
    if (d === tomorrow) day = 'tomorrow ';
    else if (d === yesterday) day = 'yesterday ';
    else if (d !== today) {
      const wd = parts(ms, zone, { weekday: 'short', month: 'short', day: 'numeric' });
      day = Math.abs(ms - now) < 6 * 24 * HOUR ? `${pick(wd, 'weekday')} ` : `${pick(wd, 'month')} ${pick(wd, 'day')} `;
    }
  }
  return `${day}${clock} ${label}`.trim();
}

/** A moment we measured ourselves (e.g. when we checked): "11:54 AM CDT", in the place's zone or the viewer's. */
export function formatInstant(ms, { tz = null } = {}) {
  const ps = parts(ms, { tz: tz || undefined }, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  return `${pick(ps, 'hour')}:${pick(ps, 'minute')} ${pick(ps, 'dayPeriod')} ${pick(ps, 'timeZoneName')}`;
}

/** Short clock for axis ticks: "9 PM", "12 AM". */
export function formatTick(ms, { tz = null, offset = null } = {}) {
  const zone = offset !== null && offset !== undefined && !tz ? { offset } : { tz: tz || undefined };
  const ps = parts(ms, zone, { hour: 'numeric' });
  return `${pick(ps, 'hour')} ${pick(ps, 'dayPeriod')}`;
}

/** Weekday for day-boundary ticks: "Tue". */
export function formatWeekday(ms, { tz = null, offset = null } = {}) {
  const zone = offset !== null && offset !== undefined && !tz ? { offset } : { tz: tz || undefined };
  return pick(parts(ms, zone, { weekday: 'short' }), 'weekday');
}

/** "45 min", "2 h 10 m", "3 days". Always positive; caller adds "in"/"ago". */
export function formatDuration(ms) {
  const abs = Math.abs(ms);
  if (abs < MIN) return 'less than a minute';
  if (abs < HOUR) return `${Math.round(abs / MIN)} min`;
  if (abs < 48 * HOUR) {
    const h = Math.floor(abs / HOUR);
    const m = Math.round((abs % HOUR) / MIN);
    return m === 0 || m === 60 ? `${m === 60 ? h + 1 : h} h` : `${h} h ${m} m`;
  }
  return `${Math.round(abs / (24 * HOUR))} days`;
}

/** "in 2 h 10 m" / "15 min ago". */
export function relative(iso, now = Date.now()) {
  const ms = typeof iso === 'number' ? iso : toMs(iso);
  if (Number.isNaN(ms)) return '';
  const diff = ms - now;
  return diff >= 0 ? `in ${formatDuration(diff)}` : `${formatDuration(diff)} ago`;
}

/** "Updated just now" / "Updated 3 min ago". */
export function freshness(fetchedAt, now = Date.now()) {
  const diff = now - fetchedAt;
  if (diff < MIN) return 'Updated just now';
  return `Updated ${formatDuration(diff)} ago`;
}

export { MIN, HOUR };

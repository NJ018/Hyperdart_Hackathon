// Sandbox-only demo mode: open the sandbox with ?fixture=<name> to replay a recorded
// searchData + NWS response (quiet days happen). Times are shifted so the recording
// starts "now", and the card shows a DEMO DATA badge. The production build drops this
// code entirely (import.meta.env.DEV is false there), and it also requires UIOptions.sandbox.

export const SCENARIOS = {
  'miami': { sd: 'sd-miami', nws: 'city-miami', note: 'Miami, 3 alerts' },
  'daytona': { sd: 'sd-daytona', nws: 'city-daytona', note: 'Daytona Beach, 4 alerts' },
  'colorado-flood': { sd: 'sd-colorado-flood', nws: 'state-colorado', note: 'flood warnings in Colorado' },
  'alaska-severe': { sd: 'sd-alaska-severe', nws: 'state-alaska', note: 'severe weather alerts in Alaska' },
  'texas': { sd: 'sd-texas', nws: 'state-texas', note: 'Texas, mixed alerts incl. upcoming' },
  'texas-flood-watch': { sd: 'sd-texas', nws: 'state-texas', query: 'is there a flood watch in Texas', note: 'No — but a more serious warning' },
  'florida': { sd: 'sd-florida', nws: 'state-florida', note: 'Florida, incl. an open-ended Flood Warning' },
  'national': { sd: 'sd-us-national', nws: 'national-severe', note: 'United States' },
  'phoenix-heat': { sd: 'sd-phoenix-heat', nws: 'empty', note: 'is there a heat advisory in Phoenix (none)' },
  'sanjuan-heat': { sd: 'sd-sanjuan-pr-heat', nws: 'city-sanjuan-pr', note: 'heat advisory in San Juan, PR (yes)' },
  'houston-empty': { sd: 'sd-houston', nws: 'empty', note: 'Houston, no alerts' },
  'houston-error': { sd: 'sd-houston', nws: 'error-500', note: 'NWS failure' },
  'object-shape': { sd: 'sd-object-shape', nws: 'empty', note: 'searchData as an object' },
  'quebec': { sd: 'sd-quebec', eccc: 'quebec', note: 'Quebec, live Environment Canada data (recorded)' },
  'toronto-empty': { sd: 'sd-toronto', eccc: 'empty', note: 'Toronto, no Environment Canada alerts' },
  'delhi': { sd: 'sd-delhi', note: 'outside coverage' },
  'san-juan-ambiguous': { sd: 'sd-san-juan-ambiguous', note: 'NLU picks San Juan, Argentina' },
  'near-me-us': { sd: 'sd-near-me-us', nws: 'city-miami', note: 'near me, US IP' },
  'near-me-in': { sd: 'sd-near-me-in', note: 'near me, India IP' },
  'near-me-unknown': { sd: 'sd-near-me-unknown', note: 'near me, no location' },
  'tornado-near-me': { sd: 'sd-tornado-near-me', nws: 'city-miami', note: '"Tornado" read as a town' },
  'zip': { sd: 'sd-zip', note: 'ZIP code without coordinates' },
  'no-location': { sd: 'sd-no-location', note: 'no place at all' },
};

export function requestedFixture(UIOptions) {
  if (!import.meta.env.DEV) return null;
  let inFrame = true;
  try { inFrame = window.self !== window.top; } catch { inFrame = true; }
  if (!UIOptions?.sandbox && inFrame) return null;
  const read = (loc) => new URLSearchParams(loc.search).get('fixture');
  try {
    return read(window.location) || (inFrame ? read(window.parent.location) : null);
  } catch {
    return read(window.location);
  }
}

const TIME_FIELDS = ['sent', 'effective', 'onset', 'ends', 'expires'];

/** Moves an ISO time by `delta` ms, keeping its own UTC offset. */
export function shiftIso(iso, delta) {
  if (!iso) return iso;
  const m = /([+-])(\d{2}):(\d{2})$/.exec(iso);
  const offsetMin = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  const local = new Date(Date.parse(iso) + delta + offsetMin * 60_000).toISOString().slice(0, 19);
  return m ? `${local}${m[0]}` : `${local}Z`;
}

function shiftBody(body, delta) {
  if (!Array.isArray(body?.features)) return body;
  return {
    ...body,
    features: body.features.map((f) => {
      const p = { ...f.properties };
      for (const k of TIME_FIELDS) p[k] = shiftIso(p[k], delta);
      return { ...f, properties: p };
    }),
  };
}

/** Loads a scenario: { searchData, fetchImpl, capturedAt, note } or null if unknown. */
export async function loadScenario(name) {
  if (import.meta.env.DEV) {
    const s = SCENARIOS[name];
    if (!s) return null;
    const sd = (await import(`../../../fixtures/searchData/${s.sd}.json`)).default;
    let searchData = Array.isArray(sd) ? sd.map((x) => ({ ...x })) : { ...sd };
    if (s.query) searchData = [].concat(searchData).map((x) => ({ ...x, query: s.query }));
    let fetchImpl = null;
    let capturedAt = null;
    if (s.nws || s.eccc) {
      const fx = s.eccc
        ? (await import(`../../../fixtures/eccc/${s.eccc}.json`)).default
        : (await import(`../../../fixtures/nws/${s.nws}.json`)).default;
      capturedAt = fx.capturedAt;
      // Shift by whole hours so times keep NWS's own minutes ("9:45 PM", not "9:32 PM")
      const hours = Math.round((Date.now() - Date.parse(fx.capturedAt)) / 3_600_000);
      const body = shiftBody(fx.body, hours * 3_600_000);
      fetchImpl = () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: fx.status < 400, status: fx.status, json: async () => body }), 450);
        });
    }
    return { name, note: s.note, searchData, fetchImpl, capturedAt };
  }
  return null;
}

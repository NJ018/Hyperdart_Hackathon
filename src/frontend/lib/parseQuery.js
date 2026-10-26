// Turns hyperDart searchData into a plain description of what the user asked:
// which place (or "near me"), which hazard, severe-only, yes/no. Pure function.
// planRequest() then decides whether we can ask the NWS at all (coverage check).

import { isHazardWord, matchHazard } from './hazards.js';
import { areaCodeFor, countryName, provinceCodeFor, US_AREAS } from './states.js';
import { liveSourceFor } from './sources.js';

const POINT_COLLECTIONS = ['CITIES', 'ZIP_CODES', 'COUNTY/DISTRICT_ADMIN2', 'COUNTRIES_CAPITAL'];
const NEAR_ME = /\b(near|around)\s+me\b|\bmy\s+(location|area|city)\b|\bnearby\b/i;
const YES_NO = /^\s*(is|are|any)\b|^\s*(do|does)\s+\w+\s+have\b/i;
// "severe" means severe-only, except as part of the event name "severe thunderstorm"
const SEVERE = /\bsevere\b(?!\s+(thunder)?storms?)/i;

/** searchData can be an array (sandbox) or a single object (production withHD). */
export function normalizeSearchData(searchData) {
  const sd = Array.isArray(searchData) ? searchData[0] : searchData;
  return sd && typeof sd === 'object' ? sd : {};
}

/** Which kind of alert the query names: warning / watch / advisory / statement, or null for "any". */
export function findTier(text) {
  const t = String(text || '').toLowerCase();
  if (/\bwarnings?\b/.test(t)) return 'warning';
  if (/\bwatch(es)?\b/.test(t)) return 'watch';
  if (/\badvisor(y|ies)\b/.test(t)) return 'advisory';
  if (/\bstatements?\b/.test(t)) return 'statement';
  return null;
}

const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

function readUserLocation(sd) {
  const ul = sd?.userLocation;
  const pos = ul?.position ?? ul;
  const lat = num(pos?.coords?.latitude ?? pos?.latitude ?? pos?.lat);
  const lon = num(pos?.coords?.longitude ?? pos?.longitude ?? pos?.lon ?? pos?.long);
  if (lat === null || lon === null) return null;
  return {
    lat, lon,
    countryCode: (pos?.countryCode ?? ul?.countryCode ?? null)?.toUpperCase?.() ?? null,
    approximate: (ul?.source ?? 'ip') === 'ip',
  };
}

function placeFromEntity(entity) {
  const geo = entity?.entityInfo?.geo ?? {};
  const countryCode = (geo.countryCode ?? entity?.entityInfo?.country ?? null)?.toUpperCase?.() ?? null;
  const isUS = countryCode === 'US';
  const name = geo.city || geo.state || geo.country || entity.word;
  // stateAbb is only a US postal code for US places (Delhi's is "07", London's "ENG")
  const stateAbb = isUS ? geo.stateAbb || areaCodeFor(geo.state) : null;
  const region = isUS ? stateAbb : geo.state && geo.state !== name ? geo.state : null;
  // "San Juan, Puerto Rico" — not "San Juan, Puerto Rico, Puerto Rico" for territories
  const contextParts = [...new Set([geo.city ? region : null, isUS ? null : countryName(countryCode)].filter(Boolean))];
  return {
    label: name,
    context: contextParts.filter((p) => p !== name).join(', ') || null,
    lat: num(geo.lat),
    lon: num(geo.long ?? geo.lng ?? geo.lon),
    stateAbb,
    stateName: isUS ? geo.state || US_AREAS[stateAbb] || null : geo.state || null,
    countryCode,
    countryName: geo.country || countryName(countryCode),
    tz: geo.tz || null,
    collectionName: entity.collectionName,
    hint: entity.description || null,
    word: entity.word,
  };
}

/**
 * @returns {{
 *   kind: 'point'|'state'|'country'|'nearMe'|'none',
 *   place: object|null, hazard: string|null, tier: string|null,
 *   severeOnly: boolean, yesNo: boolean, rawQuery: string, userLocation: object|null }}
 */
export function parseQuery(searchData) {
  const sd = normalizeSearchData(searchData);
  const rawQuery = String(sd.query ?? sd.queryTerm ?? '').trim();
  const userLocation = readUserLocation(sd);

  const entity = (sd.entities ?? []).find(
    (e) => e?.collectionType === 'HD_LOCATION' && !isHazardWord(e.word),
  );
  // Strip the place name before looking for hazard words ("Storm Lake", "Fire Island")
  const queryWithoutPlace = entity?.word
    ? rawQuery.replace(new RegExp(entity.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ')
    : rawQuery;

  const match = matchHazard(queryWithoutPlace);
  const hazard = match?.key ?? null;
  const base = {
    hazard,
    hazardTerm: match?.term ?? null,
    tier: hazard ? findTier(queryWithoutPlace) : null,
    severeOnly: SEVERE.test(queryWithoutPlace),
    yesNo: YES_NO.test(rawQuery),
    rawQuery,
    userLocation,
  };

  // "near me" wording wins over any entity: the NLU reads "tornado warning near me"
  // as the town of Tornado, WV.
  if (NEAR_ME.test(rawQuery) || !entity) {
    if (NEAR_ME.test(rawQuery) && userLocation) {
      return { ...base, kind: 'nearMe', place: { label: 'your area', ...userLocation, tz: null } };
    }
    return { ...base, kind: NEAR_ME.test(rawQuery) ? 'nearMe' : 'none', place: null };
  }

  const place = placeFromEntity(entity);
  const c = entity.collectionName;
  if (c === 'STATES_ADMIN1') return { ...base, kind: 'state', place };
  if (c === 'COUNTRIES') return { ...base, kind: 'country', place };
  if (POINT_COLLECTIONS.includes(c) || (place.lat !== null && place.lon !== null)) {
    return { ...base, kind: 'point', place };
  }
  return { ...base, kind: 'none', place };
}

const round4 = (n) => Math.round(n * 1e4) / 1e4;

const hasCoords = (place) => place?.lat !== null && place?.lat !== undefined && place?.lon !== null && place?.lon !== undefined;

/**
 * Coverage decision, made before any network call.
 * @returns {{ type:'fetch', request:{source?:'eccc', point?:[number,number], area?:string, province?:string, national?:true} }
 *         | { type:'outside', countryCode, countryName }
 *         | { type:'needLocation', reason:'noUserLocation'|'noPlace'|'noCoordinates' }}
 */
export function planRequest(parsed) {
  const { kind, place } = parsed;
  if (kind === 'none' && !place) return { type: 'needLocation', reason: 'noPlace' };
  if (kind === 'nearMe' && !place) return { type: 'needLocation', reason: 'noUserLocation' };

  const cc = place?.countryCode;
  // Unknown country (e.g. device geolocation): ask the NWS; an out-of-bounds reply means outside.
  const source = cc ? liveSourceFor(cc) : 'nws';
  if (!source) {
    return { type: 'outside', countryCode: cc, countryName: place.countryName || countryName(cc) };
  }

  if (source === 'eccc') {
    const fetch = (r) => ({ type: 'fetch', request: { source: 'eccc', ...r } });
    if (kind === 'country') return fetch({ national: true });
    if (kind === 'state') {
      const province = provinceCodeFor(place.stateName) || provinceCodeFor(place.label);
      if (province) return fetch({ province });
    }
    if (hasCoords(place)) return fetch({ point: [round4(place.lat), round4(place.lon)] });
    return { type: 'needLocation', reason: 'noCoordinates' };
  }

  if (kind === 'country') {
    if (cc === 'US') return { type: 'fetch', request: { national: true } };
    const area = areaCodeFor(cc);
    if (area) return { type: 'fetch', request: { area } };
  }
  if (kind === 'state') {
    const area = place.stateAbb || areaCodeFor(place.stateName) || areaCodeFor(place.label);
    if (area) return { type: 'fetch', request: { area } };
  }
  if (hasCoords(place)) return { type: 'fetch', request: { point: [round4(place.lat), round4(place.lon)] } };
  return { type: 'needLocation', reason: 'noCoordinates' };
}

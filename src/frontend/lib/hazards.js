// All hazard knowledge lives here: query synonyms, which NWS event names belong to
// each hazard, and the icon name the UI shows. Adding a hazard = adding one entry.
// Order matters for classifyEvent(): the first entry whose eventMatch fits wins.

export const HAZARDS = {
  tsunami:    { label: 'Tsunami',       synonyms: ['tsunami'],                                  eventMatch: /tsunami/i,                                     icon: 'Tsunami' },
  flood:      { label: 'Flood',         synonyms: ['flash flood', 'coastal flood', 'flooding', 'flood'], eventMatch: /flood/i,                          icon: 'Flood' },
  heat:       { label: 'Heat',          synonyms: ['extreme heat', 'excessive heat', 'heat wave', 'heat'], eventMatch: /heat/i,                        icon: 'Thermostat' },
  tornado:    { label: 'Tornado',       synonyms: ['tornado', 'tornadoes'],                     eventMatch: /tornado/i,                                     icon: 'Tornado' },
  hurricane:  { label: 'Tropical',      synonyms: ['hurricane', 'tropical storm', 'storm surge', 'typhoon', 'tropical'],
                eventMatch: /hurricane(?! force)|tropical|storm surge|typhoon/i,                                                                     icon: 'Cyclone' },
  winter:     { label: 'Winter & cold', synonyms: ['winter storm', 'winter weather', 'blizzard', 'ice storm', 'freeze', 'frost', 'snow', 'cold', 'wind chill'],
                eventMatch: /winter|blizzard|ice storm|freeze|frost|snow|wind chill|cold/i,                                                          icon: 'AcUnit' },
  airQuality: { label: 'Air quality',   synonyms: ['air quality', 'smoke', 'dust storm', 'dust'], eventMatch: /air quality|smoke|dust|ashfall/i,           icon: 'Masks' },
  fire:       { label: 'Fire weather',  synonyms: ['fire weather', 'red flag', 'wildfire', 'fire'], eventMatch: /red flag|fire/i,                             icon: 'LocalFireDepartment' },
  coastal:    { label: 'Surf & marine', synonyms: ['rip current', 'high surf', 'beach hazards', 'small craft', 'gale', 'marine', 'surf'],
                eventMatch: /rip current|surf|beach|small craft|gale|marine|seas|lakeshore/i,                                                         icon: 'Waves' },
  wind:       { label: 'Wind',          synonyms: ['high wind', 'wind'],                         eventMatch: /wind(?! chill)/i,                             icon: 'Air' },
  storm:      { label: 'Storms',        synonyms: ['severe thunderstorm', 'thunderstorm', 'storm', 'lightning', 'hail'],
                eventMatch: /thunderstorm|storm/i,                                                                                                   icon: 'Thunderstorm' },
  fog:        { label: 'Fog',           synonyms: ['dense fog', 'fog'],                          eventMatch: /fog/i,                                        icon: 'Cloud' },
  avalanche:  { label: 'Avalanche',     synonyms: ['avalanche'],                                 eventMatch: /avalanche/i,                                  icon: 'Landslide' },
};

// [synonym, hazardKey] pairs, longest synonym first, so "flash flood" wins over "flood"
// and "winter storm" wins over "storm".
const SYNONYMS = Object.entries(HAZARDS)
  .flatMap(([key, h]) => h.synonyms.map((s) => [s, key]))
  .sort((a, b) => b[0].length - a[0].length);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Finds the hazard a query asks about: { key, term } (term = the words the user used), or null. */
export function matchHazard(text) {
  const t = String(text || '').toLowerCase();
  for (const [syn, key] of SYNONYMS) {
    if (new RegExp(`\\b${escapeRe(syn)}s?\\b`).test(t)) return { key, term: syn };
  }
  return null;
}

export const findHazardInText = (text) => matchHazard(text)?.key ?? null;

/** True when a word (e.g. an entity the NLU picked up) is itself a hazard term like "Tornado". */
export function isHazardWord(word) {
  const w = String(word || '').trim().toLowerCase();
  return SYNONYMS.some(([syn]) => w === syn || w === `${syn}s`);
}

/** Maps an NWS event name ("Flash Flood Warning") to a hazard key, or 'other'. */
export function classifyEvent(event) {
  for (const [key, h] of Object.entries(HAZARDS)) {
    if (h.eventMatch.test(event || '')) return key;
  }
  return 'other';
}

export const hazardLabel = (key) => HAZARDS[key]?.label ?? 'Weather';
export const hazardIcon = (key) => HAZARDS[key]?.icon ?? 'WarningAmber';

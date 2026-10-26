// US state / territory names and codes, plus which countries the NWS covers.
// Used by parseQuery to turn a place entity into an NWS `area` code.

export const US_AREAS = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
  LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  // Territories the NWS issues alerts for (they also arrive as COUNTRIES entities)
  PR: 'Puerto Rico', VI: 'U.S. Virgin Islands', GU: 'Guam', AS: 'American Samoa', MP: 'Northern Mariana Islands',
};

// Country codes the NWS alerts API covers. UM (minor outlying islands) has no `area` code,
// so it is queried by point only.
export const NWS_COUNTRIES = ['US', 'PR', 'GU', 'VI', 'AS', 'MP', 'UM'];

const NAME_TO_CODE = Object.fromEntries(
  Object.entries(US_AREAS).map(([code, name]) => [name.toLowerCase(), code]),
);

/** "Colorado" → "CO", "co" → "CO"; null when unknown. */
export function areaCodeFor(nameOrCode) {
  const s = String(nameOrCode || '').trim();
  if (US_AREAS[s.toUpperCase()]) return s.toUpperCase();
  return NAME_TO_CODE[s.toLowerCase()] ?? null;
}

export const isCoveredCountry = (cc) => NWS_COUNTRIES.includes(String(cc || '').toUpperCase());

// Canadian provinces and territories (Environment Canada's `province` filter uses these codes)
export const CA_PROVINCES = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick', NL: 'Newfoundland and Labrador',
  NS: 'Nova Scotia', NT: 'Northwest Territories', NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island',
  QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon',
};

const PROVINCE_TO_CODE = Object.fromEntries(
  Object.entries(CA_PROVINCES).map(([code, name]) => [name.toLowerCase(), code]),
);

/** "Quebec" / "Québec" → "QC"; null when unknown. GeoNames gives numeric codes ("10"), so we go by name. */
export function provinceCodeFor(name) {
  const s = String(name || '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (CA_PROVINCES[s.toUpperCase()]) return s.toUpperCase();
  return PROVINCE_TO_CODE[s] ?? null;
}

/** Readable country name from an ISO code ("IN" → "India"), falling back to the code. */
export function countryName(cc) {
  if (!cc) return null;
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(String(cc).toUpperCase()) || cc;
  } catch {
    return cc;
  }
}

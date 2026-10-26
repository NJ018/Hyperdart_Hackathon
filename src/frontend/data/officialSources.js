// Official warning agencies for places the NWS does not cover. Every URL here was
// checked to load (HTTP 200) on 2026-10-26. Countries not listed fall back to the
// WMO Severe Weather Information Centre; MeteoAlarm members also get MeteoAlarm.

const WMO = { name: 'WMO Severe Weather Information Centre', url: 'https://severeweather.wmo.int/', note: 'Worldwide official warnings, collected by the World Meteorological Organization' };
const METEOALARM = { name: 'MeteoAlarm', url: 'https://meteoalarm.org/en/live/', note: 'Official warnings from European national weather services' };

export const OFFICIAL_SOURCES = {
  IN: [
    { name: 'India Meteorological Department', url: 'https://mausam.imd.gov.in/responsive/districtWiseWarning.php', note: 'District-wise weather warnings' },
    { name: 'NDMA SACHET', url: 'https://sachet.ndma.gov.in/', note: 'National Disaster Management Authority alerts portal' },
  ],
  CA: [{ name: 'Environment and Climate Change Canada', url: 'https://weather.gc.ca/?layers=alert', note: 'Public weather alerts' }],
  GB: [{ name: 'Met Office', url: 'https://weather.metoffice.gov.uk/warnings-and-advice/uk-warnings', note: 'UK weather warnings' }],
  AU: [{ name: 'Bureau of Meteorology', url: 'https://www.bom.gov.au/weather-and-climate/warnings-and-alerts', note: 'Warnings and alerts' }],
  JP: [{ name: 'Japan Meteorological Agency', url: 'https://www.jma.go.jp/bosai/map.html#contents=warning&lang=en', note: 'Warnings and advisories' }],
  NZ: [{ name: 'MetService', url: 'https://www.metservice.com/warnings/home', note: 'Severe weather warnings' }],
  PH: [{ name: 'PAGASA', url: 'https://www.pagasa.dost.gov.ph/', note: 'Philippine weather and typhoon bulletins' }],
  ZA: [{ name: 'South African Weather Service', url: 'https://www.weathersa.co.za/', note: 'Warnings and forecasts' }],
  SG: [{ name: 'National Environment Agency', url: 'https://www.nea.gov.sg/weather', note: 'Singapore weather' }],
  HK: [{ name: 'Hong Kong Observatory', url: 'https://www.hko.gov.hk/en/wxinfo/dailywx/wxwarntoday.htm', note: 'Warnings in force' }],
  KR: [{ name: 'Korea Meteorological Administration', url: 'https://www.weather.go.kr/w/special-report/overall.do', note: 'Weather warnings' }],
  CN: [{ name: 'National Meteorological Center (CMA)', url: 'https://www.nmc.cn/publish/alarm.html', note: 'Weather warnings' }],
  TW: [{ name: 'Central Weather Administration', url: 'https://www.cwa.gov.tw/V8/E/P/Warning/W26.html', note: 'Weather warnings' }],
  BD: [{ name: 'Bangladesh Meteorological Department', url: 'https://www.bmd.gov.bd/', note: 'Forecasts and warnings' }],
  PK: [{ name: 'Pakistan Meteorological Department', url: 'https://www.pmd.gov.pk/', note: 'Forecasts and warnings' }],
  TH: [{ name: 'Thai Meteorological Department', url: 'https://www.tmd.go.th/en/', note: 'Forecasts and warnings' }],
  ID: [{ name: 'BMKG', url: 'https://www.bmkg.go.id/', note: 'Indonesian weather and earthquake warnings' }],
  MY: [{ name: 'MetMalaysia', url: 'https://www.met.gov.my/', note: 'Weather warnings' }],
  AE: [{ name: 'National Center of Meteorology', url: 'https://www.ncm.gov.ae/', note: 'UAE weather alerts' }],
  IL: [{ name: 'Israel Meteorological Service', url: 'https://ims.gov.il/en', note: 'Forecasts and warnings' }],
  BR: [{ name: 'INMET', url: 'https://portal.inmet.gov.br/', note: 'Brazilian weather warnings' }],
  IE: [{ name: 'Met Éireann', url: 'https://www.met.ie/warnings', note: 'Irish weather warnings' }],
  FR: [{ name: 'Météo-France Vigilance', url: 'https://vigilance.meteofrance.fr/fr', note: 'Weather vigilance map' }],
  ES: [{ name: 'AEMET', url: 'https://www.aemet.es/en/eltiempo/prediccion/avisos', note: 'Spanish weather warnings' }],
  DE: [{ name: 'Deutscher Wetterdienst', url: 'https://www.dwd.de/EN/Home/home_node.html', note: 'German weather service' }],
  CH: [{ name: 'MeteoSwiss', url: 'https://www.meteoswiss.admin.ch/', note: 'Swiss weather warnings' }],
  IT: [{ name: 'Aeronautica Militare – Servizio Meteo', url: 'https://www.meteoam.it/', note: 'Italian weather service' }],
  NL: [{ name: 'KNMI', url: 'https://www.knmi.nl/', note: 'Dutch weather warnings' }],
  SE: [{ name: 'SMHI', url: 'https://www.smhi.se/', note: 'Swedish weather warnings' }],
  NO: [{ name: 'MET Norway', url: 'https://www.met.no/en', note: 'Norwegian weather warnings' }],
};

// MeteoAlarm member countries
const METEOALARM_MEMBERS = ['AT', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS',
  'IE', 'IL', 'IT', 'LV', 'LT', 'LU', 'MT', 'MD', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RS', 'SK', 'SI', 'ES',
  'SE', 'CH', 'UA', 'GB'];

/** Official sources to show for a country code, most specific first; never empty. */
export function sourcesFor(countryCode) {
  const cc = String(countryCode || '').toUpperCase();
  const list = [...(OFFICIAL_SOURCES[cc] ?? [])];
  if (METEOALARM_MEMBERS.includes(cc)) list.push(METEOALARM);
  list.push(WMO);
  return list;
}

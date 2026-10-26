// Our own severity palette (not the NWS colour table), one set per mode.
// Validated with the dataviz palette checker (OKLCH lightness band, chroma floor,
// colour-blind separation of adjacent severities, contrast on the card surface).
// Colour never carries meaning alone: every use sits beside a text label and/or icon,
// and text itself always uses the theme's text colours.

export const SEVERITY_LEVELS = ['Extreme', 'Severe', 'Moderate', 'Minor'];

const LIGHT = {
  Extreme: '#a3238f', // magenta-crimson
  Severe: '#dc4c17', // red-orange
  Moderate: '#e9a000', // amber
  Minor: '#1f8fa8', // blue-teal
  Unknown: '#6b7686', // slate
  None: '#9aa1ab', // neutral grey
};

const DARK = {
  Extreme: '#b54aa8',
  Severe: '#d63d35',
  Moderate: '#b0921f',
  Minor: '#2b9db2',
  Unknown: '#8b95a5',
  None: '#5f6670',
};

/** Mark colour for a severity ('None' or null → neutral grey). */
export function severityColor(severity, mode = 'light') {
  const p = mode === 'dark' ? DARK : LIGHT;
  return p[severity] ?? p.None;
}

/** Translucent wash of a severity colour, for backgrounds behind text-token labels. */
export function severityWash(severity, mode = 'light', alpha = 0.14) {
  const hex = severityColor(severity, mode).replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Official CAP meanings, shown in plain words in the detail view
export const SEVERITY_MEANING = {
  Extreme: 'Extraordinary threat to life or property',
  Severe: 'Significant threat to life or property',
  Moderate: 'Possible threat to life or property',
  Minor: 'Minimal to no known threat to life or property',
  Unknown: 'Severity not stated',
};

export const URGENCY_WORDS = {
  Immediate: 'Act now',
  Expected: 'Act soon',
  Future: 'Prepare for later',
  Past: 'No longer expected',
  Unknown: 'Timing not stated',
};

export const CERTAINTY_WORDS = {
  Observed: 'Observed / happening',
  Likely: 'Likely (over 50% chance)',
  Possible: 'Possible',
  Unlikely: 'Unlikely',
  Unknown: 'Certainty not stated',
};

export const TIER_GLOSSARY = {
  warning: 'Warning — happening or about to happen. Act now.',
  watch: 'Watch — conditions are possible. Be prepared.',
  advisory: 'Advisory — less serious, but use caution.',
  statement: 'Statement — information about a developing or ongoing hazard.',
  other: 'Official notice from the National Weather Service.',
};

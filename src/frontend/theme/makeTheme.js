// Builds the MUI theme from the host's UIOptions.themeName: light, dark or lightsOut
// (true black with dimmer borders). Kept separate from the host theme so the card looks
// the same wherever it is embedded.

import { createTheme } from '@mui/material/styles';

const SURFACES = {
  light: { paper: '#ffffff', raised: '#f6f7f9', border: 'rgba(15, 23, 42, 0.10)', text: '#111827', text2: '#4b5563', text3: '#6b7280' },
  dark: { paper: '#232323', raised: '#2c2c2c', border: 'rgba(255, 255, 255, 0.10)', text: '#f3f4f6', text2: '#c3c7ce', text3: '#9ba1aa' },
  lightsOut: { paper: '#000000', raised: '#0d0d0d', border: 'rgba(255, 255, 255, 0.07)', text: '#ededed', text2: '#b5b9bf', text3: '#8d929a' },
};

export function makeTheme(themeName = 'light') {
  const name = SURFACES[themeName] ? themeName : 'light';
  const s = SURFACES[name];
  const mode = name === 'light' ? 'light' : 'dark';
  return createTheme({
    palette: {
      mode,
      primary: { main: mode === 'light' ? '#1d4ed8' : '#8ab4ff' },
      background: { default: 'transparent', paper: s.paper },
      text: { primary: s.text, secondary: s.text2, disabled: s.text3 },
      divider: s.border,
      surface: { raised: s.raised, border: s.border, muted: s.text3 },
    },
    themeName: name,
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: 14,
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
    },
    transitions: { duration: { shortest: 120, shorter: 150, short: 180 } },
  });
}

// Small severity and tier building blocks. Colour always sits beside a text label;
// tier is encoded by fill pattern (solid / striped / outline / dashed) so it reads
// without colour too. The same patterns are used in the timeline and on the map.
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { SEVERITY_LEVELS, severityColor, severityWash } from '../theme/severity.js';

/** CSS for a mark of a given tier + severity (timeline bars, swatches). */
export function tierFill(tier, severity, mode) {
  const c = severityColor(severity, mode);
  const wash = severityWash(severity, mode, mode === 'dark' ? 0.22 : 0.16);
  if (tier === 'warning') return { background: c };
  if (tier === 'watch') return { background: `repeating-linear-gradient(135deg, ${c} 0 3px, ${wash} 3px 6px)` };
  if (tier === 'advisory') return { background: wash, boxShadow: `inset 0 0 0 1.5px ${c}` };
  return { background: wash, outline: `1.5px dashed ${c}`, outlineOffset: '-1.5px' };
}

/** 4px strip along the top of the card, in the colour of the worst alert (grey when none). */
export function SignalBar({ severity, pending = false }) {
  const { palette } = useTheme();
  return (
    <Box
      aria-hidden="true"
      sx={{
        height: 4,
        background: pending
          ? `repeating-linear-gradient(90deg, ${palette.divider} 0 12px, transparent 12px 20px)`
          : severityColor(severity ?? 'None', palette.mode),
        transition: 'background 150ms ease',
      }}
    />
  );
}

/** Four-step meter: Minor → Extreme, lit up to the given severity, with its name in text. */
export function SeverityMeter({ severity, label, compact = false }) {
  const { palette } = useTheme();
  const level = SEVERITY_LEVELS.indexOf(severity); // 0 = Extreme … 3 = Minor, -1 = none/unknown
  const steps = [...SEVERITY_LEVELS].reverse(); // Minor, Moderate, Severe, Extreme
  const text = label ?? (level === -1 ? (severity === 'Unknown' ? 'Unknown' : 'None') : severity);
  return (
    <Box
      role="img"
      aria-label={`Seriousness: ${text}`}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}
    >
      <Box sx={{ display: 'flex', gap: '2px' }}>
        {steps.map((s) => {
          const lit = level !== -1 && SEVERITY_LEVELS.indexOf(s) >= level;
          return (
            <Box
              key={s}
              sx={{
                width: compact ? 10 : 14,
                height: 8,
                borderRadius: '2px',
                background: lit ? severityColor(severity, palette.mode) : palette.divider,
              }}
            />
          );
        })}
      </Box>
      <Box component="span" sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', letterSpacing: 0.2 }}>
        {text}
      </Box>
    </Box>
  );
}

/** "● Severe" — a colour dot beside a text label. */
export function SeverityTag({ severity, size = 'md' }) {
  const { palette } = useTheme();
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.75,
        px: 1, py: size === 'sm' ? 0.1 : 0.25, borderRadius: 999,
        background: severityWash(severity, palette.mode, palette.mode === 'dark' ? 0.2 : 0.12),
        fontSize: size === 'sm' ? 11.5 : 12.5, fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap',
      }}
    >
      <Box component="span" aria-hidden="true" sx={{ width: 8, height: 8, borderRadius: '50%', background: severityColor(severity, palette.mode) }} />
      {severity}
    </Box>
  );
}

/** Small legend swatch for a tier pattern. */
export function TierSwatch({ tier, severity = 'Severe' }) {
  const { palette } = useTheme();
  return (
    <Box
      component="span"
      aria-hidden="true"
      sx={{ display: 'inline-block', width: 18, height: 10, borderRadius: '3px', verticalAlign: 'middle', ...tierFill(tier, severity, palette.mode) }}
    />
  );
}

export const TIER_LABEL = { warning: 'Warning', watch: 'Watch', advisory: 'Advisory', statement: 'Statement', other: 'Notice' };

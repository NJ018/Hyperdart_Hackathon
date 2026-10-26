// The most serious alert, answering what / how serious / until when / where in one card.
import { Box, ButtonBase, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HazardIcon from './HazardIcon.jsx';
import { SeverityTag, TIER_LABEL } from './Severity.jsx';
import { severityColor, severityWash, URGENCY_WORDS } from '../theme/severity.js';
import { alertStatus } from '../lib/normalizeAlert.js';
import { formatDuration, formatTime, toMs } from '../lib/time.js';

/** "Warning · Likely · Act now" (NWS) or "Warning · Yellow alert · High confidence" (Environment Canada). */
export function seriousnessLine(alert) {
  if (alert.source === 'eccc') {
    const e = alert.eccc ?? {};
    return [TIER_LABEL[alert.tier], e.riskColour && `${capitalise(e.riskColour)} alert`, e.confidence && `${e.confidence} confidence`].filter(Boolean).join(' · ');
  }
  return `${TIER_LABEL[alert.tier]} · ${alert.certainty} · ${URGENCY_WORDS[alert.urgency] ?? alert.urgency}`;
}

const capitalise = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

export function timeSummary(alert, { tz, now }) {
  const status = alertStatus(alert, now);
  const ends = toMs(alert.ends);
  if (status === 'upcoming') {
    const start = toMs(alert.onset);
    return {
      lead: `Starts ${formatTime(alert.onset, { tz, now })}`,
      sub: `in ${formatDuration(start - now)} · ${alert.ends ? `until ${formatTime(alert.ends, { tz, now })}` : 'until further notice'}`,
      progress: null,
    };
  }
  if (!alert.ends) return { lead: 'In effect until further notice', sub: 'No end time given yet', progress: null };
  const start = toMs(alert.onset);
  const progress = Number.isNaN(start) || ends <= start ? null : Math.min(1, Math.max(0, (now - start) / (ends - start)));
  return {
    lead: `In effect until ${formatTime(alert.ends, { tz, now })}`,
    sub: `${formatDuration(ends - now)} left`,
    progress,
  };
}

export default function AlertHero({ alert, tz, now, onOpen, compact }) {
  const { palette } = useTheme();
  const color = severityColor(alert.severity, palette.mode);
  const t = timeSummary(alert, { tz, now });
  const areas = alert.areas.slice(0, compact ? 2 : 3);
  const more = alert.areas.length - areas.length;

  return (
    <ButtonBase
      onClick={() => onOpen(alert)}
      aria-label={`${alert.event}, ${alert.severity}. ${t.lead}. Open details and what to do.`}
      sx={{
        display: 'block', width: '100%', textAlign: 'left', borderRadius: 3, overflow: 'hidden',
        bgcolor: 'surface.raised', border: '1px solid', borderColor: 'divider',
        transition: 'border-color 150ms ease, transform 150ms ease',
        '&:hover': { borderColor: color },
        '&.Mui-focusVisible': { outline: `2px solid ${palette.primary.main}`, outlineOffset: 2 },
      }}
    >
      <Box sx={{ display: 'flex', gap: 1.5, p: compact ? 1.5 : 2, pb: 1.25, background: `linear-gradient(180deg, ${severityWash(alert.severity, palette.mode, 0.10)}, transparent)` }}>
        <Box sx={{ flex: 'none', width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: severityWash(alert.severity, palette.mode, 0.18), color: 'text.primary' }}>
          <HazardIcon hazard={alert.hazard} sx={{ fontSize: 24 }} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography component="h3" sx={{ fontSize: compact ? 17 : 19, fontWeight: 700, lineHeight: 1.2 }}>{alert.event}</Typography>
            <SeverityTag severity={alert.severity} />
          </Box>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5, letterSpacing: 0.2 }}>
            {seriousnessLine(alert)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: compact ? 1.5 : 2, pb: compact ? 1.5 : 1.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap', fontVariantNumeric: 'tabular-nums' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 650 }}>{t.lead}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{t.sub}</Typography>
        </Box>
        {t.progress !== null && (
          <Box aria-hidden="true" sx={{ mt: 0.75, height: 4, borderRadius: 2, bgcolor: 'divider', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${Math.max(2, t.progress * 100)}%`, bgcolor: color, borderRadius: 2 }} />
          </Box>
        )}
        <Typography sx={{ mt: 1.25, fontSize: 13.5, color: 'text.secondary', lineHeight: 1.45 }}>
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>Where: </Box>
          {areas.join(' · ')}
          {more > 0 && ` · +${more} more`}
        </Typography>
        <Box sx={{ mt: 1.25, display: 'inline-flex', alignItems: 'center', gap: 0.25, fontSize: 13.5, fontWeight: 650, color: 'primary.main' }}>
          What to do now & official text
          <ChevronRightIcon sx={{ fontSize: 18 }} aria-hidden="true" />
        </Box>
      </Box>
    </ButtonBase>
  );
}

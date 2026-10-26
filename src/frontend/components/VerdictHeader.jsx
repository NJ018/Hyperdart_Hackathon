// The answer, first: place line, a big Yes / No when the query asked one, the
// headline sentence (announced to screen readers) and the seriousness meter.
import { Box, Skeleton, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PlaceOutlinedIcon from '@mui/icons-material/LocationOn';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { SeverityMeter } from './Severity.jsx';
import { severityColor } from '../theme/severity.js';

export default function VerdictHeader({ verdict, placeLine, approximate, demo, compact }) {
  const { palette } = useTheme();
  const loading = verdict.state === 'loading';
  const showMeter = ['active', 'noMatch', 'none'].includes(verdict.state);

  return (
    <Box component="header" sx={{ px: compact ? 2 : 2.5, pt: compact ? 1.75 : 2.25, pb: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.25, minHeight: 22 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary', minWidth: 0, flex: '1 1 auto' }}>
          {approximate !== undefined ? <MyLocationIcon sx={{ fontSize: 16 }} aria-hidden="true" /> : <PlaceOutlinedIcon sx={{ fontSize: 16 }} aria-hidden="true" />}
          <Typography component="p" sx={{ fontSize: 13, fontWeight: 600, letterSpacing: 0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {placeLine}
          </Typography>
          {approximate && (
            <Tooltip title="Based on your network's approximate location, not GPS">
              <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary', whiteSpace: 'nowrap' }}>· approximate</Typography>
            </Tooltip>
          )}
        </Box>
        {demo && (
          <Tooltip title={demo.title}>
            <Box component="span" sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, px: 0.9, py: 0.2, borderRadius: 1, border: '1px dashed', borderColor: 'text.secondary', color: 'text.secondary' }}>
              DEMO DATA
            </Box>
          </Tooltip>
        )}
        {showMeter && !compact && <SeverityMeter severity={verdict.severity ?? 'None'} label={verdict.severity ? undefined : 'No alerts'} />}
      </Box>

      <Box aria-live="polite" aria-atomic="true" aria-busy={loading} sx={{ display: 'flex', gap: compact ? 1.25 : 1.75, alignItems: 'flex-start' }}>
        {verdict.answer && (
          <Box
            sx={{
              flex: 'none', fontSize: compact ? 26 : 32, lineHeight: 1, fontWeight: 800, letterSpacing: -0.5,
              pb: 0.5, mt: 0.25,
              borderBottom: `3px solid ${verdict.answer === 'Yes' ? severityColor(verdict.severity, palette.mode) : palette.divider}`,
            }}
          >
            {verdict.answer}
          </Box>
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {loading ? (
            <>
              <Skeleton variant="text" sx={{ fontSize: compact ? 21 : 25, width: '85%' }} />
              <Skeleton variant="text" sx={{ fontSize: 15, width: '55%' }} />
            </>
          ) : (
            <>
              <Typography component="h2" sx={{ fontSize: compact ? 20 : 24, lineHeight: 1.25, fontWeight: 650, letterSpacing: -0.2, fontVariantNumeric: 'tabular-nums', textWrap: 'balance' }}>
                {verdict.headline}
              </Typography>
              {verdict.detail && (
                <Typography sx={{ mt: 0.75, fontSize: verdict.state === 'noMatch' ? (compact ? 17 : 19) : 14.5, fontWeight: verdict.state === 'noMatch' ? 600 : 400, color: verdict.state === 'noMatch' ? 'text.primary' : 'text.secondary', lineHeight: 1.4, fontVariantNumeric: 'tabular-nums' }}>
                  {verdict.detail}
                </Typography>
              )}
            </>
          )}
        </Box>
      </Box>
      {showMeter && compact && (
        <Box sx={{ mt: 1.25 }}>
          <SeverityMeter compact severity={verdict.severity ?? 'None'} label={verdict.severity ? undefined : 'No alerts'} />
        </Box>
      )}
    </Box>
  );
}

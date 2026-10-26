// "National Weather Service · checked 11:54 AM CDT · Updated 3 min ago ↻", plus a
// notice when a refresh failed and we are still showing the previous result.
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { formatInstant, freshness } from '../lib/time.js';

export default function SourceLine({ fetchedAt, now, tz, onRefresh, refreshing, staleSince, source = 'National Weather Service' }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', columnGap: 0.75, rowGap: 0, flexWrap: 'wrap', color: 'text.secondary' }}>
      <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 650 }}>Source: {source}</Typography>
      {fetchedAt && (
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          <Typography component="span" sx={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
            Checked {formatInstant(fetchedAt, { tz })} · {freshness(fetchedAt, Math.max(now, fetchedAt))}
          </Typography>
          {onRefresh && (
            <Tooltip title="Check again now">
              <span>
                <IconButton size="small" onClick={onRefresh} disabled={refreshing} aria-label="Check again now">
                  <RefreshIcon sx={{ fontSize: 17, animation: refreshing ? 'hu-spin 0.9s linear infinite' : 'none', '@keyframes hu-spin': { to: { transform: 'rotate(360deg)' } } }} />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      )}
      {staleSince && (
        <Typography role="status" sx={{ width: '100%', fontSize: 12.5, color: 'text.primary', fontWeight: 600 }}>
          Couldn't refresh — showing what {source} reported at {formatInstant(fetchedAt, { tz })}.
        </Typography>
      )}
    </Box>
  );
}

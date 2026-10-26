// Bodies for the states that are not a list of alerts: none, outside coverage,
// error and need-location. None of them ever implies that a place is free of danger.
import { Box, Button, Link, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { sourcesFor } from '../data/officialSources.js';
import { sourceInfo } from '../lib/sources.js';

const linkSx = { display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 13.5, fontWeight: 600 };

export function NoAlertsBody({ lat, lon, source = 'nws' }) {
  if (source === 'eccc') {
    return (
      <Link href={sourceInfo('eccc').home} target="_blank" rel="noopener noreferrer" sx={linkSx}>
        See Environment Canada's alert map <OpenInNewIcon sx={{ fontSize: 15 }} />
      </Link>
    );
  }
  if (lat === null || lat === undefined) return null;
  return (
    <Link href={`https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lon}`} target="_blank" rel="noopener noreferrer" sx={linkSx}>
      See the NWS forecast for this spot <OpenInNewIcon sx={{ fontSize: 15 }} />
    </Link>
  );
}

export function OutsideCoverageBody({ countryCode, countryName }) {
  const sources = sourcesFor(countryCode);
  return (
    <Box>
      <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'text.secondary', mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <TravelExploreIcon sx={{ fontSize: 18 }} aria-hidden="true" />
        Check the official source{countryName ? ` for ${countryName}` : ''}
      </Typography>
      <Box sx={{ display: 'grid', gap: 1 }}>
        {sources.map((s) => (
          <Link
            key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" underline="none"
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', color: 'text.primary', transition: 'border-color 150ms ease', '&:hover': { borderColor: 'primary.main' } }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 14.5, fontWeight: 650 }}>{s.name}</Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{s.note}</Typography>
            </Box>
            <OpenInNewIcon sx={{ fontSize: 18, color: 'text.secondary' }} aria-label="opens in a new tab" />
          </Link>
        ))}
      </Box>
    </Box>
  );
}

export function ErrorBody({ onRetry, retrying, error, source = 'nws' }) {
  const src = sourceInfo(source);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <Button variant="contained" disableElevation startIcon={<RefreshIcon />} onClick={onRetry} disabled={retrying}>
        {retrying ? 'Trying again…' : 'Try again'}
      </Button>
      <Link href={src.home} target="_blank" rel="noopener noreferrer" sx={linkSx}>
        Open {src.homeLabel} <OpenInNewIcon sx={{ fontSize: 15 }} />
      </Link>
      {error && (
        <Typography sx={{ width: '100%', fontSize: 12, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CloudOffIcon sx={{ fontSize: 14 }} aria-hidden="true" />
          {error.type === 'timeout' ? `${src.short} did not answer within 8 seconds.` : error.type === 'network' ? 'Network unavailable.' : `${src.short} responded: ${error.detail}`}
        </Typography>
      )}
    </Box>
  );
}

export function LocateButton({ onLocate, status }) {
  return (
    <Box>
      <Button variant="contained" disableElevation startIcon={<MyLocationIcon />} onClick={onLocate} disabled={status === 'pending'}>
        {status === 'pending' ? 'Finding you…' : 'Use my location'}
      </Button>
      {status === 'denied' && (
        <Typography sx={{ mt: 0.75, fontSize: 12.5, color: 'text.secondary' }}>
          Location isn't available here. Pick a place below instead.
        </Typography>
      )}
    </Box>
  );
}

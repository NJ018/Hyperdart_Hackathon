// Next-question chips. Each one starts a new search in the host (searchQuery).
import { Box, Chip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export default function FollowUpChips({ queries, onSearch }) {
  if (!queries?.length) return null;
  return (
    <Box component="nav" aria-label="Related searches" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {queries.map((q) => (
        <Chip key={q} label={q} icon={<SearchIcon sx={{ fontSize: 16 }} />} size="small" variant="outlined" clickable onClick={() => onSearch(q)} sx={{ height: 30, fontSize: 13 }} />
      ))}
    </Box>
  );
}

/** Picks useful follow-up queries for a result. */
export function followUps({ parsed, state, userInUS }) {
  const p = parsed.place;
  const out = [];
  const stateName = p?.stateName && ['US', 'CA'].includes(p.countryCode) ? p.stateName : null;
  if (state === 'needLocation') return ['weather alerts in Houston', 'is there a heat advisory in Phoenix', 'flood warnings in Colorado', 'weather alerts near me'];
  if (state === 'outside') {
    if (userInUS && parsed.kind !== 'nearMe') out.push('weather alerts near me');
    out.push('weather alerts in Houston', 'severe weather alerts in Alaska');
    return out;
  }
  if (parsed.kind === 'point' && stateName) out.push(`weather alerts in ${stateName}`);
  if (parsed.kind === 'state' && !parsed.severeOnly) out.push(`severe weather alerts in ${p.label}`);
  if (parsed.kind === 'state' && (parsed.severeOnly || parsed.hazard)) out.push(`weather alerts in ${p.label}`);
  if (parsed.kind === 'country') out.push('flood warnings in Texas', 'severe weather alerts in Alaska');
  if (parsed.kind !== 'nearMe') out.push('weather alerts near me');
  return out.slice(0, 3);
}

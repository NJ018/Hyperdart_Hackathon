// Compact rows for the remaining alerts. Point views list each alert; state and
// national views group by event ("Flood Warning × 5") and expand on tap.
import { useState } from 'react';
import { Box, ButtonBase, Collapse, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/KeyboardArrowDown';
import HazardIcon from './HazardIcon.jsx';
import { SeverityTag, TierSwatch } from './Severity.jsx';
import { groupByEvent } from '../lib/group.js';
import { untilPhrase } from '../lib/verdict.js';
import { formatTime } from '../lib/time.js';

const rowSx = (palette) => ({
  display: 'flex', alignItems: 'center', gap: 1.25, width: '100%', textAlign: 'left',
  px: 1.25, py: 1, borderRadius: 2,
  transition: 'background-color 150ms ease',
  '&:hover': { bgcolor: 'surface.raised' },
  '&.Mui-focusVisible': { outline: `2px solid ${palette.primary.main}`, outlineOffset: -2 },
});

function AlertRow({ alert, tz, now, onOpen, indent = false }) {
  const { palette } = useTheme();
  const areas = alert.areas.join(' · ');
  const oneLine = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
  return (
    <ButtonBase onClick={() => onOpen(alert)} sx={{ ...rowSx(palette), pl: indent ? 5 : 1.25 }}>
      {!indent && <HazardIcon hazard={alert.hazard} sx={{ fontSize: 20, color: 'text.secondary', flex: 'none' }} />}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 650, lineHeight: 1.3, ...(indent ? oneLine : {}) }}>{indent ? areas : alert.event}</Typography>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.35, fontVariantNumeric: 'tabular-nums' }}>
          {capitalise(untilPhrase(alert, { tz, now }))}
        </Typography>
        {!indent && areas && (
          <Typography title={areas} sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.35, ...oneLine }}>{areas}</Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 'none' }}>
        <TierSwatch tier={alert.tier} severity={alert.severity} />
        <SeverityTag severity={alert.severity} size="sm" />
      </Box>
      <ChevronRightIcon sx={{ fontSize: 18, color: 'text.secondary', flex: 'none' }} aria-hidden="true" />
    </ButtonBase>
  );
}

function GroupRow({ group, tz, now, onOpen }) {
  const { palette } = useTheme();
  const [open, setOpen] = useState(false);
  if (group.count === 1) return <AlertRow alert={group.top} tz={tz} now={now} onOpen={onOpen} />;
  const until = group.ends ? `latest until ${formatTime(group.ends, { tz, now })}` : 'some until further notice';
  return (
    <Box>
      <ButtonBase onClick={() => setOpen((o) => !o)} aria-expanded={open} sx={rowSx(palette)}>
        <HazardIcon hazard={group.hazard} sx={{ fontSize: 20, color: 'text.secondary', flex: 'none' }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 650, lineHeight: 1.3 }}>
            {group.event} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>× {group.count}</Box>
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.35 }}>
            {group.areas.length} {group.areas.length === 1 ? 'area' : 'areas'} · {until}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 'none' }}>
          <TierSwatch tier={group.tier} severity={group.severity} />
          <SeverityTag severity={group.severity} size="sm" />
        </Box>
        <ExpandMoreIcon sx={{ fontSize: 20, color: 'text.secondary', flex: 'none', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }} aria-hidden="true" />
      </ButtonBase>
      <Collapse in={open} unmountOnExit>
        {group.alerts.map((a) => <AlertRow key={a.id} alert={a} tz={tz} now={now} onOpen={onOpen} indent />)}
      </Collapse>
    </Box>
  );
}

export default function AlertList({ alerts, grouped, tz, now, onOpen, title, limit = 8 }) {
  const [showAll, setShowAll] = useState(false);
  if (!alerts.length) return null;
  const items = grouped ? groupByEvent(alerts) : alerts.map((a) => ({ key: a.id, count: 1, top: a }));
  const visible = showAll ? items : items.slice(0, limit);
  return (
    <Box component="section" aria-label={title}>
      {title && (
        <Typography component="h3" sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'text.secondary', px: 1.25, mb: 0.5 }}>
          {title}
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {visible.map((g) => <GroupRow key={g.key} group={g} tz={tz} now={now} onOpen={onOpen} />)}
      </Box>
      {items.length > limit && (
        <ButtonBase onClick={() => setShowAll((s) => !s)} sx={{ mt: 0.5, px: 1.25, py: 0.75, borderRadius: 2, fontSize: 13, fontWeight: 650, color: 'primary.main' }}>
          {showAll ? 'Show fewer' : `Show all ${items.length}`}
        </ButtonBase>
      )}
    </Box>
  );
}

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Top-level component: searchData → parse → coverage plan → fetch → verdict → layout.
// States: loading → (active | noMatch | none | outside | error | needLocation).
// Signals componentLoaded() once, after the first final state has rendered.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Collapse, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';

import { makeTheme } from './theme/makeTheme.js';
import { parseQuery, planRequest } from './lib/parseQuery.js';
import { prepareAlerts, splitMarine } from './lib/pipeline.js';
import { applyQuery } from './lib/filterHazard.js';
import { buildVerdict } from './lib/verdict.js';
import { runSearch, signalLoadedOnce } from './lib/host.js';
import { countByState } from './lib/group.js';
import { US_AREAS } from './lib/states.js';
import { sourceInfo } from './lib/sources.js';
import { useAlerts } from './hooks/useAlerts.js';
import { useNow } from './hooks/useNow.js';
import { useElementWidth } from './hooks/useElementWidth.js';
import { useDemoFixture } from './hooks/useDemoFixture.js';

import VerdictHeader from './components/VerdictHeader.jsx';
import AlertHero from './components/AlertHero.jsx';
import AlertList from './components/AlertList.jsx';
import AlertDetail from './components/AlertDetail.jsx';
import TimelineRibbon from './components/TimelineRibbon.jsx';
import SourceLine from './components/SourceLine.jsx';
import FollowUpChips, { followUps } from './components/FollowUpChips.jsx';
import MapSlot from './components/MapSlot.jsx';
import { SignalBar } from './components/Severity.jsx';
import { ErrorBody, LocateButton, NoAlertsBody, OutsideCoverageBody } from './components/States.jsx';

function placeLineFor(parsed, preciseLocation) {
  if (parsed.kind === 'nearMe') return preciseLocation ? 'Near you · device location' : 'Near you';
  if (!parsed.place) return 'Live weather alerts';
  return [parsed.place.label, parsed.place.context].filter(Boolean).join(', ');
}

function useGeolocation(resetKey) {
  const [geo, setGeo] = useState({ status: 'idle', coords: null });
  useEffect(() => setGeo({ status: 'idle', coords: null }), [resetKey]);
  const locate = useCallback(() => {
    setGeo({ status: 'pending', coords: null });
    try {
      // Iframes may block geolocation; any failure keeps the IP-based result.
      navigator.geolocation.getCurrentPosition(
        (pos) => setGeo({ status: 'ok', coords: { lat: pos.coords.latitude, lon: pos.coords.longitude } }),
        () => setGeo({ status: 'denied', coords: null }),
        { timeout: 10_000, maximumAge: 300_000 },
      );
    } catch {
      setGeo({ status: 'denied', coords: null });
    }
  }, []);
  return [geo, locate];
}

export default function HeadsUp(props) {
  const UIOptions = props.UIOptions ?? {};
  const theme = useMemo(() => makeTheme(UIOptions.themeName), [UIOptions.themeName]);
  const format = UIOptions.format === 'sidebar' ? 'sidebar' : 'mainline';

  const rootRef = useRef(null);
  const width = useElementWidth(rootRef, format === 'sidebar' ? 400 : 700);
  const compact = width < 480;

  // 1. What was asked (demo fixtures replace searchData in the sandbox only)
  const demo = useDemoFixture(UIOptions);
  const searchData = demo.status === 'on' ? demo.searchData : props.searchData;
  const parsedBase = useMemo(() => parseQuery(searchData), [searchData]);
  const [geo, locate] = useGeolocation(parsedBase.rawQuery);
  const parsed = useMemo(() => {
    if (!geo.coords || parsedBase.kind !== 'nearMe') return parsedBase;
    return { ...parsedBase, place: { label: 'your location', ...geo.coords, approximate: false, countryCode: null, tz: null } };
  }, [parsedBase, geo.coords]);
  const plan = useMemo(() => planRequest(parsed), [parsed]);
  const national = parsed.kind === 'country' && parsed.place?.countryCode === 'US';

  // 2. Fetch (only when the place is covered)
  let request = null;
  if (demo.status !== 'loading' && plan.type === 'fetch') {
    request = national && !parsed.hazard ? { ...plan.request, severity: 'Extreme,Severe' } : plan.request;
  }
  const data = useAlerts(request, { fetchImpl: demo.status === 'on' ? demo.fetchImpl : undefined });
  const now = useNow();

  let phase = 'loading';
  if (demo.status === 'loading') phase = 'loading';
  else if (plan.type === 'needLocation') phase = 'needLocation';
  else if (plan.type === 'outside') phase = 'outside';
  else if (data.status === 'error') phase = data.error?.type === 'outOfBounds' ? 'outside' : 'error';
  else if (data.status === 'ready') phase = 'ready';

  // 3. Shape the answer
  const tz = parsed.place?.tz ?? null;
  const source = plan.type === 'fetch' ? plan.request.source ?? 'nws' : 'nws';
  const alerts = useMemo(() => (data.status === 'ready' ? prepareAlerts(data.features, now, source) : []), [data.status, data.features, now, source]);
  const { land, marine } = useMemo(() => (national ? splitMarine(alerts) : { land: alerts, marine: [] }), [alerts, national]);
  const split = useMemo(() => applyQuery(land, parsed), [land, parsed]);
  const outsidePlan = plan.type === 'outside' ? plan : { type: 'outside', countryCode: parsed.place?.countryCode ?? null, countryName: parsed.place?.countryName ?? null };
  const verdict = buildVerdict({ phase, parsed, plan: phase === 'outside' ? outsidePlan : plan, split, fetchedAt: data.fetchedAt, now, tz, source });

  // 4. Tell the host we're done (once, after a final state rendered)
  const loadedRef = useRef(false);
  useEffect(() => {
    if (phase !== 'loading') signalLoadedOnce(loadedRef, props);
  }, [phase, props]);

  const [selectedId, setSelectedId] = useState(null);
  const [showOthers, setShowOthers] = useState(false);
  useEffect(() => { setSelectedId(null); setShowOthers(false); }, [parsedBase.rawQuery]);
  const selected = selectedId ? alerts.find((a) => a.id === selectedId) : null;
  const open = useCallback((a) => setSelectedId(a.id), []);
  const search = useCallback((q) => runSearch(props, q), [props]);

  const grouped = parsed.kind === 'state' || parsed.kind === 'country';
  const pad = compact ? 2 : 2.5;
  const userInUS = parsedBase.userLocation?.countryCode === 'US';
  const demoBadge = demo.status === 'on' ? { title: `Sandbox demo "${demo.name}": ${demo.note}.${demo.capturedAt ? ` Recorded official data from ${demo.capturedAt.slice(0, 10)}, times shifted to now.` : ''}` } : null;

  let body = null;
  if (selected) {
    body = (
      <AlertDetail alert={selected} tz={tz} now={now} compact={compact} onBack={() => setSelectedId(null)}
        backLabel={parsed.place?.label && parsed.kind !== 'nearMe' ? `All alerts for ${parsed.place.label}` : 'All alerts'} />
    );
  } else if (verdict.state === 'active' || verdict.state === 'noMatch') {
    const { matched, related, others } = split;
    const hero = verdict.state === 'active' ? matched[0] : null;
    const primaryList = verdict.state === 'active' ? (grouped ? matched : matched.slice(1)) : [...related, ...others];
    const secondary = verdict.state === 'active' ? [...related, ...others] : [];
    const timelineAlerts = verdict.state === 'active' ? matched : primaryList;
    const mapAlerts = verdict.state === 'active' ? matched : primaryList;
    const lists = (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <AlertList alerts={primaryList} grouped={grouped} tz={tz} now={now} onOpen={open}
          title={verdict.state === 'noMatch' ? 'Active instead' : grouped ? `All ${matched.length} ${national ? 'severe or extreme' : split.filtered ? 'matching' : ''} alerts`.replace(/\s+/g, ' ') : 'Also in effect'} />
        {secondary.length > 0 && (
          <Box>
            <Button size="small" onClick={() => setShowOthers((s) => !s)} aria-expanded={showOthers} sx={{ ml: 0.25 }}>
              {showOthers ? 'Hide' : 'Show'} {secondary.length} {parsed.severeOnly && !parsed.hazard ? 'less serious' : 'other'} {secondary.length === 1 ? 'alert' : 'alerts'}
            </Button>
            <Collapse in={showOthers} unmountOnExit>
              <AlertList alerts={secondary} grouped={grouped} tz={tz} now={now} onOpen={open} />
            </Collapse>
          </Box>
        )}
        {national && <NationalSummary alerts={matched} marine={marine.length} />}
      </Box>
    );
    body = (
      <Box sx={{ px: pad, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {hero && <AlertHero alert={hero} tz={tz} now={now} onOpen={open} compact={compact} />}
        <TimelineRibbon alerts={timelineAlerts} grouped={grouped} tz={tz} now={now} onOpen={open} compact={compact} collapsible={format === 'sidebar' || compact} />
        {lists}
        <MapSlot alerts={mapAlerts} place={['point', 'nearMe'].includes(parsed.kind) ? parsed.place : null} onOpen={open} height={format === 'sidebar' ? 160 : compact ? 200 : 280} />
      </Box>
    );
  } else if (verdict.state === 'none') {
    body = <Box sx={{ px: pad }}><NoAlertsBody lat={parsed.place?.lat} lon={parsed.place?.lon} source={source} /></Box>;
  } else if (verdict.state === 'outside') {
    body = <Box sx={{ px: pad }}><OutsideCoverageBody countryCode={outsidePlan.countryCode} countryName={outsidePlan.countryName} /></Box>;
  } else if (verdict.state === 'error') {
    body = <Box sx={{ px: pad }}><ErrorBody onRetry={data.refresh} retrying={data.status === 'loading'} error={data.error} source={source} /></Box>;
  } else if (verdict.state === 'needLocation' && plan.reason === 'noUserLocation') {
    body = <Box sx={{ px: pad }}><LocateButton onLocate={locate} status={geo.status} /></Box>;
  }

  const showPrecise = parsed.kind === 'nearMe' && parsed.place?.approximate && phase !== 'loading' && !selected;
  const chips = selected || phase === 'loading' ? [] : verdict.state === 'needLocation' && plan.reason === 'noCoordinates' && parsed.place?.hint
    ? [`weather alerts in ${parsed.place.hint}`, 'weather alerts near me']
    : followUps({ parsed, state: verdict.state, userInUS });

  return (
    <ThemeProvider theme={theme}>
      <Box
        ref={rootRef}
        component="article"
        aria-label="Live weather alerts"
        sx={{
          width: '100%', maxWidth: format === 'sidebar' ? 420 : 720, mx: 'auto', boxSizing: 'border-box',
          bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider',
          borderRadius: 4, overflow: 'hidden', fontFamily: theme.typography.fontFamily,
          '& *': { boxSizing: 'border-box' },
          '@media (prefers-reduced-motion: reduce)': { '& *': { transition: 'none !important', animation: 'none !important' } },
        }}
      >
        <SignalBar severity={verdict.severity} pending={phase === 'loading'} />
        {!selected && (
          <VerdictHeader verdict={verdict} placeLine={placeLineFor(parsed, geo.coords)} approximate={parsed.kind === 'nearMe' ? Boolean(parsed.place?.approximate) : undefined} demo={demoBadge} compact={compact} />
        )}
        {body}
        {showPrecise && (
          <Box sx={{ px: pad, pt: 1.5 }}>
            <Button size="small" variant="outlined" onClick={locate} disabled={geo.status === 'pending'}>
              {geo.status === 'pending' ? 'Finding you…' : 'Use my precise location'}
            </Button>
            {geo.status === 'denied' && (
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>Precise location isn't available here, so this uses your approximate network location.</Typography>
            )}
          </Box>
        )}
        <Box component="footer" sx={{ px: pad, pt: 1.5, pb: 2, mt: body ? 2 : 0, borderTop: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {phase === 'ready' && (
            <SourceLine source={sourceInfo(source).name} fetchedAt={data.fetchedAt} now={now} tz={tz} onRefresh={data.refresh} refreshing={data.refreshing} staleSince={data.staleSince} />
          )}
          <FollowUpChips queries={chips} onSearch={search} />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

function NationalSummary({ alerts, marine }) {
  const states = countByState(alerts).slice(0, 8);
  if (!states.length) return null;
  return (
    <Box sx={{ px: 1.25 }}>
      <Typography component="h3" sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'text.secondary', mb: 0.75 }}>
        Most affected states
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {states.map((s) => (
          <Box key={s.state} sx={{ px: 1, py: 0.25, borderRadius: 1.5, bgcolor: 'surface.raised', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
            {US_AREAS[s.state] ?? s.state} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>{s.count}</Box>
          </Box>
        ))}
      </Box>
      {marine > 0 && (
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 1 }}>
          Plus {marine} severe marine {marine === 1 ? 'alert' : 'alerts'} for coastal and offshore waters.
        </Typography>
      )}
    </Box>
  );
}

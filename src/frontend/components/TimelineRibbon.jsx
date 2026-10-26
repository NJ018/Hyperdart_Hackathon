// Signature interaction: a timeline from 2 h ago to the latest end time (max 72 h),
// one bar per alert (or per event in state views). Bar colour = seriousness, pattern =
// kind (warning solid, watch striped, advisory outlined, statement dashed). Drag the
// handle (or use ←/→, Home, End) to ask "what is in effect at 9 PM tonight?".
import { useMemo, useState } from 'react';
import { Box, ButtonBase, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/KeyboardArrowDown';
import { tierFill, TierSwatch, TIER_LABEL } from './Severity.jsx';
import { groupByEvent } from '../lib/group.js';
import { TIER_ORDER } from '../lib/rank.js';
import { formatDuration, formatTick, formatTime, formatWeekday, HOUR, isoOffsetMinutes, MIN, toMs, zoneOffsetMinutes } from '../lib/time.js';
import { severityColor } from '../theme/severity.js';

const MAX_LANES = 6;
const SNAP = 15 * MIN;

function buildLanes(alerts, grouped) {
  const source = grouped
    ? groupByEvent(alerts).map((g) => ({ key: g.key, label: g.count > 1 ? `${g.event} ×${g.count}` : g.event, tier: g.tier, severity: g.severity, onset: g.onset, ends: g.ends, target: g.top }))
    : alerts.map((a) => ({ key: a.id, label: a.event, tier: a.tier, severity: a.severity, onset: a.onset, ends: a.ends, target: a }));
  return source.map((l) => ({ ...l, start: toMs(l.onset), end: l.ends ? toMs(l.ends) : null }));
}

function niceTicks(t0, t1, { tz, offset, maxTicks }) {
  const spanH = (t1 - t0) / HOUR;
  const step = [1, 2, 3, 6, 12, 24].find((s) => spanH / s <= maxTicks) ?? 24;
  const off = tz ? zoneOffsetMinutes(tz, t0) : offset ?? -new Date(t0).getTimezoneOffset();
  const local = t0 + off * MIN;
  const first = Math.ceil(local / (step * HOUR)) * step * HOUR - off * MIN;
  const ticks = [];
  for (let t = first; t <= t1; t += step * HOUR) {
    const localHour = new Date(t + off * MIN).getUTCHours();
    ticks.push({ t, label: localHour === 0 ? formatWeekday(t, { tz, offset }) : formatTick(t, { tz, offset }), day: localHour === 0 });
  }
  return ticks;
}

const activeAt = (a, t) => toMs(a.onset) <= t && (!a.ends || t < toMs(a.ends));

export default function TimelineRibbon({ alerts, grouped, tz, now, onOpen, compact, collapsible }) {
  const { palette } = useTheme();
  const [expanded, setExpanded] = useState(!collapsible);
  const [scrub, setScrub] = useState(null); // null = following "now"
  const [dragging, setDragging] = useState(false);

  const allLanes = useMemo(() => buildLanes(alerts, grouped), [alerts, grouped]);
  const lanes = allLanes.slice(0, MAX_LANES);

  // Domain: 2 h ago → latest end (at least 6 h ahead, at most 72 h)
  const t0 = now - 2 * HOUR;
  const finiteEnds = allLanes.map((l) => l.end).filter((e) => e !== null && !Number.isNaN(e));
  const starts = allLanes.map((l) => l.start).filter((s) => !Number.isNaN(s));
  const wanted = Math.max(now + 6 * HOUR, ...finiteEnds, ...starts.map((s) => s + 2 * HOUR), finiteEnds.length ? 0 : now + 12 * HOUR);
  const t1 = Math.min(wanted, now + 72 * HOUR);
  const overflow = wanted > t1;
  // Without a place zone, label ticks at the alerts' own UTC offset (UTC "Z" stamps → viewer's zone)
  const offset = tz || /Z$/i.test(alerts[0]?.onset ?? '') ? null : isoOffsetMinutes(alerts[0]?.onset);
  const pct = (t) => `${(((Math.min(Math.max(t, t0), t1) - t0) / (t1 - t0)) * 100).toFixed(3)}%`;
  const ticks = useMemo(() => niceTicks(t0, t1, { tz, offset, maxTicks: compact ? 4 : 7 }), [t0, t1, tz, offset, compact]);

  const at = scrub === null ? now : Math.min(Math.max(scrub, t0), t1);
  const isNow = Math.abs(at - now) < MIN;
  const inEffect = alerts.filter((a) => activeAt(a, at));
  const later = alerts.filter((a) => toMs(a.onset) > at).length;
  const when = isNow ? 'Now' : `${formatTime(at, { tz, now, offset })} (${at > now ? 'in ' : ''}${formatDuration(at - now)}${at < now ? ' ago' : ''})`;
  const names = [...new Set(inEffect.map((a) => a.event))];
  const readout = inEffect.length
    ? `${when}: ${inEffect.length} in effect — ${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2}` : ''}${isNow && later ? ` · ${later} starting later` : ''}`
    : `${when}: none of these alerts in effect${at > now ? '. New alerts may still be issued.' : ''}${isNow && later ? ` · ${later} starting later` : ''}`;

  const tiers = TIER_ORDER.filter((t) => lanes.some((l) => l.tier === t));

  // Scrubbing via the axis strip
  const fromPointer = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    return Math.round((t0 + f * (t1 - t0)) / SNAP) * SNAP;
  };
  const onPointerDown = (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); setDragging(true); setScrub(fromPointer(e)); };
  const onPointerMove = (e) => { if (dragging) setScrub(fromPointer(e)); };
  const onPointerUp = () => setDragging(false);
  const onKeyDown = (e) => {
    const step = { ArrowRight: HOUR, ArrowLeft: -HOUR, PageUp: 6 * HOUR, PageDown: -6 * HOUR }[e.key];
    if (step) { e.preventDefault(); setScrub(Math.min(t1, Math.max(t0, Math.round((at + step) / SNAP) * SNAP))); }
    if (e.key === 'Home') { e.preventDefault(); setScrub(null); }
    if (e.key === 'End') { e.preventDefault(); setScrub(t1); }
  };

  if (!lanes.length) return null;

  // Sidebar: a 28 px overview strip that expands on tap
  if (!expanded) {
    return (
      <ButtonBase onClick={() => setExpanded(true)} aria-expanded="false" aria-label="Show timeline" sx={{ display: 'block', width: '100%', textAlign: 'left', borderRadius: 2, p: 1, bgcolor: 'surface.raised' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'text.secondary' }}>Timeline</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', fontSize: 12, color: 'text.secondary' }}>next {formatDuration(t1 - now)} <ExpandMoreIcon sx={{ fontSize: 18 }} /></Box>
        </Box>
        <Box sx={{ position: 'relative', height: 28, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
          {lanes.map((l) => (
            <Box key={l.key} sx={{ position: 'relative', height: Math.max(3, Math.min(8, Math.floor(24 / lanes.length) - 2)) }}>
              <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: pct(l.start), right: l.end === null ? 0 : `calc(100% - ${pct(l.end)})`, borderRadius: '2px', background: severityColor(l.severity, palette.mode), opacity: l.tier === 'warning' ? 1 : 0.55 }} />
            </Box>
          ))}
          <Box aria-hidden="true" sx={{ position: 'absolute', top: 0, bottom: 0, left: pct(now), width: 2, ml: '-1px', bgcolor: 'text.primary' }} />
        </Box>
      </ButtonBase>
    );
  }

  const labelCol = compact ? null : 150;

  return (
    <Box component="section" aria-label="Alert timeline" sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', p: compact ? 1.25 : 1.75, pt: 1.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Typography component="h3" sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'text.secondary' }}>
          Timeline{tz ? '' : ' · local time'}
        </Typography>
        {collapsible && (
          <ButtonBase onClick={() => setExpanded(false)} sx={{ fontSize: 12, color: 'text.secondary', borderRadius: 1, px: 0.5 }}>Collapse</ButtonBase>
        )}
      </Box>
      <Typography role="status" aria-live="polite" sx={{ fontSize: 13.5, fontWeight: 600, mt: 0.5, mb: 1.25, minHeight: 20, fontVariantNumeric: 'tabular-nums' }}>
        {readout}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: labelCol ? `${labelCol}px minmax(0, 1fr)` : 'minmax(0, 1fr)', columnGap: 1.5 }}>
        {labelCol && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lanes.map((l) => (
              <Typography key={l.key} title={l.label} sx={{ height: 16, fontSize: 12.5, fontWeight: 600, lineHeight: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.label}</Typography>
            ))}
          </Box>
        )}

        {/* Plot */}
        <Box sx={{ position: 'relative' }}>
          {ticks.map((tk) => (
            <Box key={tk.t} aria-hidden="true" sx={{ position: 'absolute', top: -4, bottom: -4, left: pct(tk.t), width: '1px', bgcolor: 'divider', opacity: tk.day ? 1 : 0.6 }} />
          ))}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: compact ? '4px' : '8px', position: 'relative' }}>
            {lanes.map((l) => {
              const openEnded = l.end === null;
              const clippedEnd = !openEnded && l.end > t1;
              const startsBefore = l.start < t0;
              const until = openEnded ? 'until further notice' : `until ${formatTime(l.ends, { tz, now })}`;
              const tip = `${l.label} · ${l.severity} · ${TIER_LABEL[l.tier]} · from ${formatTime(l.onset, { tz, now })} ${until}`;
              return (
                <Box key={l.key}>
                  {!labelCol && (
                    // Backed by the surface colour and lifted above the Now line, so the line never strikes through it
                    <Typography sx={{ position: 'relative', zIndex: 2, display: 'inline-block', maxWidth: '100%', bgcolor: 'background.paper', pr: 0.5, fontSize: 12, fontWeight: 600, lineHeight: '15px', mb: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{l.label}</Typography>
                  )}
                  <Box sx={{ position: 'relative', height: 16 }}>
                    <Tooltip title={tip} placement="top" arrow>
                      <ButtonBase
                        onClick={() => onOpen(l.target)}
                        aria-label={`${tip}. Open details.`}
                        sx={{
                          position: 'absolute', top: 2, height: 12,
                          left: pct(l.start), right: openEnded || clippedEnd ? 0 : `calc(100% - ${pct(l.end)})`,
                          minWidth: 6,
                          borderRadius: `${startsBefore ? 0 : 4}px ${openEnded || clippedEnd ? 0 : 4}px ${openEnded || clippedEnd ? 0 : 4}px ${startsBefore ? 0 : 4}px`,
                          ...tierFill(l.tier, l.severity, palette.mode),
                          ...(openEnded ? { maskImage: 'linear-gradient(90deg, #000 75%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, #000 75%, transparent)' } : {}),
                          transition: 'filter 150ms ease',
                          '&:hover, &.Mui-focusVisible': { filter: 'brightness(1.12) saturate(1.1)', outline: `2px solid ${palette.text.primary}`, outlineOffset: 1 },
                        }}
                      />
                    </Tooltip>
                    {clippedEnd && <Box aria-hidden="true" sx={{ position: 'absolute', right: -12, top: 0, fontSize: 12, fontWeight: 700, color: 'text.secondary', lineHeight: '16px' }}>›</Box>}
                  </Box>
                </Box>
              );
            })}
            {/* Now line */}
            <Box aria-hidden="true" sx={{ position: 'absolute', top: -6, bottom: -4, left: pct(now), width: 2, ml: '-1px', bgcolor: 'text.primary', borderRadius: 1, pointerEvents: 'none' }}>
              <Box sx={{ position: 'absolute', top: -3, left: -3, width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.primary', animation: 'hu-pulse 2s ease-out infinite', '@keyframes hu-pulse': { '0%': { boxShadow: `0 0 0 0 ${palette.text.primary}55` }, '100%': { boxShadow: `0 0 0 8px ${palette.text.primary}00` } } }} />
            </Box>
            {/* Scrub line */}
            {!isNow && (
              <Box aria-hidden="true" sx={{ position: 'absolute', top: -6, bottom: -4, left: pct(at), width: 0, borderLeft: `2px dashed ${palette.primary.main}`, ml: '-1px', pointerEvents: 'none' }} />
            )}
          </Box>
        </Box>

        {/* Axis + scrub strip */}
        {labelCol && <Box />}
        <Box
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          sx={{ position: 'relative', height: 34, mt: 0.75, cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none', userSelect: 'none' }}
        >
          <Box sx={{ position: 'absolute', left: 0, right: 0, top: 8, height: 4, borderRadius: 2, bgcolor: 'surface.raised' }} />
          {ticks.map((tk) => {
            const p = ((tk.t - t0) / (t1 - t0)) * 100;
            if (p < 4 || p > 96) return null;
            return (
              <Typography key={tk.t} aria-hidden="true" sx={{ position: 'absolute', top: 16, left: `${p}%`, transform: 'translateX(-50%)', fontSize: 11, color: 'text.secondary', fontWeight: tk.day ? 700 : 500, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                {tk.label}
              </Typography>
            );
          })}
          <Box
            role="slider" tabIndex={0}
            aria-label="Time to check"
            aria-valuemin={t0} aria-valuemax={t1} aria-valuenow={at} aria-valuetext={readout}
            onKeyDown={onKeyDown}
            sx={{
              position: 'absolute', top: 2, left: pct(at), width: 16, height: 16, ml: '-8px', borderRadius: '50%',
              bgcolor: 'background.paper', border: `2px solid ${palette.primary.main}`, boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              '&:focus-visible': { outline: `2px solid ${palette.primary.main}`, outlineOffset: 2 },
            }}
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', columnGap: 1.5, rowGap: 0.25, flexWrap: 'wrap', mt: 0.5, fontSize: 12, color: 'text.secondary' }}>
        {tiers.map((t) => (
          <Box key={t} component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><TierSwatch tier={t} severity="Unknown" /> {TIER_LABEL[t]}</Box>
        ))}
        <span>Colour = how serious</span>
        <span>Drag the handle to check a time</span>
        {allLanes.length > MAX_LANES && <span>+{allLanes.length - MAX_LANES} more in the list</span>}
        {overflow && <span>› continues beyond 72 h</span>}
      </Box>
    </Box>
  );
}

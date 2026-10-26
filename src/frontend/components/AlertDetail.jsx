// "Dig deeper" view for one alert: plain summary, what to do (official instruction
// sentences only — no rewriting, no AI), the bulletin's own sections, and the full
// verbatim bulletin with a link to the official record.
import { useEffect, useRef, useState } from 'react';
import { Box, Button, Chip, Collapse, Link, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/KeyboardArrowDown';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HazardIcon from './HazardIcon.jsx';
import { SeverityTag, TIER_LABEL } from './Severity.jsx';
import { timeSummary } from './AlertHero.jsx';
import { CERTAINTY_WORDS, SEVERITY_MEANING, severityWash, TIER_GLOSSARY, URGENCY_WORDS } from '../theme/severity.js';
import { parseDescription, splitInstructions } from '../lib/bulletin.js';
import { formatTime, toMs } from '../lib/time.js';
import { sourceInfo } from '../lib/sources.js';

const capitalise = (s) => String(s).charAt(0).toUpperCase() + String(s).slice(1);

function Section({ title, children, aside }) {
  return (
    <Box component="section" sx={{ mt: 2.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
        <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'text.secondary' }}>{title}</Typography>
        {aside}
      </Box>
      {children}
    </Box>
  );
}

export default function AlertDetail({ alert, tz, now, onBack, backLabel, compact }) {
  const { palette } = useTheme();
  const [areasOpen, setAreasOpen] = useState(false);
  const [bulletinOpen, setBulletinOpen] = useState(false);
  const backRef = useRef(null);
  useEffect(() => { backRef.current?.focus(); }, [alert.id]);

  const steps = splitInstructions(alert.instruction);
  const sections = parseDescription(alert.description)?.filter((s) => ['What', 'Impacts', 'Additional information'].includes(s.label));
  const eccc = alert.source === 'eccc' ? alert.eccc ?? {} : null;
  const src = sourceInfo(alert.source);
  const t = timeSummary(alert, { tz, now });
  const shownAreas = areasOpen ? alert.areas : alert.areas.slice(0, 8);
  const expiresBeforeEnd = alert.expires && alert.ends && toMs(alert.expires) < toMs(alert.ends);

  return (
    <Box sx={{ px: compact ? 2 : 2.5, pt: 1.5, pb: 2 }}>
      <Button ref={backRef} size="small" startIcon={<ArrowBackIcon />} onClick={onBack} disableFocusRipple
        sx={{ ml: -1, color: 'text.secondary', '&.Mui-focusVisible': { outline: `2px solid ${palette.primary.main}`, outlineOffset: 1 } }}>
        {backLabel}
      </Button>

      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mt: 1 }}>
        <Box sx={{ flex: 'none', width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: severityWash(alert.severity, palette.mode, 0.18) }}>
          <HazardIcon hazard={alert.hazard} sx={{ fontSize: 26 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: compact ? 20 : 23, fontWeight: 700, lineHeight: 1.2 }}>{alert.event}</Typography>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mt: 0.5, flexWrap: 'wrap' }}>
            <SeverityTag severity={alert.severity} />
            <Tooltip title={TIER_GLOSSARY[alert.tier]} enterTouchDelay={0}>
              <Box component="span" tabIndex={0} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, fontSize: 12.5, color: 'text.secondary', cursor: 'help' }}>
                {TIER_LABEL[alert.tier]} <HelpOutlineIcon sx={{ fontSize: 14 }} aria-label="What does this mean?" />
              </Box>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Plain summary */}
      <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 1.25 }}>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'surface.raised' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5 }}>HOW SERIOUS</Typography>
          {eccc ? (
            <>
              <Typography sx={{ fontSize: 14.5, fontWeight: 650, mt: 0.25 }}>
                {[eccc.riskColour && `${capitalise(eccc.riskColour)} ${TIER_LABEL[alert.tier].toLowerCase()}`, eccc.impact && `${eccc.impact} impact`, eccc.confidence && `${eccc.confidence} confidence`].filter(Boolean).join(' · ')}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>
                Environment Canada rates alerts by expected impact and forecast confidence (yellow → orange → red).
              </Typography>
            </>
          ) : (
            <>
              <Typography sx={{ fontSize: 14.5, fontWeight: 650, mt: 0.25 }}>
                {alert.severity} · {alert.certainty} · {URGENCY_WORDS[alert.urgency] ?? alert.urgency}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>
                {SEVERITY_MEANING[alert.severity]}. {CERTAINTY_WORDS[alert.certainty]}.
              </Typography>
            </>
          )}
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'surface.raised', fontVariantNumeric: 'tabular-nums' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.5 }}>WHEN</Typography>
          <Typography sx={{ fontSize: 14.5, fontWeight: 650, mt: 0.25 }}>{t.lead}</Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.25 }}>
            From {formatTime(alert.onset, { tz, now })} · {t.sub}
          </Typography>
          {!alert.ends && alert.expires && (
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>
              This bulletin is valid until {formatTime(alert.expires, { tz, now })}; {src.short} may extend or update it.
            </Typography>
          )}
          {expiresBeforeEnd && (
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 0.5 }}>
              {src.short} will update this bulletin by {formatTime(alert.expires, { tz, now })}.
            </Typography>
          )}
        </Box>
      </Box>

      <Section title={`Where · ${alert.areas.length} ${alert.areas.length === 1 ? 'area' : 'areas'}`}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {shownAreas.map((a) => <Chip key={a} label={a} size="small" variant="outlined" />)}
          {alert.areas.length > 8 && (
            <Chip size="small" label={areasOpen ? 'Show fewer' : `+${alert.areas.length - 8} more`} onClick={() => setAreasOpen((o) => !o)} color="primary" variant="outlined" />
          )}
        </Box>
      </Section>

      <Section title="What to do now" aside={<Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>From the official {src.short} instructions</Typography>}>
        {!steps.length && eccc ? (
          <Typography sx={{ fontSize: 14.5 }}>Environment Canada includes its advice in the bulletin text below. Follow local officials.</Typography>
        ) : steps.length ? (
          <Box component="ol" sx={{ m: 0, pl: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0.75, counterReset: 'step' }}>
            {steps.map((s, i) => (
              <Box component="li" key={i} sx={{ display: 'flex', gap: 1.25, fontSize: 14.5, lineHeight: 1.45 }}>
                <Box component="span" aria-hidden="true" sx={{ flex: 'none', width: 22, height: 22, mt: '1px', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, bgcolor: severityWash(alert.severity, palette.mode, 0.18) }}>
                  {i + 1}
                </Box>
                <span>{s}</span>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography sx={{ fontSize: 14.5 }}>No specific instructions were issued. Follow local officials.</Typography>
        )}
      </Section>

      {sections?.length > 0 && (
        <Section title="In the bulletin's words">
          {sections.map((s) => (
            <Typography key={s.label} sx={{ fontSize: 14, lineHeight: 1.5, mb: 0.75, whiteSpace: 'pre-line' }}>
              <Box component="span" sx={{ fontWeight: 700 }}>{s.label}: </Box>{s.text}
            </Typography>
          ))}
        </Section>
      )}

      <Box sx={{ mt: 2.25, borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
        <Button
          size="small" onClick={() => setBulletinOpen((o) => !o)} aria-expanded={bulletinOpen}
          endIcon={<ExpandMoreIcon sx={{ transform: bulletinOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }} />}
          sx={{ ml: -1, color: 'text.primary' }}
        >
          Official bulletin (full text)
        </Button>
        <Collapse in={bulletinOpen} unmountOnExit>
          <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: 'surface.raised', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', overflowWrap: 'anywhere' }}>
            {alert.headline && <Box sx={{ fontWeight: 700, mb: 1 }}>{alert.headline}</Box>}
            {alert.nwsHeadline && <Box sx={{ mb: 1 }}>...{alert.nwsHeadline}...</Box>}
            {alert.description}
            {alert.instruction && <><Box sx={{ fontWeight: 700, mt: 1.5 }}>PRECAUTIONARY/PREPAREDNESS ACTIONS</Box>{alert.instruction}</>}
          </Box>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mt: 1 }}>
            Issued by {alert.sender} · sent {formatTime(alert.sent, { tz, now })}
          </Typography>
          <Link href={alert.id} target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 13, mt: 0.5 }}>
            Official alert record ({src.recordHost}) <OpenInNewIcon sx={{ fontSize: 14 }} />
          </Link>
        </Collapse>
      </Box>
    </Box>
  );
}

// Where each alert applies: alert polygons (or their NWS zone shapes) in severity
// colours, with line styles matching the timeline's kinds, plus a pin for the place.
// Leaflet itself is loaded on demand with import('leaflet'). It shares no code with the
// rest of the component, so the core bundle stays one file and, if the map chunk cannot
// load, only the map disappears. Basemap: Esri gray canvas (no API key), with its
// place labels drawn above the alert shapes; attribution shown.
import { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { Box, Skeleton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { loadAlertShapes } from '../lib/zones.js';
import { severityColor } from '../theme/severity.js';
import { SEVERITY_ORDER } from '../lib/rank.js';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
const ATTRIBUTION = 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors';
const MAX_ALERTS = 12;

const STYLE_BY_TIER = {
  warning: { weight: 2, fillOpacity: 0.35 },
  watch: { weight: 2, fillOpacity: 0.18, dashArray: '6 4' },
  advisory: { weight: 2, fillOpacity: 0.1 },
  statement: { weight: 1.5, fillOpacity: 0.06, dashArray: '2 4' },
  other: { weight: 1.5, fillOpacity: 0.06, dashArray: '2 4' },
};

export default function AlertMap({ alerts, place, onOpen, height, onFail }) {
  const { palette } = useTheme();
  const elRef = useRef(null);
  const [shapes, setShapes] = useState(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  // Alert arrays are rebuilt every minute by the clock; only refetch / redraw when the set changes.
  const idsKey = alerts.slice(0, MAX_ALERTS).map((a) => a.id).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const top = useMemo(() => alerts.slice(0, MAX_ALERTS), [idsKey]);

  useEffect(() => {
    let cancelled = false;
    setShapes(null);
    loadAlertShapes(top).then((r) => {
      if (cancelled) return;
      if (!r.shapes.length) onFail();
      else setShapes(r);
    });
    return () => { cancelled = true; };
  }, [top, onFail]);

  useEffect(() => {
    if (!shapes || !elRef.current) return undefined;
    let map = null;
    let cancelled = false;
    // The ESM build: no CommonJS interop helper to share with the main bundle
    import('leaflet/dist/leaflet-src.esm.js')
      .then((mod) => {
        if (cancelled || !elRef.current) return;
        const L = mod.default ?? mod;
        const touch = 'ontouchstart' in window;
        map = L.map(elRef.current, { scrollWheelZoom: false, dragging: !touch, zoomControl: true, attributionControl: true });
        // A view must exist before layers are added, or Leaflet never creates their paths
        // (and later throws while removing them).
        map.setView([place?.lat ?? 39.8, place?.lon ?? -98.5], 6);

        map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');

        let tileErrors = 0;
        const shade = palette.mode === 'dark' ? 'Dark' : 'Light';
        L.tileLayer(`${ESRI}/World_${shade}_Gray_Base/MapServer/tile/{z}/{y}/{x}`, { attribution: ATTRIBUTION, maxZoom: 16 })
          .on('tileerror', () => { tileErrors += 1; if (tileErrors > 8) onFail(); })
          .addTo(map);
        // Place names above the shapes so areas stay identifiable
        map.createPane('labels').style.zIndex = 650;
        map.getPane('labels').style.pointerEvents = 'none';
        L.tileLayer(`${ESRI}/World_${shade}_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, { pane: 'labels', maxZoom: 16 }).addTo(map);

        // Least serious first, so the most serious shapes end up on top
        const byId = new Map(top.map((a) => [a.id, a]));
        const ordered = shapes.shapes
          .filter((s) => byId.has(s.alertId))
          .sort((a, b) => SEVERITY_ORDER.indexOf(byId.get(b.alertId).severity) - SEVERITY_ORDER.indexOf(byId.get(a.alertId).severity));
        const layer = L.geoJSON(
          { type: 'FeatureCollection', features: ordered.map((s) => ({ type: 'Feature', geometry: s.geometry, properties: { alertId: s.alertId } })) },
          {
            style: (f) => {
              const a = byId.get(f.properties.alertId);
              const color = severityColor(a.severity, palette.mode);
              return { color, fillColor: color, ...(STYLE_BY_TIER[a.tier] ?? STYLE_BY_TIER.other) };
            },
            onEachFeature: (f, l) => {
              const a = byId.get(f.properties.alertId);
              l.bindTooltip(`${a.event} · ${a.severity}`, { sticky: true });
              l.on('click', () => onOpenRef.current(a));
            },
          },
        ).addTo(map);

        const bounds = layer.getBounds();
        if (place?.lat != null && place?.lon != null) {
          L.circleMarker([place.lat, place.lon], { radius: 6, color: palette.background.paper, weight: 2, fillColor: palette.text.primary, fillOpacity: 1 })
            .bindTooltip('Searched place')
            .addTo(map);
          bounds.extend([place.lat, place.lon]);
        }
        map.invalidateSize(); // the slot may have been laid out after Leaflet measured it
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [16, 16], maxZoom: 10 });
        else onFail();
      })
      .catch(() => onFail()); // chunk failed to load, or Leaflet threw while drawing
    return () => {
      cancelled = true;
      // Errors in effect cleanup would bypass the map's error boundary; a map problem
      // must never take the verdict down with it.
      try { map?.remove(); } catch { /* already detached */ }
    };
  }, [shapes, top, place, palette, onFail]);

  return (
    <Box sx={{
      height, position: 'relative',
      '& .leaflet-container': { height: '100%', width: '100%', background: palette.mode === 'dark' ? '#242424' : '#e8e8e8', fontFamily: 'inherit' },
      '& .leaflet-control-attribution': { fontSize: 10, lineHeight: 1.4 },
      '& .leaflet-tooltip': { fontSize: 12, fontWeight: 600 },
    }}>
      {!shapes && <Skeleton variant="rectangular" height={height} animation="wave" sx={{ position: 'absolute', inset: 0 }} />}
      <Box ref={elRef} role="img" aria-label="Map of the areas these alerts cover" sx={{ height: '100%' }} />
      {shapes?.truncated && (
        <Typography sx={{ position: 'absolute', left: 8, bottom: 4, fontSize: 11, color: 'text.secondary', zIndex: 500, pointerEvents: 'none', bgcolor: 'background.paper', px: 0.5, borderRadius: 0.5 }}>
          Showing the main areas only
        </Typography>
      )}
    </Box>
  );
}

// Holds the map: mounts it only when the slot scrolls into view, so the verdict never
// waits for it, and removes itself if anything about the map fails (Leaflet chunk,
// tiles or shapes) — the area names in the list remain.
import { Component, useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import AlertMap from './AlertMap.jsx';

class MapBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function MapSlot({ alerts, place, onOpen, height }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setVisible(true);
        io.disconnect();
      }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const idsKey = alerts.map((a) => a.id).join('|');
  useEffect(() => setFailed(false), [idsKey]);
  const fail = useCallback(() => setFailed(true), []);
  if (failed || !alerts.length) return null;

  return (
    <Box ref={ref} sx={{ height, borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider', bgcolor: 'surface.raised', position: 'relative', isolation: 'isolate' }}>
      {visible && (
        <MapBoundary onFail={fail}>
          <AlertMap alerts={alerts} place={place} onOpen={onOpen} height={height} onFail={fail} />
        </MapBoundary>
      )}
    </Box>
  );
}

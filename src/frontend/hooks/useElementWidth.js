// Width of an element, kept current with a ResizeObserver (the host may resize the frame).
import { useEffect, useState } from 'react';

export function useElementWidth(ref, fallback = 720) {
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

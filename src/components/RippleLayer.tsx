import { useEffect, useRef, useState } from 'react';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

// A round wave spreads from every tap / click, anywhere on the page.
export default function RippleLayer() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const onDown = (e: PointerEvent) => {
      if (e.button > 0) return;
      const id = counter.current++;
      setRipples((prev) => [...prev.slice(-5), { id, x: e.clientX, y: e.clientY }]);
      window.setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 900);
    };

    document.addEventListener('pointerdown', onDown, { passive: true });
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  return (
    <div aria-hidden="true" className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {ripples.map((r) => (
        <span key={r.id} className="absolute block w-0 h-0" style={{ left: r.x, top: r.y }}>
          <span className="ripple" />
          <span className="ripple ripple-2" />
        </span>
      ))}
    </div>
  );
}

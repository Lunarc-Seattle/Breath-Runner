import { useEffect, useRef, useState } from 'react';

/**
 * Animates a numeric value from its previous value to `target` over `duration` ms.
 * Uses an ease-out-cubic curve. Returns 0 until the first non-null target arrives.
 */
export function useCountUp(target: number | null, duration = 750): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const prevRef = useRef(0);

  useEffect(() => {
    if (target == null) {
      setValue(0);
      return;
    }
    cancelAnimationFrame(rafRef.current);
    const from = prevRef.current;
    const startTs = performance.now();
    const tick = (ts: number) => {
      const p = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - (1 - p) ** 3;
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

import {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo} from 'react-native';

/** Animates a number from its previous value to `target` (ease-out). */
export function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    let frame = 0;
    let cancelled = false;
    const from = fromRef.current;

    AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (cancelled) {
        return;
      }
      if (reduce || from === target) {
        fromRef.current = target;
        setValue(target);
        return;
      }
      const start = Date.now();
      const tick = () => {
        const t = Math.min(1, (Date.now() - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(from + (target - from) * eased));
        if (t < 1) {
          frame = requestAnimationFrame(tick);
        } else {
          fromRef.current = target;
        }
      };
      frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [target, durationMs]);

  return value;
}

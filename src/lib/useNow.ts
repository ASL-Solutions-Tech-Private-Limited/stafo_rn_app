import {useEffect, useState} from 'react';

/** Current time, re-rendering every `intervalMs` while `active`. */
export function useNow(active: boolean, intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) {
      return;
    }
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [active, intervalMs]);
  return now;
}

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { getStored, saveSetting } from './persistence';

/**
 * Drop-in replacement for useState that restores the last saved value from IndexedDB on load
 * and writes every subsequent change back (debounced). `sanitize` validates whatever was stored
 * so a stale or corrupted record can never crash the app.
 */
export function usePersistedState<T>(
  key: string,
  fallback: T,
  sanitize?: (raw: unknown, fallback: T) => T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    const raw = getStored(key);
    if (raw === undefined) return fallback;
    try {
      return sanitize ? sanitize(raw, fallback) : (raw as T);
    } catch {
      return fallback;
    }
  });
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    saveSetting(key, value);
  }, [key, value]);
  return [value, setValue];
}

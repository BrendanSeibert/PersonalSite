import { useState } from 'react';

// A boolean remembered in this browser's localStorage, stored as `onValue` when true. Storage can
// be blocked or throw (private windows, strict settings): then it is just the default, false.
export function useStoredFlag(key: string, onValue: string): [boolean, (next: boolean) => void] {
  const [flag, setFlag] = useState(() => {
    try {
      return localStorage.getItem(key) === onValue;
    } catch {
      return false;
    }
  });
  const set = (next: boolean) => {
    setFlag(next);
    try {
      if (next) localStorage.setItem(key, onValue);
      else localStorage.removeItem(key);
    } catch {
      // not remembered, but the switch still works for this visit
    }
  };
  return [flag, set];
}

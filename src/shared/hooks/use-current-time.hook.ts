import { useSyncExternalStore } from 'react';

const TICK_MS = 30_000;

let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

const tick = () => {
  now = Date.now();
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  if (listeners.size === 0) {
    now = Date.now();
    timer = setInterval(tick, TICK_MS);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
};

const getSnapshot = () => now;

/**
 * Shared, coarse "now" for relative labels ("Сегодня", "вчера").
 * Keeps render pure (no Date.now() in components) and flips labels at midnight.
 */
export const useCurrentTime = () => useSyncExternalStore(subscribe, getSnapshot);

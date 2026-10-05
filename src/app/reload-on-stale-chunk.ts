const LAST_RELOAD_KEY = 'green-api-chat:stale-chunk-reload';
/** A second failure this soon after a reload is a real outage, not a deploy: stop reloading. */
const RELOAD_COOLDOWN_MS = 10_000;

/** Null when storage is blocked: then there is nowhere to keep the cooldown. */
const readLastReload = (): number | null => {
  try {
    return Number(sessionStorage.getItem(LAST_RELOAD_KEY) ?? 0);
  } catch {
    return null;
  }
};

const rememberReload = (at: number): boolean => {
  try {
    sessionStorage.setItem(LAST_RELOAD_KEY, String(at));
    return true;
  } catch {
    return false;
  }
};

/**
 * After a deploy, a tab opened earlier asks for route chunks that no longer exist.
 * Vite reports it as `vite:preloadError`; one reload brings the new build.
 */
export function reloadOnStaleChunk(
  reload: () => void = () => window.location.reload(),
  now: () => number = Date.now,
): () => void {
  const onPreloadError = (event: Event) => {
    const lastReload = readLastReload();
    // Without a remembered cooldown an automatic reload could loop forever (a chunk that never
    // loads): leave it to the error page and its manual "Обновить страницу".
    if (lastReload === null || now() - lastReload < RELOAD_COOLDOWN_MS) return;
    if (!rememberReload(now())) return;
    event.preventDefault();
    reload();
  };
  window.addEventListener('vite:preloadError', onPreloadError);
  return () => window.removeEventListener('vite:preloadError', onPreloadError);
}

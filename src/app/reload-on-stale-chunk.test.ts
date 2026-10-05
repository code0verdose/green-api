import { SharedLib } from '@shared';

import { reloadOnStaleChunk } from './reload-on-stale-chunk';

const preloadError = () => {
  const event = new Event('vite:preloadError', { cancelable: true });
  window.dispatchEvent(event);
  return event;
};

describe('reloadOnStaleChunk', () => {
  it('reloads once to pick up the new build and swallows the error', () => {
    const reload = vi.fn();
    const stop = reloadOnStaleChunk(reload, () => 100_000);

    const event = preloadError();

    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    stop();
  });

  it('does not loop: a second failure right after a reload is left to the error page', () => {
    let clock = 100_000;
    const reload = vi.fn();
    const stop = reloadOnStaleChunk(reload, () => clock);

    preloadError();
    clock += 2_000;
    const second = preloadError();

    expect(reload).toHaveBeenCalledTimes(1);
    expect(second.defaultPrevented).toBe(false);

    clock += 60_000;
    preloadError();
    expect(reload).toHaveBeenCalledTimes(2);
    stop();
  });

  it('never reloads by itself when storage is blocked, so it cannot loop', () => {
    const reload = vi.fn();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    const stop = reloadOnStaleChunk(reload, () => 100_000);

    const event = preloadError();

    expect(reload).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
    stop();
  });

  it('does not reload when the cooldown cannot be saved', () => {
    const reload = vi.fn();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    const stop = reloadOnStaleChunk(reload, () => 100_000);

    preloadError();

    expect(reload).not.toHaveBeenCalled();
    stop();
  });

  it('stops listening on cleanup', () => {
    const reload = vi.fn();
    reloadOnStaleChunk(reload, () => 100_000)();

    preloadError();

    expect(reload).not.toHaveBeenCalled();
  });
});

describe('isStaleChunkError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x/assets/chats-1.js',
    'error loading dynamically imported module',
    'Importing a module script failed.',
  ])('recognises "%s"', (message) => {
    expect(SharedLib.isStaleChunkError(new TypeError(message))).toBe(true);
  });

  it('ignores other errors', () => {
    expect(SharedLib.isStaleChunkError(new Error('boom'))).toBe(false);
    expect(SharedLib.isStaleChunkError('Failed to fetch dynamically imported module')).toBe(false);
  });
});

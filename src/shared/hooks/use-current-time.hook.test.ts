import { act, renderHook } from '@testing-library/react';

import { useCurrentTime } from './use-current-time.hook';

describe('useCurrentTime', () => {
  beforeEach(() => vi.useFakeTimers({ now: Date.UTC(2026, 9, 5, 23, 59, 50) }));
  afterEach(() => vi.useRealTimers());

  it('ticks so that relative labels stay fresh', () => {
    const { result, unmount } = renderHook(() => useCurrentTime());
    const first = result.current;

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current).toBe(first + 30_000);
    unmount();
  });

  it('stops ticking when nobody listens', () => {
    const { unmount } = renderHook(() => useCurrentTime());
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('shares one ticker between subscribers', () => {
    const first = renderHook(() => useCurrentTime());
    const second = renderHook(() => useCurrentTime());
    expect(vi.getTimerCount()).toBe(1);

    first.unmount();
    expect(vi.getTimerCount()).toBe(1);
    second.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

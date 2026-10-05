import { useCallback, useLayoutEffect, useRef } from 'react';

/** How close to the bottom (px) still counts as "reading the latest messages". */
const NEAR_BOTTOM_PX = 80;

interface StickToBottomOptions {
  /** Scroll down even if the user scrolled up — e.g. right after they sent a message. */
  force?: boolean;
}

/**
 * Keeps a scroll container pinned to its bottom while new content arrives,
 * unless the user has scrolled up to read history.
 */
export function useStickToBottom<T>(content: T, { force = false }: StickToBottomOptions = {}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const onScroll = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    isNearBottomRef.current = distance <= NEAR_BOTTOM_PX;
  }, []);

  // Legitimate effect: imperative DOM scrolling has to run after the new content is laid out.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || (!isNearBottomRef.current && !force)) return;
    viewport.scrollTop = viewport.scrollHeight;
    isNearBottomRef.current = true;
  }, [content, force]);

  return { viewportRef, onScroll };
}

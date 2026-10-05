import { render } from '@testing-library/react';

import { useStickToBottom } from './use-stick-to-bottom.hook';

/** jsdom has no layout, so scroll geometry is faked on the element. */
const fakeGeometry = (element: HTMLElement, scrollHeight: number, clientHeight = 300) => {
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: clientHeight });
};

function Feed({ items, force = false }: { items: number; force?: boolean }) {
  const { viewportRef, onScroll } = useStickToBottom(items, { force });
  return <div data-testid="viewport" ref={viewportRef} onScroll={onScroll} />;
}

const setup = () => {
  const view = render(<Feed items={1} />);
  const viewport = view.getByTestId('viewport');
  return { ...view, viewport };
};

describe('useStickToBottom', () => {
  it('follows new content while the user is at the bottom', () => {
    const { viewport, rerender } = setup();
    fakeGeometry(viewport, 1000);

    rerender(<Feed items={2} />);

    expect(viewport.scrollTop).toBe(1000);
  });

  it('keeps the position when the user scrolled up to read history', () => {
    const { viewport, rerender } = setup();
    fakeGeometry(viewport, 1000);
    viewport.scrollTop = 100;
    viewport.dispatchEvent(new Event('scroll'));

    rerender(<Feed items={2} />);

    expect(viewport.scrollTop).toBe(100);
  });

  it('scrolls down anyway when forced (the user just sent a message)', () => {
    const { viewport, rerender } = setup();
    fakeGeometry(viewport, 1000);
    viewport.scrollTop = 100;
    viewport.dispatchEvent(new Event('scroll'));

    rerender(<Feed items={2} force />);

    expect(viewport.scrollTop).toBe(1000);
  });
});

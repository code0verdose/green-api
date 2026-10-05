import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';

import { mswServer } from './msw-server';

// jsdom lacks the browser APIs Mantine relies on (see mantine.dev/guides/vitest).
const { getComputedStyle } = window;
window.getComputedStyle = (element: Element) => getComputedStyle(element);
window.HTMLElement.prototype.scrollIntoView = () => {};
window.HTMLElement.prototype.scrollTo = () => {};
window.scrollTo = () => {};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

if (!('fonts' in document)) {
  Object.defineProperty(document, 'fonts', {
    writable: true,
    value: { addEventListener: () => {}, removeEventListener: () => {} },
  });
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverStub;

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'error' }));
// A test without a single assertion guards nothing.
beforeEach(() => expect.hasAssertions());

// React reports duplicate sibling keys only as a console error, while the DOM silently keeps
// stale nodes (a second chat feed once survived a chat switch). Turn that warning into a failure.
const REACT_KEY_COLLISION = /Encountered two children with the same key/;
let consoleErrorSpy: { mock: { calls: unknown[][] } } | undefined;
beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error');
});
afterEach(() => {
  // A test may have restored its mocks already; the spy keeps its own record either way.
  const collision = (consoleErrorSpy?.mock.calls ?? []).find((args) =>
    args.some((arg) => typeof arg === 'string' && REACT_KEY_COLLISION.test(arg)),
  );
  if (collision) throw new Error(`React key collision: ${String(collision[1] ?? collision[0])}`);
});
afterEach(() => {
  cleanup();
  mswServer.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
});
afterAll(() => mswServer.close());

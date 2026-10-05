import { createLocalId } from './create-local-id.util';

describe('createLocalId', () => {
  it('returns unique ids', () => {
    const ids = new Set(Array.from({ length: 50 }, createLocalId));
    expect(ids.size).toBe(50);
  });

  it('falls back to getRandomValues outside secure contexts', () => {
    const original = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });

    try {
      expect(createLocalId()).toMatch(/^[0-9a-f]{32}$/);
    } finally {
      if (original) Object.defineProperty(crypto, 'randomUUID', original);
    }
  });
});

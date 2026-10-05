import { announceSignOut, isSignOutSignal } from './sign-out-signal.util';

const signalEvent = () =>
  new StorageEvent('storage', {
    key: 'green-api-chat:signed-out',
    newValue: localStorage.getItem('green-api-chat:signed-out'),
  });

describe('sign-out signal', () => {
  it('reaches the tabs of the same instance only', () => {
    announceSignOut('max:1');

    expect(isSignOutSignal(signalEvent(), 'max:1')).toBe(true);
    expect(isSignOutSignal(signalEvent(), 'telegram:2')).toBe(false);
  });

  it('ignores other keys, removals and garbage', () => {
    expect(
      isSignOutSignal(new StorageEvent('storage', { key: 'other', newValue: '{}' }), 'a'),
    ).toBe(false);
    expect(
      isSignOutSignal(
        new StorageEvent('storage', { key: 'green-api-chat:signed-out', newValue: null }),
        'a',
      ),
    ).toBe(false);
    expect(
      isSignOutSignal(
        new StorageEvent('storage', { key: 'green-api-chat:signed-out', newValue: '{oops' }),
        'a',
      ),
    ).toBe(false);
  });

  it('does not break sign-out when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });

    expect(() => announceSignOut('max:1')).not.toThrow();
  });
});

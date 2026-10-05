import { TEST_CREDENTIALS } from '@shared/test/green-api.fixtures';

import { toOwnerKey } from '../../lib/owner-key.util';
import { getActiveMessenger, subscribeToActiveMessenger } from './active-messenger.store';
import { useMessengerPreferenceStore } from './messenger-preference.store';
import { getSession, SESSION_STORAGE_KEY, useSessionStore } from './session.store';

const session = { messenger: 'max' as const, ...TEST_CREDENTIALS };

describe('session store', () => {
  beforeEach(() => useSessionStore.getState().signOut());

  it('keeps the session in sessionStorage, not in localStorage', () => {
    useSessionStore.getState().signIn(session);

    expect(getSession()).toEqual(session);
    expect(JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) ?? '{}')).toMatchObject({
      state: { session },
    });
    expect(JSON.stringify({ ...localStorage })).not.toContain(TEST_CREDENTIALS.apiTokenInstance);
  });

  it('restores a valid session after a reload of the tab', async () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ state: { session }, version: 0 }));

    await useSessionStore.persist.rehydrate();

    expect(getSession()).toEqual(session);
  });

  it('drops a planted session that points the token to another host', async () => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        state: { session: { ...session, apiUrl: 'https://api.green-api.com.evil.example' } },
        version: 0,
      }),
    );

    await useSessionStore.persist.rehydrate();

    expect(getSession()).toBeNull();
  });

  it('drops a tampered session instead of trusting it', async () => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ state: { session: { ...session, messenger: 'whatsapp' } }, version: 0 }),
    );

    await useSessionStore.persist.rehydrate();

    expect(getSession()).toBeNull();
  });

  it('builds the history owner key from messenger and instance', () => {
    expect(toOwnerKey(session)).toBe(`max:${TEST_CREDENTIALS.idInstance}`);
  });
});

describe('active messenger', () => {
  beforeEach(() => {
    useSessionStore.getState().signOut();
    useMessengerPreferenceStore.getState().setMessenger('max');
  });

  it('follows the login choice, then the session', () => {
    const seen: string[] = [];
    const stop = subscribeToActiveMessenger((messenger) => seen.push(messenger));

    useMessengerPreferenceStore.getState().setMessenger('telegram');
    useSessionStore.getState().signIn(session);
    stop();
    useMessengerPreferenceStore.getState().setMessenger('max');

    expect(seen).toEqual(['max', 'telegram', 'max']);
    expect(getActiveMessenger()).toBe('max');
  });

  it('remembers the messenger picked last time', async () => {
    localStorage.setItem(
      'green-api-chat:messenger',
      JSON.stringify({ state: { messenger: 'telegram' }, version: 0 }),
    );

    await useMessengerPreferenceStore.persist.rehydrate();

    expect(useMessengerPreferenceStore.getState().messenger).toBe('telegram');
  });

  it('ignores an unknown stored messenger', async () => {
    localStorage.setItem(
      'green-api-chat:messenger',
      JSON.stringify({ state: { messenger: 'icq' }, version: 0 }),
    );

    await useMessengerPreferenceStore.persist.rehydrate();

    expect(useMessengerPreferenceStore.getState().messenger).toBe('max');
  });
});

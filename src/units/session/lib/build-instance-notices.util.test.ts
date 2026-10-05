import type { SharedApi } from '@shared';

import { buildInstanceNotices } from './build-instance-notices.util';

const healthy: SharedApi.InstanceSettings = {
  webhookUrl: '',
  incomingWebhook: true,
  outgoingWebhook: true,
  outgoingMessageWebhook: true,
  outgoingAPIMessageWebhook: true,
  stateWebhook: true,
};

const ids = (notices: ReturnType<typeof buildInstanceNotices>) =>
  notices.map((notice) => notice.id);

describe('buildInstanceNotices', () => {
  it('is silent for an authorized, correctly configured instance', () => {
    expect(
      buildInstanceNotices({ state: 'authorized', settings: healthy, quotaDescription: null }),
    ).toEqual([]);
  });

  it('is silent while the diagnostics are still loading', () => {
    expect(
      buildInstanceNotices({ state: undefined, settings: undefined, quotaDescription: null }),
    ).toEqual([]);
  });

  it.each(['notAuthorized', 'blocked'] as const)('raises an error for state "%s"', (state) => {
    expect(buildInstanceNotices({ state, settings: healthy, quotaDescription: null })).toEqual([
      expect.objectContaining({ id: 'state', tone: 'error' }),
    ]);
  });

  it.each(['starting', 'suspended', 'pendingPassword', 'unknown'] as const)(
    'warns for state "%s"',
    (state) => {
      expect(
        buildInstanceNotices({ state, settings: healthy, quotaDescription: null })[0],
      ).toMatchObject({ id: 'state', tone: 'warning' });
    },
  );

  it('explains that a webhookUrl blocks HTTP API receiving', () => {
    const notices = buildInstanceNotices({
      state: 'authorized',
      settings: { ...healthy, webhookUrl: 'https://example.org/hook' },
      quotaDescription: null,
    });

    expect(notices).toEqual([
      expect.objectContaining({
        id: 'webhook',
        message: expect.stringMatching(/webhookUrl/) as string,
      }),
    ]);
  });

  it('flags switched-off notification types but not unknown ones', () => {
    expect(
      ids(
        buildInstanceNotices({
          state: 'authorized',
          settings: { ...healthy, incomingWebhook: false, outgoingWebhook: false },
          quotaDescription: null,
        }),
      ),
    ).toEqual(['incoming', 'statuses']);

    expect(
      buildInstanceNotices({
        state: 'authorized',
        settings: { ...healthy, incomingWebhook: null, outgoingWebhook: null },
        quotaDescription: null,
      }),
    ).toEqual([]);
  });

  it('shows the quota description from the notification', () => {
    expect(
      buildInstanceNotices({
        state: 'authorized',
        settings: healthy,
        quotaDescription: 'Monthly quota',
      }),
    ).toEqual([expect.objectContaining({ id: 'quota', message: 'Monthly quota' })]);
  });
});

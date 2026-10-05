import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { SharedApi } from '@shared';
import { apiMethodUrl, TEST_CREDENTIALS } from '@shared/test/green-api.fixtures';
import { mswServer } from '@shared/test/msw-server';
import { renderWithProviders } from '@shared/test/render';

import { useInstanceNoticesStore } from '../service/stores/instance-notices.store';
import { useSessionStore } from '../service/stores/session.store';
import { AccountMenu } from './account-menu.component';
import { InstanceBanner } from './instance-banner.component';

const client = SharedApi.createGreenApiClient(TEST_CREDENTIALS);

const respond = (state: string, settings: Record<string, string>) =>
  mswServer.use(
    http.get(apiMethodUrl('getStateInstance'), () => HttpResponse.json({ stateInstance: state })),
    http.get(apiMethodUrl('getSettings'), () => HttpResponse.json(settings)),
  );

const HEALTHY = { webhookUrl: '', incomingWebhook: 'yes', outgoingWebhook: 'yes' };

describe('InstanceBanner', () => {
  beforeEach(() => useInstanceNoticesStore.getState().clear());

  it('stays hidden for a healthy instance', async () => {
    respond('authorized', HEALTHY);
    renderWithProviders(
      <InstanceBanner client={client} idInstance={TEST_CREDENTIALS.idInstance} />,
    );

    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains why messages will not arrive', async () => {
    respond('notAuthorized', { ...HEALTHY, webhookUrl: 'https://example.org/hook' });
    renderWithProviders(
      <InstanceBanner client={client} idInstance={TEST_CREDENTIALS.idInstance} />,
    );

    expect(await screen.findByText('Входящие не будут приходить')).toBeInTheDocument();
    expect(screen.getByText('Проблема с инстансом')).toBeInTheDocument();
  });

  it('shows a reported tariff quota', async () => {
    respond('authorized', HEALTHY);
    renderWithProviders(
      <InstanceBanner client={client} idInstance={TEST_CREDENTIALS.idInstance} />,
    );

    act(() => useInstanceNoticesStore.getState().reportQuotaExceeded('Monthly quota exceeded'));

    expect(await screen.findByText('Monthly quota exceeded')).toBeInTheDocument();
  });
});

describe('AccountMenu', () => {
  it('renders nothing without a session', () => {
    useSessionStore.getState().signOut();
    renderWithProviders(<AccountMenu onSignOut={() => {}} />);

    expect(screen.queryByRole('button', { name: 'Аккаунт' })).not.toBeInTheDocument();
  });

  it('shows the instance and signs out', async () => {
    useSessionStore.getState().signIn({ messenger: 'telegram', ...TEST_CREDENTIALS });
    const onSignOut = vi.fn();
    renderWithProviders(<AccountMenu onSignOut={onSignOut} />);

    await userEvent.click(screen.getByRole('button', { name: 'Аккаунт' }));

    expect(
      await screen.findByText(`Telegram · инстанс ${TEST_CREDENTIALS.idInstance}`),
    ).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Личный кабинет GREEN-API' })).toHaveAttribute(
      'href',
      'https://console.green-api.com',
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Выйти' }));
    expect(onSignOut).toHaveBeenCalled();
  });
});

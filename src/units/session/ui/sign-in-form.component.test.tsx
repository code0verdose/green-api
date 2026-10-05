import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { apiMethodUrl, TEST_CREDENTIALS } from '@shared/test/green-api.fixtures';
import { mswServer } from '@shared/test/msw-server';
import { renderWithProviders } from '@shared/test/render';

import { useMessengerPreferenceStore } from '../service/stores/messenger-preference.store';
import { useSessionStore } from '../service/stores/session.store';
import { SignInForm } from './sign-in-form.component';

const respondState = (respond: () => Response) =>
  mswServer.use(http.get(apiMethodUrl('getStateInstance'), respond));

async function fillAndSubmit({
  idInstance = TEST_CREDENTIALS.idInstance,
  token = TEST_CREDENTIALS.apiTokenInstance,
  apiUrl = TEST_CREDENTIALS.apiUrl,
} = {}) {
  if (idInstance) await userEvent.type(screen.getByLabelText('idInstance'), idInstance);
  if (token) await userEvent.type(screen.getByLabelText('apiTokenInstance'), token);
  const url = screen.getByLabelText('apiUrl');
  await userEvent.clear(url);
  if (apiUrl) await userEvent.type(url, apiUrl);
  await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
}

describe('SignInForm', () => {
  beforeEach(() => {
    useSessionStore.getState().signOut();
    useMessengerPreferenceStore.getState().setMessenger('telegram');
  });

  it('validates every field inline without calling the API', async () => {
    const onSignedIn = vi.fn();
    renderWithProviders(<SignInForm onSignedIn={onSignedIn} />);

    await fillAndSubmit({ idInstance: '', token: '', apiUrl: 'https://evil.example.com' });

    expect(await screen.findByText('Введите idInstance')).toBeInTheDocument();
    expect(screen.getByText('Введите apiTokenInstance')).toBeInTheDocument();
    expect(screen.getByText(/Укажите адрес GREEN-API из личного кабинета/)).toBeInTheDocument();
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it('checks the instance and stores the session of the chosen messenger', async () => {
    respondState(() => HttpResponse.json({ stateInstance: 'authorized' }));
    const onSignedIn = vi.fn();
    renderWithProviders(<SignInForm onSignedIn={onSignedIn} />);

    await fillAndSubmit();

    await waitFor(() => expect(onSignedIn).toHaveBeenCalled());
    expect(useSessionStore.getState().session).toEqual({
      messenger: 'telegram',
      idInstance: TEST_CREDENTIALS.idInstance,
      apiTokenInstance: TEST_CREDENTIALS.apiTokenInstance,
      apiUrl: TEST_CREDENTIALS.apiUrl,
    });
  });

  it.each([
    [
      'a wrong token',
      () => HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      'Неверный idInstance или apiTokenInstance.',
    ],
    [
      'an unauthorized instance',
      () => HttpResponse.json({ stateInstance: 'notAuthorized' }),
      /Инстанс не авторизован/,
    ],
    ['a network failure', () => HttpResponse.error(), /Нет связи с GREEN-API/],
  ])('explains %s and keeps the user on the form', async (_case, respond, message) => {
    respondState(respond);
    const onSignedIn = vi.fn();
    renderWithProviders(<SignInForm onSignedIn={onSignedIn} />);

    await fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(onSignedIn).not.toHaveBeenCalled();
    expect(useSessionStore.getState().session).toBeNull();
    expect(screen.getByLabelText('idInstance')).toHaveValue(TEST_CREDENTIALS.idInstance);
  });

  it('swaps the suggested apiUrl with the messenger, but not a typed one', async () => {
    renderWithProviders(<SignInForm onSignedIn={() => {}} />);
    // Uncontrolled Mantine inputs are re-keyed on setFieldValue: always query the current node.
    const apiUrl = () => screen.getByLabelText('apiUrl');
    expect(apiUrl()).toHaveValue('https://4100.api.green-api.com');

    await userEvent.click(screen.getByText('MAX'));
    expect(apiUrl()).toHaveValue('https://3100.api.green-api.com');
    expect(useMessengerPreferenceStore.getState().messenger).toBe('max');

    await userEvent.clear(apiUrl());
    await userEvent.type(apiUrl(), 'https://7103.api.greenapi.com');
    await userEvent.click(screen.getByText('Telegram'));
    expect(apiUrl()).toHaveValue('https://7103.api.greenapi.com');
  });
});

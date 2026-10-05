import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { SharedApi } from '@shared';
import { apiMethodUrl, TEST_CREDENTIALS } from '@shared/test/green-api.fixtures';
import { mswServer } from '@shared/test/msw-server';
import { renderWithProviders } from '@shared/test/render';

import { detachChatHistory, useChatStore } from '../service/stores/chat.store';
import { NewChatModal } from './new-chat-modal.component';

const client = SharedApi.createGreenApiClient(TEST_CREDENTIALS);

function setup(messenger: 'max' | 'telegram', account: { exist: boolean; chatId: string }) {
  const checked: unknown[] = [];
  mswServer.use(
    http.post(apiMethodUrl('checkAccount'), async ({ request }) => {
      checked.push(await request.json());
      return HttpResponse.json(account);
    }),
  );
  const onCreated = vi.fn();
  renderWithProviders(
    <NewChatModal
      opened
      onClose={() => {}}
      client={client}
      messenger={messenger}
      onCreated={onCreated}
    />,
  );
  return { checked, onCreated };
}

const submit = async (value: string) => {
  await userEvent.type(await screen.findByRole('textbox'), value);
  await userEvent.click(screen.getByRole('button', { name: 'Создать чат' }));
};

describe('NewChatModal', () => {
  beforeEach(() => detachChatHistory());

  it('resolves the number with CheckAccount and opens the chat', async () => {
    const { checked, onCreated } = setup('max', { exist: true, chatId: '10000000' });

    await submit('8 (999) 123-45-67');

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('10000000'));
    expect(checked).toEqual([{ phoneNumber: 79991234567 }]);
    expect(useChatStore.getState().chats['10000000']?.title).toBe('+7 999 123-45-67');
  });

  it('validates locally and does not call the API for a foreign number in MAX', async () => {
    const { checked } = setup('max', { exist: true, chatId: '1' });

    await submit('+1 202 555 0100');

    expect(
      await screen.findByText('MAX: только номера России (+7) и Беларуси (+375)'),
    ).toBeInTheDocument();
    expect(checked).toEqual([]);
  });

  it('shows why the chat cannot be created when there is no account', async () => {
    const { onCreated } = setup('max', { exist: false, chatId: '' });

    await submit('+7 999 123-45-67');

    expect(await screen.findByText('У этого номера нет аккаунта MAX.')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('accepts a Telegram @username', async () => {
    const { checked, onCreated } = setup('telegram', { exist: true, chatId: '555' });

    await submit('@durov');

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('555'));
    expect(checked).toEqual([{ username: '@durov' }]);
    expect(screen.getByText('Номер телефона или @username')).toBeInTheDocument();
  });
});

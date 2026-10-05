import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { SharedApi } from '@shared';
import { apiMethodUrl, TEST_CREDENTIALS } from '@shared/test/green-api.fixtures';
import { mswServer } from '@shared/test/msw-server';
import { renderWithProviders } from '@shared/test/render';

import { detachChatHistory, useChatStore } from '../service/stores/chat.store';
import { MessageComposer } from './message-composer.component';

const client = SharedApi.createGreenApiClient(TEST_CREDENTIALS);

function setup(maxLength = 4000) {
  const sent: unknown[] = [];
  mswServer.use(
    http.post(apiMethodUrl('sendMessage'), async ({ request }) => {
      sent.push(await request.json());
      return HttpResponse.json({ idMessage: `api-${sent.length}` });
    }),
  );
  renderWithProviders(<MessageComposer chatId="c" client={client} maxLength={maxLength} />);
  return { sent, input: screen.getByRole('textbox', { name: 'Текст сообщения' }) };
}

describe('MessageComposer', () => {
  beforeEach(() => {
    detachChatHistory();
    useChatStore
      .getState()
      .openChat({ chatId: 'c', title: 'C', phone: null, username: null, now: 0 });
  });

  it('sends with Enter, trims the edges and clears the field', async () => {
    const { sent, input } = setup();

    await userEvent.type(input, '  Привет, мир  {Enter}');

    await waitFor(() => expect(sent).toEqual([{ chatId: 'c', message: 'Привет, мир' }]));
    expect(input).toHaveValue('');
    expect(useChatStore.getState().messages.c?.[0]).toMatchObject({ text: 'Привет, мир' });
  });

  it('breaks the line with Shift+Enter instead of sending', async () => {
    const { sent, input } = setup();

    await userEvent.type(input, 'строка 1{Shift>}{Enter}{/Shift}строка 2');

    expect(input).toHaveValue('строка 1\nстрока 2');
    expect(sent).toEqual([]);
  });

  it('does not send while an IME composition is in progress', () => {
    const { sent, input } = setup();
    fireEvent.change(input, { target: { value: 'にほん' } });

    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });

    expect(input).toHaveValue('にほん');
    expect(sent).toEqual([]);
  });

  it('sends with the button too', async () => {
    const { sent, input } = setup();
    await userEvent.type(input, 'Кнопкой');

    await userEvent.click(screen.getByRole('button', { name: 'Отправить' }));

    await waitFor(() => expect(sent).toHaveLength(1));
  });

  it('keeps the button disabled for whitespace only', async () => {
    const { input } = setup();

    await userEvent.type(input, '   ');

    expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled();
  });

  it('shows a counter near the limit and blocks sending above it', async () => {
    const { sent, input } = setup(10);

    await userEvent.type(input, '123456789');
    expect(screen.getByText('9 / 10')).toBeInTheDocument();

    await userEvent.type(input, '01{Enter}');
    expect(screen.getByText('11 / 10')).toHaveAttribute('data-over', 'true');
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled();
    expect(sent).toEqual([]);
  });
});

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { SharedApi } from '@shared';
import { apiMethodUrl, TEST_CREDENTIALS } from '@shared/test/green-api.fixtures';
import { mswServer } from '@shared/test/msw-server';
import { renderWithProviders } from '@shared/test/render';

import { useChatStore } from '../service/stores/chat.store';
import { detachChatHistory } from '../service/stores/chat.store';
import { MessageFeed } from './message-feed.component';

const client = SharedApi.createGreenApiClient(TEST_CREDENTIALS);
const TODAY = Date.now();

const store = () => useChatStore.getState();

describe('MessageFeed', () => {
  beforeEach(() => {
    detachChatHistory();
    store().openChat({ chatId: 'c', title: 'C', phone: null, username: null, now: 0 });
  });

  it('invites to write the first message in an empty chat', () => {
    renderWithProviders(<MessageFeed chatId="c" client={client} />);

    expect(screen.getByText('Сообщений пока нет')).toBeInTheDocument();
  });

  it('renders messages under a day separator inside an accessible log', () => {
    store().receiveMessage({
      direction: 'incoming',
      chatId: 'c',
      chatName: null,
      phone: null,
      idMessage: 'in-1',
      timestamp: TODAY,
      kind: 'text',
      text: 'Привет от собеседника',
      localId: 'l1',
      isActive: true,
      viaApi: false,
    });
    store().addPendingMessage({ chatId: 'c', localId: 'l2', text: 'Ответ', timestamp: TODAY + 1 });

    renderWithProviders(<MessageFeed chatId="c" client={client} />);

    const log = screen.getByRole('log', { name: 'Сообщения' });
    expect(within(log).getByRole('separator', { name: 'Сегодня' })).toBeInTheDocument();
    expect(within(log).getByText('Привет от собеседника')).toBeInTheDocument();
    expect(within(log).getByRole('img', { name: 'Отправляется' })).toBeInTheDocument();
  });

  it('retries a failed message from its bubble', async () => {
    mswServer.use(
      http.post(apiMethodUrl('sendMessage'), () => HttpResponse.json({ idMessage: 'api-1' })),
    );
    store().addPendingMessage({ chatId: 'c', localId: 'l1', text: 'Не ушло', timestamp: TODAY });
    store().markMessageFailed({ chatId: 'c', localId: 'l1', error: 'Нет связи с GREEN-API.' });
    renderWithProviders(<MessageFeed chatId="c" client={client} />);

    expect(screen.getByText('Нет связи с GREEN-API.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Отправлено' })).toBeInTheDocument(),
    );
    expect(screen.queryByText('Нет связи с GREEN-API.')).not.toBeInTheDocument();
  });

  it('marks unsupported messages and read receipts', () => {
    store().receiveMessage({
      direction: 'incoming',
      chatId: 'c',
      chatName: null,
      phone: null,
      idMessage: 'in-1',
      timestamp: TODAY,
      kind: 'unsupported',
      text: 'Фото — этот тип сообщений здесь не поддерживается',
      localId: 'l1',
      isActive: true,
      viaApi: false,
    });
    store().addPendingMessage({ chatId: 'c', localId: 'l2', text: 'Видел?', timestamp: TODAY + 1 });
    store().markMessageSent({ chatId: 'c', localId: 'l2', idMessage: 'api-2' });
    store().applyStatus({ chatId: 'c', idMessage: 'api-2', status: 'read', reason: null });

    renderWithProviders(<MessageFeed chatId="c" client={client} />);

    expect(screen.getByText(/этот тип сообщений здесь не поддерживается/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Прочитано' })).toBeInTheDocument();
  });
});

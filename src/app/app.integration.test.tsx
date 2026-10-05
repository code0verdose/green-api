import { MantineProvider } from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';

import { ChatService } from '@units/chat';
import { NotificationService } from '@units/notification';
import { SessionService } from '@units/session';
import {
  apiMethodUrl,
  incomingTextNotification,
  TEST_CREDENTIALS,
} from '@shared/test/green-api.fixtures';
import { mswServer } from '@shared/test/msw-server';

import { AppProviders } from './providers';
import { createQueryClient } from './query-client.config';
import { routeTree } from './route-tree.gen';

const SESSION = { messenger: 'telegram' as const, ...TEST_CREDENTIALS };
const OWNER = `${SESSION.messenger}:${SESSION.idInstance}`;
const HISTORY_KEY = `green-api-chat:chats:${OWNER}`;

/** GREEN-API notification queue: ReceiveNotification returns the head until it is deleted. */
function fakeQueue(bodies: unknown[] = []) {
  const queue = bodies.map((body, index) => ({ receiptId: index + 1, body }));
  const deleted: number[] = [];
  mswServer.use(
    // Holds the request like a real long poll and answers as soon as something is queued.
    http.get(apiMethodUrl('receiveNotification'), async () => {
      for (let waited = 0; waited < 1500; waited += 20) {
        const head = queue[0];
        if (head) return HttpResponse.json(head);
        await delay(20);
      }
      return HttpResponse.json(null);
    }),
    http.delete(new RegExp(`${apiMethodUrl('deleteNotification')}/\\d+$`), ({ request }) => {
      const id = Number(request.url.split('/').at(-1));
      deleted.push(id);
      queue.splice(
        queue.findIndex((item) => item.receiptId === id),
        1,
      );
      return HttpResponse.json({ result: true });
    }),
    http.get(apiMethodUrl('getStateInstance'), () =>
      HttpResponse.json({ stateInstance: 'authorized' }),
    ),
    http.get(apiMethodUrl('getSettings'), () =>
      HttpResponse.json({ webhookUrl: '', incomingWebhook: 'yes', outgoingWebhook: 'yes' }),
    ),
  );
  return { deleted, push: (body: unknown) => queue.push({ receiptId: 100 + queue.length, body }) };
}

function renderApp(path: string) {
  const queryClient = createQueryClient();
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(
    <MantineProvider env="test">
      <Notifications />
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>,
  );
  return router;
}

/** A chat of the signed-in instance; history of another owner would be wiped by the guard. */
const openChat = (chatId: string, title: string) => {
  const store = ChatService.useChatStore.getState();
  ChatService.activateChatOwner(OWNER);
  store.openChat({ chatId, title, phone: null, username: null, now: Date.now() });
};

describe('application', () => {
  beforeEach(() => {
    SessionService.useSessionStore.getState().signOut();
    ChatService.detachChatHistory();
    NotificationService.useConnectionStatusStore.setState({ status: 'idle', restartToken: 0 });
  });
  afterEach(() => {
    act(() => {
      notifications.clean();
    });
  });

  it('sends a guest to the login and remembers where they wanted to go', async () => {
    const router = renderApp('/chats/10000000');

    expect(await screen.findByRole('heading', { name: 'Вход в чат' })).toBeInTheDocument();
    expect(router.state.location.search).toEqual({ redirect: '/chats/10000000' });
  });

  it('signs in and opens the chat list', async () => {
    fakeQueue();
    const router = renderApp('/');
    await screen.findByRole('heading', { name: 'Вход в чат' });

    await userEvent.click(screen.getByText('Telegram'));
    await userEvent.type(screen.getByLabelText('idInstance'), TEST_CREDENTIALS.idInstance);
    await userEvent.type(
      screen.getByLabelText('apiTokenInstance'),
      TEST_CREDENTIALS.apiTokenInstance,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByRole('heading', { name: 'Чаты' })).toBeInTheDocument();
    expect(screen.getByText('Выберите чат или начните новый')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(SessionService.getSession()).toEqual(SESSION);
  });

  it('keeps a signed-in user away from the login page', async () => {
    fakeQueue();
    SessionService.useSessionStore.getState().signIn(SESSION);

    const router = renderApp('/login');

    expect(await screen.findByRole('heading', { name: 'Чаты' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('redirects an unknown chat to the list', async () => {
    fakeQueue();
    SessionService.useSessionStore.getState().signIn(SESSION);

    const router = renderApp('/chats/404');

    await screen.findByRole('heading', { name: 'Чаты' });
    expect(router.state.location.pathname).toBe('/');
  });

  it('receives a reply into the open chat, reads it and acknowledges the notification', async () => {
    const queue = fakeQueue([incomingTextNotification]);
    SessionService.useSessionStore.getState().signIn(SESSION);
    openChat('10000000', '+7 999 888-77-66');

    renderApp('/chats/10000000');

    const log = await screen.findByRole('log', { name: 'Сообщения' });
    await waitFor(() =>
      expect(log).toHaveTextContent('Я использую GREEN-API для отправки этого сообщения!'),
    );
    expect(screen.getByRole('heading', { name: 'Василиса Премудрая' })).toBeInTheDocument();
    expect(queue.deleted).toEqual([1]);
    expect(ChatService.useChatStore.getState().chats['10000000']?.unread).toBe(0);
    expect(screen.getByRole('status')).toHaveTextContent('В сети');
  });

  it('counts a message in another chat as unread and reflects instance events', async () => {
    const queue = fakeQueue();
    SessionService.useSessionStore.getState().signIn(SESSION);
    openChat('20000000', 'Другой чат');
    renderApp('/chats/20000000');
    await screen.findByRole('log');

    queue.push(incomingTextNotification);
    queue.push({ typeWebhook: 'stateInstanceChanged', stateInstance: 'notAuthorized' });

    expect(await screen.findByLabelText('Непрочитанных: 1')).toBeInTheDocument();
    expect(await screen.findByText('Проблема с инстансом')).toBeInTheDocument();
  });

  it('signs out when the token stops working', async () => {
    mswServer.use(
      http.get(apiMethodUrl('receiveNotification'), () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      ),
      http.get(apiMethodUrl('getStateInstance'), () =>
        HttpResponse.json({ stateInstance: 'authorized' }),
      ),
      http.get(apiMethodUrl('getSettings'), () => HttpResponse.json({})),
    );
    SessionService.useSessionStore.getState().signIn(SESSION);
    openChat('10000000', 'Чат');

    const router = renderApp('/chats/10000000');

    expect(await screen.findByText('Сессия завершена')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(SessionService.getSession()).toBeNull();
    expect(ChatService.useChatStore.getState().chats).toEqual({});
    // A changed token is not a reason to lose the conversation: it comes back on the next sign-in.
    expect(localStorage.getItem(HISTORY_KEY)).toContain('10000000');
    expect(screen.queryByText('Что-то сломалось')).not.toBeInTheDocument();
  });

  it('stops receiving and says why when a webhook URL is configured', async () => {
    mswServer.use(
      http.get(apiMethodUrl('receiveNotification'), () =>
        HttpResponse.json(
          { message: 'Message cannot be received because custom webhook url is set' },
          { status: 400 },
        ),
      ),
      http.get(apiMethodUrl('getStateInstance'), () =>
        HttpResponse.json({ stateInstance: 'authorized' }),
      ),
      http.get(apiMethodUrl('getSettings'), () => HttpResponse.json({})),
    );
    SessionService.useSessionStore.getState().signIn(SESSION);
    openChat('10000000', 'Чат');

    renderApp('/chats/10000000');

    expect(await screen.findByText('Входящие сообщения не приходят')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Получение сообщений остановлено');
    expect(await screen.findByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });

  it('signs out from the account menu and forgets the history', async () => {
    fakeQueue();
    SessionService.useSessionStore.getState().signIn(SESSION);
    openChat('10000000', 'Чат');
    const router = renderApp('/');
    await screen.findByRole('heading', { name: 'Чаты' });

    await userEvent.click(screen.getByRole('button', { name: 'Аккаунт' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Выйти' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(ChatService.useChatStore.getState().chats).toEqual({});
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
    expect(screen.queryByText('Что-то сломалось')).not.toBeInTheDocument();
  });

  it('follows a sign-out made in another tab of the same instance', async () => {
    fakeQueue();
    SessionService.useSessionStore.getState().signIn(SESSION);
    openChat('10000000', 'Чат');
    const router = renderApp('/');
    await screen.findByRole('heading', { name: 'Чаты' });

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'green-api-chat:signed-out',
          newValue: JSON.stringify({ ownerKey: OWNER, at: Date.now() }),
        }),
      );
    });

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(SessionService.getSession()).toBeNull();
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
  });

  it('ignores a sign-out of another instance', async () => {
    fakeQueue();
    SessionService.useSessionStore.getState().signIn(SESSION);
    const router = renderApp('/');
    await screen.findByRole('heading', { name: 'Чаты' });

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'green-api-chat:signed-out',
          newValue: JSON.stringify({ ownerKey: 'max:1', at: Date.now() }),
        }),
      );
    });

    expect(router.state.location.pathname).toBe('/');
    expect(SessionService.getSession()).toEqual(SESSION);
  });

  it('treats /chats/constructor as an unknown chat, not as Object.prototype', async () => {
    fakeQueue();
    SessionService.useSessionStore.getState().signIn(SESSION);
    openChat('10000000', 'Чат');

    const router = renderApp('/chats/constructor');

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(ChatService.useChatStore.getState().chats).toHaveProperty('10000000');
    expect(localStorage.getItem(HISTORY_KEY)).toContain('10000000');
  });

  it('applies delivery statuses and tariff quota notifications', async () => {
    const queue = fakeQueue();
    SessionService.useSessionStore.getState().signIn(SESSION);
    openChat('10000000', 'Чат');
    ChatService.useChatStore.getState().addPendingMessage({
      chatId: '10000000',
      localId: 'l1',
      text: 'Привет',
      timestamp: Date.now(),
    });
    ChatService.useChatStore
      .getState()
      .markMessageSent({ chatId: '10000000', localId: 'l1', idMessage: 'api-1' });
    renderApp('/chats/10000000');
    await screen.findByRole('log');

    queue.push({
      typeWebhook: 'outgoingMessageStatus',
      chatId: '10000000',
      idMessage: 'api-1',
      status: 'read',
      timestamp: 1,
    });
    queue.push({
      typeWebhook: 'quotaExceeded',
      quotaData: { description: 'Monthly quota exceeded' },
    });

    expect(
      await within(screen.getByRole('log')).findByRole('img', { name: 'Прочитано' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Monthly quota exceeded')).toBeInTheDocument();
  });

  it('opens a newly created chat from the sidebar', async () => {
    fakeQueue();
    mswServer.use(
      http.post(apiMethodUrl('checkAccount'), () =>
        HttpResponse.json({ exist: true, chatId: '10000000' }),
      ),
    );
    SessionService.useSessionStore.getState().signIn(SESSION);
    const router = renderApp('/');
    await screen.findByRole('heading', { name: 'Чаты' });

    await userEvent.click(screen.getAllByRole('button', { name: 'Новый чат' })[0] as HTMLElement);
    await userEvent.type(
      await screen.findByRole('textbox', { name: /Номер телефона/ }),
      '+79991234567',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Создать чат' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/chats/10000000'));
    expect(await screen.findByRole('heading', { name: '+7 999 123-45-67' })).toBeInTheDocument();
  });

  it('shows exactly one feed and one composer after switching chats', async () => {
    fakeQueue();
    SessionService.useSessionStore.getState().signIn(SESSION);
    openChat('10000000', 'Первый');
    openChat('20000000', 'Второй');
    ChatService.useChatStore.getState().addPendingMessage({
      chatId: '10000000',
      localId: 'l1',
      text: 'Только в первом',
      timestamp: Date.now(),
    });
    const router = renderApp('/chats/10000000');
    await screen.findByText('Только в первом');

    await act(() => router.navigate({ to: '/chats/$chatId', params: { chatId: '20000000' } }));

    expect(await screen.findByRole('heading', { name: 'Второй' })).toBeInTheDocument();
    expect(screen.getAllByRole('log')).toHaveLength(1);
    expect(screen.getAllByRole('textbox', { name: 'Текст сообщения' })).toHaveLength(1);
    expect(screen.queryByText('Только в первом')).not.toBeInTheDocument();
  });

  it('shows a not-found page for an unknown address', async () => {
    renderApp('/no/such/page');

    expect(await screen.findByRole('heading', { name: 'Страница не найдена' })).toBeInTheDocument();
  });
});

describe('AppProviders', () => {
  it('boots the real router and lands a guest on the login', async () => {
    SessionService.useSessionStore.getState().signOut();

    render(<AppProviders />);

    expect(await screen.findByRole('heading', { name: 'Вход в чат' })).toBeInTheDocument();
  });
});

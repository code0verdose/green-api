import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { SharedApi } from '@shared';
import { apiMethodUrl, TEST_CREDENTIALS } from '@shared/test/green-api.fixtures';
import { mswServer } from '@shared/test/msw-server';
import { createWrapper } from '@shared/test/render';

import { detachChatHistory, useChatStore } from '../stores/chat.store';
import { useCreateChatMutation } from './create-chat.mutation';
import { useSendMessageMutation } from './send-message.mutation';

const client = SharedApi.createGreenApiClient(TEST_CREDENTIALS);
const messagesOf = (chatId: string) => useChatStore.getState().messages[chatId] ?? [];

describe('chat mutations', () => {
  beforeEach(() => detachChatHistory());

  describe('useCreateChatMutation', () => {
    it('opens a chat titled by the formatted phone', async () => {
      mswServer.use(
        http.post(apiMethodUrl('checkAccount'), () =>
          HttpResponse.json({ exist: true, chatId: '10000000' }),
        ),
      );
      const { result } = renderHook(() => useCreateChatMutation({ client, messenger: 'max' }), {
        wrapper: createWrapper(),
      });

      await act(() => result.current.mutateAsync({ kind: 'phone', phone: '79991234567' }));

      expect(useChatStore.getState().chats['10000000']).toMatchObject({
        title: '+7 999 123-45-67',
        phone: '79991234567',
      });
    });

    it('opens a Telegram chat by @username', async () => {
      mswServer.use(
        http.post(apiMethodUrl('checkAccount'), () =>
          HttpResponse.json({ exist: true, chatId: '555', username: '@durov' }),
        ),
      );
      const { result } = renderHook(
        () => useCreateChatMutation({ client, messenger: 'telegram' }),
        { wrapper: createWrapper() },
      );

      await act(() => result.current.mutateAsync({ kind: 'username', username: '@durov' }));

      expect(useChatStore.getState().chats['555']).toMatchObject({
        title: '@durov',
        username: '@durov',
        phone: null,
      });
    });
  });

  describe('useSendMessageMutation', () => {
    beforeEach(() =>
      useChatStore
        .getState()
        .openChat({ chatId: 'c', title: 'C', phone: null, username: null, now: 0 }),
    );

    it('shows the message as pending at once, then sent with the idMessage', async () => {
      let release!: () => void;
      mswServer.use(
        http.post(apiMethodUrl('sendMessage'), async () => {
          await new Promise<void>((resolve) => (release = resolve));
          return HttpResponse.json({ idMessage: 'api-1' });
        }),
      );
      const { result } = renderHook(() => useSendMessageMutation(client), {
        wrapper: createWrapper(),
      });

      act(() => result.current.mutate({ chatId: 'c', localId: 'l1', text: 'Привет' }));

      await waitFor(() => expect(messagesOf('c')[0]?.status).toBe('pending'));
      release();
      await waitFor(() =>
        expect(messagesOf('c')[0]).toMatchObject({ status: 'sent', idMessage: 'api-1' }),
      );
    });

    it('keeps the text and marks the bubble failed with a readable reason', async () => {
      mswServer.use(http.post(apiMethodUrl('sendMessage'), () => HttpResponse.error()));
      const { result } = renderHook(() => useSendMessageMutation(client), {
        wrapper: createWrapper(),
      });

      act(() => result.current.mutate({ chatId: 'c', localId: 'l1', text: 'Привет' }));

      await waitFor(() =>
        expect(messagesOf('c')[0]).toMatchObject({
          status: 'failed',
          text: 'Привет',
          error: expect.stringMatching(/не подтвердил отправку/) as string,
        }),
      );
    });

    it('retries a failed message in the same bubble', async () => {
      mswServer.use(
        http.post(apiMethodUrl('sendMessage'), () => HttpResponse.json({ idMessage: 'api-2' })),
      );
      useChatStore
        .getState()
        .addPendingMessage({ chatId: 'c', localId: 'l1', text: 'Привет', timestamp: 1 });
      useChatStore.getState().markMessageFailed({ chatId: 'c', localId: 'l1', error: 'x' });
      const { result } = renderHook(() => useSendMessageMutation(client), {
        wrapper: createWrapper(),
      });

      await act(() =>
        result.current.mutateAsync({ chatId: 'c', localId: 'l1', text: 'Привет', isRetry: true }),
      );

      expect(messagesOf('c')).toHaveLength(1);
      expect(messagesOf('c')[0]).toMatchObject({ status: 'sent', idMessage: 'api-2' });
    });
  });
});

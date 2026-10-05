import { http, HttpResponse } from 'msw';

import { apiMethodUrl, TEST_CREDENTIALS } from '@shared/test/green-api.fixtures';
import { mswServer } from '@shared/test/msw-server';

import { createGreenApiClient } from './green-api.client';
import { GreenApiError } from './green-api.errors';

const client = createGreenApiClient(TEST_CREDENTIALS);

const catchError = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the call to fail');
};

describe('createGreenApiClient', () => {
  describe('request format', () => {
    it('calls getStateInstance with GET on {apiUrl}/waInstance{id}/{method}/{token}', async () => {
      mswServer.use(
        http.get(apiMethodUrl('getStateInstance'), () =>
          HttpResponse.json({ stateInstance: 'authorized' }),
        ),
      );

      await expect(client.getStateInstance()).resolves.toEqual({ stateInstance: 'authorized' });
    });

    it('never lets the browser cache a response: the URL carries the token', async () => {
      const fetchFn = vi.fn<typeof fetch>(() =>
        Promise.resolve(HttpResponse.json({ stateInstance: 'authorized' })),
      );

      await createGreenApiClient(TEST_CREDENTIALS, { fetchFn }).getStateInstance();

      expect(fetchFn).toHaveBeenCalledWith(
        expect.stringContaining('/getStateInstance/'),
        expect.objectContaining({ cache: 'no-store' }),
      );
    });

    it('encodes the token so it cannot change the request path', async () => {
      const fetchFn = vi.fn<typeof fetch>(() =>
        Promise.resolve(HttpResponse.json({ stateInstance: 'authorized' })),
      );

      await createGreenApiClient(
        { ...TEST_CREDENTIALS, apiTokenInstance: '../x?y#z' },
        { fetchFn },
      ).getStateInstance();

      expect(fetchFn.mock.calls[0]?.[0]).toBe(
        `${TEST_CREDENTIALS.apiUrl}/waInstance${TEST_CREDENTIALS.idInstance}/getStateInstance/..%2Fx%3Fy%23z`,
      );
    });

    it('ignores a trailing slash in apiUrl', async () => {
      mswServer.use(
        http.get(apiMethodUrl('getStateInstance'), () =>
          HttpResponse.json({ stateInstance: 'starting' }),
        ),
      );
      const slashed = createGreenApiClient({
        ...TEST_CREDENTIALS,
        apiUrl: `${TEST_CREDENTIALS.apiUrl}/`,
      });

      await expect(slashed.getStateInstance()).resolves.toEqual({ stateInstance: 'starting' });
    });

    it('posts sendMessage as JSON and returns idMessage', async () => {
      let received: { body: unknown; contentType: string | null } | undefined;
      mswServer.use(
        http.post(apiMethodUrl('sendMessage'), async ({ request }) => {
          received = {
            body: await request.json(),
            contentType: request.headers.get('Content-Type'),
          };
          return HttpResponse.json({ idMessage: '1763115112345' });
        }),
      );

      const result = await client.sendMessage({ chatId: '10000000', message: 'Привет' });

      expect(result).toEqual({ idMessage: '1763115112345' });
      expect(received).toEqual({
        body: { chatId: '10000000', message: 'Привет' },
        contentType: 'application/json',
      });
    });

    it('sends checkAccount by phone number as a number', async () => {
      let body: unknown;
      mswServer.use(
        http.post(apiMethodUrl('checkAccount'), async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ exist: true, chatId: '10000000', fromCache: true });
        }),
      );

      const result = await client.checkAccount({ phoneNumber: 79991234567 });

      expect(body).toEqual({ phoneNumber: 79991234567 });
      expect(result).toEqual({ exist: true, chatId: '10000000', username: null });
    });

    it('sends checkAccount by Telegram username and returns the username', async () => {
      let body: unknown;
      mswServer.use(
        http.post(apiMethodUrl('checkAccount'), async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({
            exist: true,
            chatId: '10000000',
            username: '@username',
            phoneNumber: 79876543210,
          });
        }),
      );

      const result = await client.checkAccount({ username: '@username' });

      expect(body).toEqual({ username: '@username' });
      expect(result).toEqual({ exist: true, chatId: '10000000', username: '@username' });
    });

    it('turns a checkAccount "status: false" body into a typed error', async () => {
      mswServer.use(
        http.post(apiMethodUrl('checkAccount'), () =>
          HttpResponse.json({ status: false, reason: 'instance is starting or not authorized' }),
        ),
      );

      const error = await catchError(client.checkAccount({ phoneNumber: 79991234567 }));

      expect(error).toBeInstanceOf(GreenApiError);
      expect((error as GreenApiError).kind).toBe('instance-not-ready');
    });

    it('reads settings that matter for HTTP API receiving', async () => {
      mswServer.use(
        http.get(apiMethodUrl('getSettings'), () =>
          HttpResponse.json({
            wid: '79876543210@c.us',
            webhookUrl: '',
            incomingWebhook: 'yes',
            outgoingWebhook: 'yes',
            outgoingMessageWebhook: 'no',
            outgoingAPIMessageWebhook: 'yes',
            stateWebhook: 'yes',
            delaySendMessagesMilliseconds: 1000,
          }),
        ),
      );

      await expect(client.getSettings()).resolves.toEqual({
        webhookUrl: '',
        incomingWebhook: true,
        outgoingWebhook: true,
        outgoingMessageWebhook: false,
        outgoingAPIMessageWebhook: true,
        stateWebhook: true,
      });
    });

    it('treats missing settings as unknown (null), not as "off"', async () => {
      mswServer.use(http.get(apiMethodUrl('getSettings'), () => HttpResponse.json({})));

      await expect(client.getSettings()).resolves.toEqual({
        webhookUrl: '',
        incomingWebhook: null,
        outgoingWebhook: null,
        outgoingMessageWebhook: null,
        outgoingAPIMessageWebhook: null,
        stateWebhook: null,
      });
    });

    it('maps an unknown instance state to "unknown" instead of failing', async () => {
      mswServer.use(
        http.get(apiMethodUrl('getStateInstance'), () =>
          HttpResponse.json({ stateInstance: 'yellowCard' }),
        ),
      );

      await expect(client.getStateInstance()).resolves.toEqual({ stateInstance: 'unknown' });
    });

    it('maps the Telegram checkAccount rate-limit body to "contact-check-limit"', async () => {
      mswServer.use(
        http.post(apiMethodUrl('checkAccount'), () =>
          HttpResponse.json({
            status: false,
            data: { status: 'fail', reason: 'rate_limit_exceeded', retryAfter: 11930619 },
          }),
        ),
      );

      const error = await catchError(client.checkAccount({ phoneNumber: 79991234567 }));

      expect(error).toMatchObject({ kind: 'contact-check-limit' });
    });

    it('returns exist=false with an empty chatId when there is no account', async () => {
      mswServer.use(
        http.post(apiMethodUrl('checkAccount'), () =>
          HttpResponse.json({ exist: false, chatId: '' }),
        ),
      );

      await expect(client.checkAccount({ phoneNumber: 79991234567 })).resolves.toEqual({
        exist: false,
        chatId: '',
        username: null,
      });
    });
  });

  describe('receiving', () => {
    it('passes receiveTimeout and returns the notification', async () => {
      let timeout: string | null = null;
      mswServer.use(
        http.get(apiMethodUrl('receiveNotification'), ({ request }) => {
          timeout = new URL(request.url).searchParams.get('receiveTimeout');
          return HttpResponse.json({ receiptId: 1234567, body: { typeWebhook: 'x' } });
        }),
      );

      const result = await client.receiveNotification({ receiveTimeoutSeconds: 20 });

      expect(timeout).toBe('20');
      expect(result).toEqual({ receiptId: 1234567, body: { typeWebhook: 'x' } });
    });

    it('keeps a long poll open for receiveTimeout, beyond the regular request timeout', async () => {
      // Regular requests time out after 20 ms here; the long poll must not.
      const fastTimeoutClient = createGreenApiClient(TEST_CREDENTIALS, { timeoutMs: 20 });
      mswServer.use(
        http.get(apiMethodUrl('receiveNotification'), async () => {
          await new Promise((resolve) => setTimeout(resolve, 80));
          return HttpResponse.json(null);
        }),
      );

      await expect(
        fastTimeoutClient.receiveNotification({ receiveTimeoutSeconds: 5 }),
      ).resolves.toBeNull();
    });

    it.each([
      ['a JSON null', () => HttpResponse.json(null)],
      ['an empty body', () => new HttpResponse(null, { status: 200 })],
    ])('returns null when the queue is empty (%s)', async (_label, respond) => {
      mswServer.use(http.get(apiMethodUrl('receiveNotification'), respond));

      await expect(client.receiveNotification({ receiveTimeoutSeconds: 5 })).resolves.toBeNull();
    });

    it('deletes a notification with DELETE and receiptId in the path', async () => {
      mswServer.use(
        http.delete(apiMethodUrl('deleteNotification', '/1234567'), () =>
          HttpResponse.json({ result: true, reason: '' }),
        ),
      );

      await expect(client.deleteNotification(1234567)).resolves.toEqual({ result: true });
    });
  });

  describe('errors', () => {
    it.each([
      [401, 'Unauthorized', 'unauthorized'],
      [403, 'Forbidden', 'forbidden'],
      [404, 'Not Found', 'not-found'],
      [429, 'Too Many Requests', 'rate-limited'],
      [466, 'correspondentsStatus', 'quota-exceeded'],
      [469, 'User get contact info limit reached', 'contact-check-limit'],
      [502, 'Bad Gateway', 'server'],
      [
        400,
        'Message cannot be received because custom webhook url is set. Go to cabinet',
        'webhook-configured',
      ],
      [400, 'instance is starting or not authorized', 'instance-not-ready'],
      [400, 'instance in starting process try later', 'instance-not-ready'],
      [400, 'Instance account is expired. Renew your instance', 'instance-expired'],
      [400, 'Instance is deleted', 'instance-expired'],
      [400, 'Validation failed', 'bad-request'],
      [418, 'teapot', 'unknown'],
    ] as const)('maps HTTP %i "%s" to "%s"', async (status, message, kind) => {
      mswServer.use(
        http.get(apiMethodUrl('getStateInstance'), () =>
          HttpResponse.json({ message }, { status }),
        ),
      );

      const error = await catchError(client.getStateInstance());

      expect(error).toBeInstanceOf(GreenApiError);
      expect(error).toMatchObject({ kind, status });
    });

    it('reads plain-text error bodies too', async () => {
      mswServer.use(
        http.get(
          apiMethodUrl('receiveNotification'),
          () => new HttpResponse('custom webhook url is set', { status: 400 }),
        ),
      );

      const error = await catchError(client.receiveNotification({ receiveTimeoutSeconds: 5 }));

      expect(error).toMatchObject({ kind: 'webhook-configured' });
    });

    it('never leaks the token into the error, even when the server echoes the URL', async () => {
      mswServer.use(
        http.get(apiMethodUrl('getStateInstance'), ({ request }) =>
          HttpResponse.json({ message: `Unauthorized: ${request.url}` }, { status: 401 }),
        ),
      );

      const error = (await catchError(client.getStateInstance())) as GreenApiError;

      expect(error.detail).toContain('Unauthorized: https://');
      expect(error.message).not.toContain(TEST_CREDENTIALS.apiTokenInstance);
      expect(error.detail).not.toContain(TEST_CREDENTIALS.apiTokenInstance);
    });

    it('reports a network failure as "network"', async () => {
      mswServer.use(http.get(apiMethodUrl('getStateInstance'), () => HttpResponse.error()));

      await expect(client.getStateInstance()).rejects.toMatchObject({ kind: 'network' });
    });

    it('reports malformed JSON as "invalid-response"', async () => {
      mswServer.use(
        http.get(
          apiMethodUrl('getStateInstance'),
          () => new HttpResponse('{not json', { headers: { 'Content-Type': 'application/json' } }),
        ),
      );

      await expect(client.getStateInstance()).rejects.toMatchObject({ kind: 'invalid-response' });
    });

    it('reports a schema mismatch as "invalid-response"', async () => {
      mswServer.use(
        http.get(apiMethodUrl('getStateInstance'), () => HttpResponse.json({ state: 'ok' })),
      );

      await expect(client.getStateInstance()).rejects.toMatchObject({ kind: 'invalid-response' });
    });

    it('aborts with "timeout" when the server is too slow', async () => {
      const slowClient = createGreenApiClient(TEST_CREDENTIALS, { timeoutMs: 20 });
      mswServer.use(
        http.get(apiMethodUrl('getStateInstance'), async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
          return HttpResponse.json({ stateInstance: 'authorized' });
        }),
      );

      await expect(slowClient.getStateInstance()).rejects.toMatchObject({ kind: 'timeout' });
    });

    it('does not even start a request whose signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      const error = await catchError(client.getStateInstance(controller.signal));

      expect((error as Error).name).toBe('AbortError');
    });

    it('treats a checkAccount failure without a reason as a bad request', async () => {
      mswServer.use(
        http.post(apiMethodUrl('checkAccount'), () => HttpResponse.json({ status: false })),
      );

      const error = await catchError(client.checkAccount({ phoneNumber: 79991234567 }));

      expect(error).toMatchObject({ kind: 'bad-request', status: 200 });
    });

    it('rethrows a caller abort as AbortError, not as a GreenApiError', async () => {
      mswServer.use(
        http.get(apiMethodUrl('getStateInstance'), async () => {
          await new Promise((resolve) => setTimeout(resolve, 200));
          return HttpResponse.json({ stateInstance: 'authorized' });
        }),
      );
      const controller = new AbortController();

      const pending = client.getStateInstance(controller.signal);
      controller.abort();
      const error = await catchError(pending);

      expect(error).not.toBeInstanceOf(GreenApiError);
      expect((error as Error).name).toBe('AbortError');
    });
  });
});

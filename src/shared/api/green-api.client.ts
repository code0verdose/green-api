import { type z } from 'zod';

import { classifyHttpError, classifyReason } from './classify-green-api-error.util';
import { GreenApiError } from './green-api.errors';
import type { GreenApiClient, GreenApiCredentials } from './green-api.types';
import { readErrorDetail } from './read-error-detail.util';
import {
  checkAccountResponseSchema,
  deleteNotificationResponseSchema,
  instanceSettingsSchema,
  receiveNotificationResponseSchema,
  sendMessageResponseSchema,
  stateInstanceResponseSchema,
} from './schemas';

const DEFAULT_TIMEOUT_MS = 15_000;
/** Long polling holds the request open for receiveTimeout; give the network some slack on top. */
const LONG_POLL_GRACE_MS = 10_000;

export interface GreenApiClientOptions {
  /** Request timeout for regular methods. */
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

interface RequestOptions<TSchema extends z.ZodType> {
  method: 'GET' | 'POST' | 'DELETE';
  apiMethod: string;
  schema: TSchema;
  body?: unknown;
  pathSuffix?: string;
  query?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal | undefined;
}

const abortError = () => new DOMException('The operation was aborted.', 'AbortError');

export function createGreenApiClient(
  credentials: GreenApiCredentials,
  options: GreenApiClientOptions = {},
): GreenApiClient {
  const { apiTokenInstance } = credentials;
  const baseUrl = `${credentials.apiUrl.replace(/\/+$/, '')}/waInstance${encodeURIComponent(credentials.idInstance)}`;
  const tokenSegment = encodeURIComponent(apiTokenInstance);
  const defaultTimeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function send(url: string, init: RequestInit, timeoutMs: number, signal?: AbortSignal) {
    if (signal?.aborted) throw abortError();
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const forwardAbort = () => controller.abort();
    signal?.addEventListener('abort', forwardAbort, { once: true });

    try {
      // Resolve fetch at call time so test interceptors and polyfills are honoured.
      const fetchFn = options.fetchFn ?? globalThis.fetch;
      // no-store: the URL carries the token, and a cached response would keep it on disk.
      const response = await fetchFn(url, {
        ...init,
        cache: 'no-store',
        signal: controller.signal,
      });
      return { status: response.status, ok: response.ok, text: await response.text() };
    } catch {
      if (signal?.aborted) throw abortError();
      throw new GreenApiError(timedOut ? 'timeout' : 'network');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', forwardAbort);
    }
  }

  async function request<TSchema extends z.ZodType>({
    method,
    apiMethod,
    schema,
    body,
    pathSuffix = '',
    query,
    timeoutMs = defaultTimeoutMs,
    signal,
  }: RequestOptions<TSchema>): Promise<z.output<TSchema>> {
    const search = query ? `?${new URLSearchParams(query).toString()}` : '';
    // The token is part of the path by API design; this URL is never logged or put into errors.
    const url = `${baseUrl}/${apiMethod}/${tokenSegment}${pathSuffix}${search}`;
    const init: RequestInit =
      body === undefined
        ? { method }
        : {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          };

    const response = await send(url, init, timeoutMs, signal);

    if (!response.ok) {
      const detail = readErrorDetail(response.text, apiTokenInstance);
      throw new GreenApiError(classifyHttpError(response.status, detail), {
        status: response.status,
        detail,
      });
    }

    let json: unknown = null;
    if (response.text.trim()) {
      try {
        json = JSON.parse(response.text);
      } catch {
        throw new GreenApiError('invalid-response', { status: response.status });
      }
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new GreenApiError('invalid-response', {
        status: response.status,
        detail: `Unexpected ${apiMethod} response shape`,
      });
    }
    return parsed.data;
  }

  return {
    getStateInstance: (signal) =>
      request({
        method: 'GET',
        apiMethod: 'getStateInstance',
        schema: stateInstanceResponseSchema,
        signal,
      }),

    getSettings: (signal) =>
      request({ method: 'GET', apiMethod: 'getSettings', schema: instanceSettingsSchema, signal }),

    async checkAccount(target, signal) {
      const result = await request({
        method: 'POST',
        apiMethod: 'checkAccount',
        schema: checkAccountResponseSchema,
        body: target,
        signal,
      });
      if ('exist' in result) return result;
      const reason = result.reason ?? result.data?.reason ?? '';
      throw new GreenApiError(classifyReason(reason) ?? 'bad-request', {
        status: 200,
        detail: reason,
      });
    },

    sendMessage: (payload, signal) =>
      request({
        method: 'POST',
        apiMethod: 'sendMessage',
        schema: sendMessageResponseSchema,
        body: payload,
        signal,
      }),

    receiveNotification: ({ receiveTimeoutSeconds }, signal) =>
      request({
        method: 'GET',
        apiMethod: 'receiveNotification',
        schema: receiveNotificationResponseSchema,
        query: { receiveTimeout: String(receiveTimeoutSeconds) },
        timeoutMs: receiveTimeoutSeconds * 1000 + LONG_POLL_GRACE_MS,
        signal,
      }),

    deleteNotification: (receiptId, signal) =>
      request({
        method: 'DELETE',
        apiMethod: 'deleteNotification',
        schema: deleteNotificationResponseSchema,
        pathSuffix: `/${receiptId}`,
        signal,
      }),
  };
}

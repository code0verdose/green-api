import { notifications } from '@mantine/notifications';

import { SharedApi } from '@shared';

import { createQueryClient } from './query-client.config';

const runMutation = async (
  queryClient: ReturnType<typeof createQueryClient>,
  error: Error,
  options: { onError?: () => void; meta?: { handlesErrors?: boolean } } = {},
) => {
  const mutation = queryClient.getMutationCache().build(queryClient, {
    mutationFn: () => Promise.reject(error),
    ...options,
  });
  await mutation.execute(undefined).catch(() => undefined);
};

describe('createQueryClient', () => {
  it('shows one toast for an unhandled mutation error', async () => {
    const show = vi.spyOn(notifications, 'show').mockReturnValue('id');

    await runMutation(createQueryClient(), new SharedApi.GreenApiError('network'));

    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Нет связи с GREEN-API. Проверьте интернет и apiUrl.' }),
    );
  });

  it.each([
    ['a local onError', { onError: () => {} }],
    ['meta.handlesErrors', { meta: { handlesErrors: true } }],
  ])('stays quiet when the mutation has %s', async (_case, options) => {
    const show = vi.spyOn(notifications, 'show').mockReturnValue('id');

    await runMutation(createQueryClient(), new Error('boom'), options);

    expect(show).not.toHaveBeenCalled();
  });

  it('stays quiet for a cancelled request', async () => {
    const show = vi.spyOn(notifications, 'show').mockReturnValue('id');

    await runMutation(createQueryClient(), new DOMException('Aborted', 'AbortError'));

    expect(show).not.toHaveBeenCalled();
  });

  it('retries a transient query failure once, a permanent one never', () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry as (
      count: number,
      error: unknown,
    ) => boolean;

    expect(retry(0, new SharedApi.GreenApiError('network'))).toBe(true);
    expect(retry(1, new SharedApi.GreenApiError('network'))).toBe(false);
    expect(retry(0, new SharedApi.GreenApiError('unauthorized'))).toBe(false);
    expect(retry(0, new Error('other'))).toBe(true);
  });
});

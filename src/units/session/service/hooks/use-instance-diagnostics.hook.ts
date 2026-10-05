import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { SharedApi } from '@shared';

import { buildInstanceNotices } from '../../lib/build-instance-notices.util';
import { instanceSettingsQueryOptions, instanceStateQueryOptions } from '../queries/instance.query';
import { useInstanceNoticesStore } from '../stores/instance-notices.store';

/**
 * Best-effort health check of the instance. A failed check shows nothing: it must not
 * block the chat, and real API failures surface where they happen.
 */
export function useInstanceDiagnostics(client: SharedApi.GreenApiClient, idInstance: string) {
  const stateQuery = useQuery(instanceStateQueryOptions(client, idInstance));
  const settingsQuery = useQuery(instanceSettingsQueryOptions(client, idInstance));
  const quotaDescription = useInstanceNoticesStore((state) => state.quotaDescription);

  const notices = useMemo(
    () =>
      buildInstanceNotices({
        state: stateQuery.data,
        settings: settingsQuery.data,
        quotaDescription,
      }),
    [stateQuery.data, settingsQuery.data, quotaDescription],
  );

  return { notices };
}

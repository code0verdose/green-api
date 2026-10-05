import { queryOptions } from '@tanstack/react-query';

import { SharedLib, type SharedApi } from '@shared';

/** State changes also arrive as stateInstanceChanged notifications; polling is only a safety net. */
const STATE_REFRESH_MS = 60_000;
const SETTINGS_STALE_MS = 5 * 60_000;

export const instanceStateQueryOptions = (client: SharedApi.GreenApiClient, idInstance: string) =>
  queryOptions({
    queryKey: SharedLib.QueryKeys.Instance.state(idInstance),
    queryFn: ({ signal }) => client.getStateInstance(signal),
    select: (data) => data.stateInstance,
    refetchInterval: STATE_REFRESH_MS,
  });

export const instanceSettingsQueryOptions = (
  client: SharedApi.GreenApiClient,
  idInstance: string,
) =>
  queryOptions({
    queryKey: SharedLib.QueryKeys.Instance.settings(idInstance),
    queryFn: ({ signal }) => client.getSettings(signal),
    staleTime: SETTINGS_STALE_MS,
  });

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { SharedLib, type SharedApi } from '@shared';

import { useInstanceNoticesStore } from '../stores/instance-notices.store';

/** Applies instance-level notifications (state change, tariff quota) to the session's view. */
export function useInstanceEvents(idInstance: string) {
  const queryClient = useQueryClient();
  const reportQuotaExceeded = useInstanceNoticesStore((state) => state.reportQuotaExceeded);

  const updateState = useCallback(
    (stateInstance: SharedApi.InstanceState) =>
      queryClient.setQueryData(SharedLib.QueryKeys.Instance.state(idInstance), { stateInstance }),
    [queryClient, idInstance],
  );

  return { updateState, reportQuotaExceeded };
}

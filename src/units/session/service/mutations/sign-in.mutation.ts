import { useMutation, useQueryClient } from '@tanstack/react-query';

import { SharedApi, SharedLib } from '@shared';

import { INSTANCE_STATE_VERDICTS } from '../../model/constants/instance-state.constant';
import type { Session } from '../../model/validation/credentials.schema';
import { useSessionStore } from '../stores/session.store';

/**
 * Checks the credentials with GetStateInstance before storing them: a wrong token or an
 * unauthorized instance is reported on the login form, not discovered later in the chat.
 */
export function useSignInMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: { handlesErrors: true },
    mutationFn: async (session: Session) => {
      const client = SharedApi.createGreenApiClient(session);
      const { stateInstance } = await client.getStateInstance();
      const verdict = INSTANCE_STATE_VERDICTS[stateInstance];
      if (!verdict.canEnter) throw new Error(verdict.message);
      return { session, stateInstance };
    },
    onSuccess: ({ session, stateInstance }) => {
      queryClient.setQueryData(SharedLib.QueryKeys.Instance.state(session.idInstance), {
        stateInstance,
      });
      useSessionStore.getState().signIn(session);
    },
  });
}

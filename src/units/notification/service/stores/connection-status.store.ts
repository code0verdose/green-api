import { create } from 'zustand';

import type { PollerStatus } from '../../lib/notification-poller.util';

/** `idle` — not started; `standby` — another tab drains the queue for this instance. */
export type ConnectionStatus = PollerStatus | 'idle' | 'standby';

interface ConnectionStatusState {
  status: ConnectionStatus;
  /** Bumping it restarts the poller after a fatal stop. */
  restartToken: number;
  setStatus: (status: ConnectionStatus) => void;
  restart: () => void;
}

export const useConnectionStatusStore = create<ConnectionStatusState>()((set) => ({
  status: 'idle',
  restartToken: 0,
  setStatus: (status) => set({ status }),
  restart: () => set((state) => ({ restartToken: state.restartToken + 1, status: 'connecting' })),
}));

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SharedConfig } from '@shared';

interface MessengerPreferenceState {
  messenger: SharedConfig.Messenger;
  setMessenger: (messenger: SharedConfig.Messenger) => void;
}

const isMessenger = (value: unknown): value is SharedConfig.Messenger =>
  (SharedConfig.MESSENGER_IDS as readonly unknown[]).includes(value);

/** The messenger picked on the login screen; remembered so the theme is right on the next visit. */
export const useMessengerPreferenceStore = create<MessengerPreferenceState>()(
  persist(
    (set) => ({
      messenger: SharedConfig.DEFAULT_MESSENGER,
      setMessenger: (messenger) => set({ messenger }),
    }),
    {
      name: 'green-api-chat:messenger',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ messenger }) => ({ messenger }),
      merge: (persisted, current) => {
        const messenger = (persisted as { messenger?: unknown } | undefined)?.messenger;
        return isMessenger(messenger) ? { ...current, messenger } : current;
      },
    },
  ),
);

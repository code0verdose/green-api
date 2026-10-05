import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { type Session, sessionSchema } from '../../model/validation/credentials.schema';

interface SessionState {
  session: Session | null;
  signIn: (session: Session) => void;
  signOut: () => void;
}

export const SESSION_STORAGE_KEY = 'green-api-chat:session';

/**
 * Credentials of this tab. sessionStorage survives a reload and is not shared with other tabs;
 * after the tab closes the browser keeps it on disk until it clears the session, which is why
 * "Выйти" removes it at once (ADR-0004, «Выход»).
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      session: null,
      signIn: (session) => set({ session }),
      signOut: () => set({ session: null }),
    }),
    {
      name: SESSION_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ session }) => ({ session }),
      merge: (persisted, current) => {
        const parsed = sessionSchema.safeParse(
          (persisted as { session?: unknown } | undefined)?.session,
        );
        return { ...current, session: parsed.success ? parsed.data : null };
      },
    },
  ),
);

/** For router guards, which run outside React. */
export const getSession = () => useSessionStore.getState().session;

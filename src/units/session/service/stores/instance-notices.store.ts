import { create } from 'zustand';

interface InstanceNoticesState {
  /** Description from the last quotaExceeded notification; cleared on sign-out. */
  quotaDescription: string | null;
  reportQuotaExceeded: (description: string) => void;
  clear: () => void;
}

export const useInstanceNoticesStore = create<InstanceNoticesState>()((set) => ({
  quotaDescription: null,
  reportQuotaExceeded: (quotaDescription) => set({ quotaDescription }),
  clear: () => set({ quotaDescription: null }),
}));

import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { SharedUi } from '@shared';

import {
  addPendingMessage,
  applyStatus,
  EMPTY_CHATS,
  markChatRead,
  markMessageFailed,
  markMessageSent,
  openChat,
  receiveMessage,
  retryMessage,
} from '../../lib/chat-reducers.util';
import { failInterruptedSends } from '../../lib/chat-view.util';
import { addsToStored, mergeChatsData } from '../../lib/merge-chats-data.util';
import { parseStoredHistory } from '../../lib/parse-stored-history.util';
import { trimStoredHistory } from '../../lib/trim-stored-history.util';
import {
  CHAT_STORAGE_KEY,
  CHAT_STORAGE_VERSION,
  QUOTA_TRIM_MESSAGES_PER_CHAT,
  STORAGE_PROBLEM_TEXT,
  type StorageProblem,
} from '../../model/constants/chat-store.constant';
import type {
  ChatsData,
  OpenChatInput,
  PendingMessageInput,
  ReceivedMessageInput,
  StatusUpdateInput,
} from '../../types/chat.types';

interface ChatActions {
  openChat: (input: OpenChatInput) => void;
  receiveMessage: (input: ReceivedMessageInput) => void;
  addPendingMessage: (input: PendingMessageInput) => void;
  markMessageSent: (input: { chatId: string; localId: string; idMessage: string }) => void;
  markMessageFailed: (input: { chatId: string; localId: string; error: string }) => void;
  retryMessage: (input: { chatId: string; localId: string }) => void;
  applyStatus: (input: StatusUpdateInput) => void;
  markChatRead: (chatId: string) => void;
}

export type ChatStore = ChatsData & ChatActions;

/**
 * Whose history this tab shows (`messenger:idInstance`). It lives in memory, not in the store:
 * two tabs may be signed in to different instances, and each has its own storage key.
 */
let activeOwner: string | null = null;
let isFirstLoad = true;
const reportedStorageProblems = new Set<StorageProblem>();
/** Once the full history did not fit, every write is trimmed first: no doomed full attempts. */
let trimBeforeWrite = false;
/** Set by a cross-tab merge that holds anything the stored history lacks (`addsToStored`). */
let writeBackPending = false;
/**
 * One write-back per own change: answering another tab is allowed again only after this tab
 * changed something itself. Whatever the merge rules, an exchange of writes cannot loop.
 */
let canWriteBack = true;

export const chatStorageKey = (owner: string) => `${CHAT_STORAGE_KEY}:${owner}`;

const isQuotaError = (error: unknown) =>
  error instanceof DOMException &&
  (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');

function reportStorageProblem(problem: StorageProblem, error: unknown) {
  if (reportedStorageProblems.has(problem)) return;
  reportedStorageProblems.add(problem);
  console.warn('Chat history could not be saved in full', error);
  SharedUi.notify.error(STORAGE_PROBLEM_TEXT[problem], {
    id: `storage-${problem}`,
    title: 'История не помещается',
  });
}

const trimmed = (value: string) => trimStoredHistory(value, QUOTA_TRIM_MESSAGES_PER_CHAT);

/** Keeps the app working when localStorage is full or blocked: memory wins over a crash. */
function writeHistory(key: string, value: string) {
  try {
    localStorage.setItem(key, trimBeforeWrite ? trimmed(value) : value);
  } catch (error) {
    if (!isQuotaError(error)) reportStorageProblem('blocked', error);
    else if (trimBeforeWrite) reportStorageProblem('full', error);
    else writeTrimmedHistory(key, value, error);
  }
}

/** First overflow: keep the latest messages of every chat, and trim every later write too. */
function writeTrimmedHistory(key: string, value: string, quotaError: unknown) {
  trimBeforeWrite = true;
  try {
    localStorage.setItem(key, trimmed(value));
    reportStorageProblem('trimmed', quotaError);
  } catch (error) {
    reportStorageProblem(isQuotaError(error) ? 'full' : 'blocked', error);
  }
}

const activeOwnerStorage: StateStorage = {
  getItem: () => (activeOwner ? localStorage.getItem(chatStorageKey(activeOwner)) : null),
  setItem: (_name, value) => {
    if (activeOwner) writeHistory(chatStorageKey(activeOwner), value);
  },
  removeItem: () => {
    if (!activeOwner) return;
    try {
      localStorage.removeItem(chatStorageKey(activeOwner));
    } catch (error) {
      // Blocked storage holds nothing of ours to delete; sign-out must go on regardless.
      console.warn('Chat history could not be removed', error);
    }
  },
};

/**
 * Chat history of the signed-in instance, kept in localStorage so a reload keeps the
 * conversation (notifications are deleted from the GREEN-API queue once received).
 */
export const useChatStore = create<ChatStore>()(
  persist(
    (set) => {
      /** An own change of this tab: applies the reducer and re-arms the write-back. */
      const change =
        <Input>(reduce: (data: ChatsData, input: Input) => ChatsData) =>
        (input: Input) => {
          canWriteBack = true;
          set((state) => reduce(state, input));
        };
      return {
        ...EMPTY_CHATS,
        openChat: change(openChat),
        receiveMessage: change(receiveMessage),
        addPendingMessage: change(addPendingMessage),
        markMessageSent: change(markMessageSent),
        markMessageFailed: change(markMessageFailed),
        retryMessage: change(retryMessage),
        applyStatus: change(applyStatus),
        markChatRead: change(markChatRead),
      };
    },
    {
      name: CHAT_STORAGE_KEY,
      version: CHAT_STORAGE_VERSION,
      storage: createJSONStorage(() => activeOwnerStorage),
      skipHydration: true,
      partialize: ({ chats, messages }) => ({ chats, messages }),
      merge: (persisted, current) => {
        const loaded: ChatsData = {
          owner: activeOwner,
          ...(parseStoredHistory(persisted) ?? { chats: {}, messages: {} }),
        };
        if (isFirstLoad) {
          isFirstLoad = false;
          // Pending sends found on the first load lost their request with the closed page.
          return { ...current, ...failInterruptedSends(loaded) };
        }
        // Later loads come from live tabs of the same instance: unite, never replace.
        const merged = mergeChatsData(current, loaded);
        // What this tab knew and the other did not goes to disk, at most once per own change.
        writeBackPending = canWriteBack && addsToStored(merged, loaded);
        return { ...current, ...merged, owner: activeOwner };
      },
    },
  ),
);

/** Shows the history of `owner`, loading it from its own storage key. Idempotent. */
export function activateChatOwner(owner: string) {
  if (activeOwner === owner) return;
  activeOwner = owner;
  isFirstLoad = true;
  trimBeforeWrite = false;
  writeBackPending = false;
  canWriteBack = true;
  reportedStorageProblems.clear();
  // localStorage is synchronous, so the history is in the store when this returns.
  void useChatStore.persist.rehydrate();
}

/** Hides the history without deleting it: the next sign-in to the same instance restores it. */
export function detachChatHistory() {
  activeOwner = null;
  useChatStore.setState(EMPTY_CHATS);
}

/** Deletes this instance's history from the device (explicit sign-out). */
export function forgetChatHistory() {
  useChatStore.persist.clearStorage();
  detachChatHistory();
}

/**
 * Keeps tabs of the same instance in sync. Every tab writes its own changes; on another tab's
 * write it unites both histories and writes back only what the stored one lacked, at most once
 * per own change (`canWriteBack`), so two tabs settle instead of answering each other forever.
 */
export function syncChatStoreAcrossTabs(): () => void {
  const onStorage = (event: StorageEvent) => {
    if (!activeOwner || event.key !== chatStorageKey(activeOwner)) return;
    // A removed history is another tab's sign-out; its signal signs this tab out too.
    if (event.newValue === null) return;
    void Promise.resolve(useChatStore.persist.rehydrate()).then(() => {
      if (!writeBackPending) return;
      writeBackPending = false;
      canWriteBack = false;
      // An empty update is not an own change: persist writes the united history, nothing more.
      useChatStore.setState({});
    });
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

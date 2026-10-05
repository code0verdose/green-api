import { useChatStore } from '../stores/chat.store';

/** Store commands the notification bridge needs without subscribing to the history. */
export function useChatActions() {
  return {
    receiveMessage: useChatStore((state) => state.receiveMessage),
    applyStatus: useChatStore((state) => state.applyStatus),
  };
}

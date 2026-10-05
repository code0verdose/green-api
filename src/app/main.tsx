import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './styles/global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ChatService } from '@units/chat';
import { SessionService } from '@units/session';

import { AppProviders } from './providers';
import { reloadOnStaleChunk } from './reload-on-stale-chunk';

// Theme tokens follow the active messenger; portals (modals, toasts) live outside #root,
// so the attribute goes on <html>.
SessionService.subscribeToActiveMessenger((messenger) => {
  document.documentElement.dataset.messenger = messenger;
});
ChatService.syncChatStoreAcrossTabs();
reloadOnStaleChunk();

const container = document.getElementById('root');
if (!container) throw new Error('#root element is missing in index.html');

createRoot(container).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
);

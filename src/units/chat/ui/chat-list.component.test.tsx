import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders, renderWithRouter } from '@shared/test/render';

import { useChatStore } from '../service/stores/chat.store';
import { detachChatHistory } from '../service/stores/chat.store';
import { ChatHeader } from './chat-header.component';
import { ChatList } from './chat-list.component';

const store = () => useChatStore.getState();
const NOW = Date.now();

describe('ChatList', () => {
  beforeEach(() => detachChatHistory());

  it('offers to start a chat when there are none', async () => {
    const onCreateChat = vi.fn();
    renderWithProviders(<ChatList activeChatId={undefined} onCreateChat={onCreateChat} />);

    await userEvent.click(screen.getByRole('button', { name: 'Новый чат' }));

    expect(onCreateChat).toHaveBeenCalled();
  });

  it('lists chats newest first with unread counters and the active chat marked', async () => {
    store().openChat({
      chatId: 'old',
      title: 'Старый',
      phone: null,
      username: null,
      now: NOW - 5000,
    });
    store().openChat({
      chatId: 'new',
      title: 'Новый',
      phone: '79991234567',
      username: null,
      now: NOW,
    });
    store().receiveMessage({
      direction: 'incoming',
      chatId: 'old',
      chatName: null,
      phone: null,
      idMessage: 'm1',
      timestamp: NOW + 1000,
      kind: 'text',
      text: 'Свежее сообщение',
      localId: 'l1',
      isActive: false,
      viaApi: false,
    });

    renderWithRouter(<ChatList activeChatId="new" onCreateChat={() => {}} />);

    const links = await screen.findAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      expect.stringContaining('Старый'),
      expect.stringContaining('Новый'),
    ]);
    expect(links[0]).toHaveAttribute('href', '/chats/old');
    expect(screen.getByLabelText('Непрочитанных: 1')).toBeInTheDocument();
    expect(links[1]).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('+7 999 123-45-67')).toBeInTheDocument();
  });
});

describe('ChatHeader', () => {
  beforeEach(() => detachChatHistory());

  it('shows the name, the contact line and a way back to the list', async () => {
    store().openChat({
      chatId: 'c',
      title: 'Василиса',
      phone: '79991234567',
      username: null,
      now: NOW,
    });

    renderWithRouter(<ChatHeader chatId="c" />);

    expect(await screen.findByRole('heading', { name: 'Василиса' })).toBeInTheDocument();
    expect(screen.getByText('+7 999 123-45-67')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К списку чатов' })).toHaveAttribute('href', '/');
  });

  it('renders nothing for an unknown chat', () => {
    renderWithProviders(<ChatHeader chatId="nope" />);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });
});

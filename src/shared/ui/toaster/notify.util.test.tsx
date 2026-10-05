import { MantineProvider } from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import { act, render, screen } from '@testing-library/react';

import { notify } from './notify.util';

const renderToaster = () =>
  render(
    <MantineProvider env="test">
      <Notifications />
    </MantineProvider>,
  );

describe('notify', () => {
  afterEach(() => {
    act(() => {
      notifications.clean();
    });
  });

  it.each([
    ['success', 'Готово'],
    ['error', 'Ошибка'],
  ] as const)('shows a %s toast with a default title', async (kind, title) => {
    renderToaster();

    act(() => {
      notify[kind]('Сообщение');
    });

    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByText('Сообщение')).toBeInTheDocument();
  });

  it('shows an info toast without a title', async () => {
    renderToaster();

    act(() => {
      notify.info('Подсказка');
    });

    expect(await screen.findByText('Подсказка')).toBeInTheDocument();
  });

  it('does not stack two toasts with the same id', async () => {
    renderToaster();

    act(() => {
      notify.error('Сеть недоступна', { id: 'network' });
      notify.error('Сеть недоступна', { id: 'network' });
    });

    expect(await screen.findAllByText('Сеть недоступна')).toHaveLength(1);
  });
});

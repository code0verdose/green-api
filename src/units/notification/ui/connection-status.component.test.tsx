import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useConnectionStatusStore } from '../service/stores/connection-status.store';
import { ConnectionStatus } from './connection-status.component';

const renderStatus = () =>
  render(
    <MantineProvider env="test">
      <ConnectionStatus />
    </MantineProvider>,
  );

describe('ConnectionStatus', () => {
  beforeEach(() => useConnectionStatusStore.setState({ status: 'idle', restartToken: 0 }));

  it.each([
    ['online', 'В сети'],
    ['reconnecting', 'Нет связи, переподключаемся…'],
    ['standby', 'Сообщения принимает другая вкладка'],
  ] as const)('shows "%s" as «%s» without a retry button', (status, label) => {
    useConnectionStatusStore.setState({ status });

    renderStatus();

    expect(screen.getByRole('status')).toHaveTextContent(label);
    expect(screen.queryByRole('button', { name: 'Повторить' })).not.toBeInTheDocument();
  });

  it('offers a restart once polling has stopped', async () => {
    useConnectionStatusStore.setState({ status: 'stopped' });
    renderStatus();

    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(useConnectionStatusStore.getState()).toMatchObject({
      status: 'connecting',
      restartToken: 1,
    });
  });
});

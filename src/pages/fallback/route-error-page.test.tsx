import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@shared/test/render';

import { RouteErrorPage } from './route-error-page';

describe('RouteErrorPage', () => {
  it('offers a retry for an ordinary failure', async () => {
    const reset = vi.fn();
    renderWithProviders(<RouteErrorPage error={new Error('Номер не найден')} reset={reset} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Номер не найден');
    await userEvent.click(screen.getByRole('button', { name: 'Попробовать снова' }));
    expect(reset).toHaveBeenCalled();
  });

  it('asks to reload the page when the build changed under an open tab', () => {
    renderWithProviders(
      <RouteErrorPage
        error={new TypeError('Failed to fetch dynamically imported module: /assets/chats-1.js')}
        reset={() => {}}
      />,
    );

    expect(screen.getByText('Вышла новая версия')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Обновить страницу' })).toBeInTheDocument();
  });
});
